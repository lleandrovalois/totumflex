/**
 * Totum Flex - Aplicação Principal & Modo Administrador
 * Gerencia renderização, persistência LocalStorage, edição inline (WYSIWYG),
 * painel CMS, exportação/importação JSON e temas.
 */

(function () {
  'use strict';

  // Chave de armazenamento no LocalStorage
  const STORAGE_KEY = 'totumflex_site_data';
  const THEME_KEY = 'totumflex_theme';
  const COLOR_KEY = 'totumflex_color_scheme';
  const AUTH_KEY = 'totumflex_admin_authenticated';

  // Estado da Aplicação
  let siteData = {};
  let isAdminMode = false;
  let isAdminAuthenticated = false;
  let currentCategory = 'all';

  const SYSTEM_IMAGE_PRESETS = [
    { id: 'propostas', label: 'Propostas & Encargos', url: 'assets/images/sys-propostas.svg' },
    { id: 'custeio', label: 'Custeio & Operações', url: 'assets/images/sys-custeio.svg' },
    { id: 'folha', label: 'Folha & Holerites DP', url: 'assets/images/sys-folha.svg' },
    { id: 'esocial', label: 'eSocial & Conformidade', url: 'assets/images/sys-esocial.svg' },
    { id: 'escalas', label: 'Escalas 12x36 & Postos', url: 'assets/images/sys-escalas.svg' },
    { id: 'residuos', label: 'Resíduos & MTR', url: 'assets/images/sys-residuos.svg' },
    { id: 'faturamento', label: 'Faturamento & NFS-e', url: 'assets/images/sys-faturamento.svg' },
    { id: 'financeiro', label: 'Financeiro & DRE Caixa', url: 'assets/images/sys-financeiro.svg' },
    { id: 'analytics', label: 'Dashboard Analytics', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80' },
    { id: 'corp-planning', label: 'Gestão Corporativa', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80' },
    { id: 'logistics', label: 'Operações & Logística', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80' },
    { id: 'charts', label: 'Contabilidade & Gráficos', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80' }
  ];

  function getSystemImage(item) {
    if (item && item.image && item.image.trim()) {
      return item.image;
    }
    const map = {
      'sys-propostas': 'assets/images/sys-propostas.svg',
      'sys-custeio': 'assets/images/sys-custeio.svg',
      'sys-folha': 'assets/images/sys-folha.svg',
      'sys-esocial': 'assets/images/sys-esocial.svg',
      'sys-escalas': 'assets/images/sys-escalas.svg',
      'sys-residuos': 'assets/images/sys-residuos.svg',
      'sys-faturamento': 'assets/images/sys-faturamento.svg',
      'sys-financeiro': 'assets/images/sys-financeiro.svg'
    };
    return (item && map[item.id]) || 'assets/images/sys-propostas.svg';
  }

  let currentEditingSystemId = null;


  // ==========================================================================
  // INICIALIZAÇÃO E CARREGAMENTO DE DADOS
  // ==========================================================================

  function loadInitialData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Se houver dados corrompidos por encoding antigo (ex: Ãƒ), descarta e usa os dados limpos
      if (stored && !stored.includes('Ãƒ') && !stored.includes('Ã‚') && !stored.includes('Ã°')) {
        siteData = JSON.parse(stored);
      } else {
        if (stored) {
          localStorage.removeItem(STORAGE_KEY);
        }
        siteData = JSON.parse(JSON.stringify(DEFAULT_SITE_DATA));
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do LocalStorage, usando padrão:', e);
      siteData = JSON.parse(JSON.stringify(DEFAULT_SITE_DATA));
    }

    // Carregar tema
    const savedTheme = localStorage.getItem(THEME_KEY) || siteData.theme || 'dark';
    applyTheme(savedTheme);

    // Carregar paleta de cores
    let savedColor = null;
    try {
      const storedColor = localStorage.getItem(COLOR_KEY);
      if (storedColor) savedColor = JSON.parse(storedColor);
    } catch (e) {}

    const activeColor = savedColor || (siteData.colorScheme) || { primary: '#00f0ff', secondary: '#0077b6', preset: 'cyan' };
    applyColorScheme(activeColor.primary, activeColor.secondary, activeColor.preset, false);

    // Verificar se já havia sessão autenticada do administrador
    // ========================================================================
    // REGRA DE NEGÓCIO: O site SEMPRE abre em modo visitante comum.
    // O modo administrador SÓ é ativado se o usuário clicar no cadeado e logar.
    // ========================================================================
    sessionStorage.removeItem(AUTH_KEY);
    setAdminAuthenticated(false, false);
  }

  // ==========================================================================
  // PERSISTÊNCIA MULTI-DISPOSITIVO & SINCRONIZAÇÃO EM TEMPO REAL
  // (Padrão Dash Solutions: /api/save-content e content.json)
  // ==========================================================================

  let isSyncingFromServer = false;

  // ==========================================================================
  // OTIMIZAÇÃO E COMPRESSÃO DE IMAGENS CLIENT-SIDE (CANVAS)
  // Garante carregamento instantâneo e evita estouro de cota do LocalStorage (5MB)
  // ==========================================================================
  function compressImageFile(file, maxWidth = 1200, maxHeight = 675, quality = 0.85) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Nenhum arquivo fornecido'));

      // Vetores SVG mantêm-se nativos
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;

          // Se a imagem já for leve e proporcional, mantém original
          if (w <= maxWidth && h <= maxHeight && file.size < 250000) {
            resolve(e.target.result);
            return;
          }

          // Redimensionar mantendo proporção de aspecto
          const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
          const targetW = Math.max(1, Math.round(w * ratio));
          const targetH = Math.max(1, Math.round(h * ratio));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);

          let mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          let dataUrl = canvas.toDataURL(mime, quality);

          // Se for PNG e tiver ficado maior que 400KB, converte para JPEG otimizado
          if (mime === 'image/png' && dataUrl.length > 400000) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          }

          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  window.compressImageFile = compressImageFile;

  async function saveContentToServer(data) {
    try {
      const payload = {
        ...data,
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      const res = await fetch('/api/save-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        console.log('[CMS] Conteúdo salvo com sucesso no servidor (content.json)');
        return true;
      } else {
        console.warn('[CMS] Servidor retornou código não-200:', res.status);
        return false;
      }
    } catch (err) {
      console.warn('[CMS] Erro ao sincronizar conteúdo com o servidor:', err.message);
      return false;
    }
  }

  let lastKnownServerMtime = 0;

  async function syncContentFromServer() {
    try {
      const res = await fetch('/content.json?v=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const serverContent = await res.json();
        if (serverContent && typeof serverContent === 'object' && Object.keys(serverContent).length > 0) {
          isSyncingFromServer = true;
          siteData = {
            ...DEFAULT_SITE_DATA,
            ...serverContent
          };

          // Garante que o objeto brand exista e esteja sincronizado
          if (!siteData.brand) {
            siteData.brand = {
              logoType: (siteData.navbar && siteData.navbar.logoImage) ? 'image' : 'monogram',
              monogramText: 'TF',
              logoImageUrl: (siteData.navbar && siteData.navbar.logoImage) || '',
              logoImageHeight: (siteData.navbar && siteData.navbar.logoHeight) || 40,
              showName: (siteData.navbar && siteData.navbar.logoMode === 'full') ? false : true,
              nameFirst: (siteData.navbar && siteData.navbar.brandName) || 'TOTUM',
              nameSecond: (siteData.navbar && siteData.navbar.brandHighlight) || 'FLEX',
              showTagline: true,
              tagline: (siteData.navbar && siteData.navbar.brandSubtitle) || 'Flex Informática',
              footerDesc: (siteData.footer && siteData.footer.text) || ''
            };
          }

          // Sincronizar Tema e Cores globais do servidor
          if (serverContent.theme) {
            applyTheme(serverContent.theme);
          }
          if (serverContent.colorScheme && serverContent.colorScheme.primary) {
            applyColorScheme(
              serverContent.colorScheme.primary,
              serverContent.colorScheme.secondary,
              serverContent.colorScheme.preset || 'custom',
              false
            );
          }
          
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(siteData));
          } catch (storageErr) {
            console.warn('[CMS] LocalStorage não pôde salvar todo o cache devido ao limite de 5MB, mas os dados estão carregados do servidor.', storageErr);
          }
          isSyncingFromServer = false;

          renderAll();
          renderBrandLogo();
          console.log('[CMS] Conteúdo geral sincronizado com sucesso do servidor (content.json) para este dispositivo.');
        }
      }
    } catch (err) {
      console.log('[CMS] Sem conexão com content.json no servidor, operando com cache local:', err.message);
    }
  }

  // Checagem ultraleve em segundo plano para refletir alterações feitas em outros dispositivos
  async function checkServerForUpdates() {
    if (isAdminMode) return;
    const isAnyModalOpen = !!document.querySelector('.modal-backdrop.open, .modal-backdrop.active');
    if (isAnyModalOpen) return;

    try {
      const res = await fetch('/api/content-version?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const info = await res.json();
        if (info && info.mtime) {
          if (lastKnownServerMtime === 0) {
            lastKnownServerMtime = info.mtime;
            return;
          }
          if (info.mtime !== lastKnownServerMtime) {
            console.log('[CMS] Modificação detectada no servidor! Sincronizando conteúdo entre dispositivos...');
            lastKnownServerMtime = info.mtime;
            await syncContentFromServer();
          }
        }
      } else {
        // Fallback caso /api/content-version não esteja respondendo
        await syncContentFromServer();
      }
    } catch (e) {
      // Offline ou desconectado temporariamente
    }
  }

  async function saveToStorage(notify = true) {
    siteData.updatedAt = new Date().toISOString();

    // 1. Persistência Principal e Obrigatória no Servidor (content.json no disco)
    let serverOk = false;
    try {
      serverOk = await saveContentToServer(siteData);
    } catch (err) {
      console.warn('[CMS] Erro na requisição para salvar no servidor:', err);
    }

    // 2. Persistência de Cache Local (LocalStorage) com tratamento seguro de Quota
    let localOk = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(siteData));
      localOk = true;
    } catch (e) {
      console.warn('[CMS] LocalStorage atingiu o limite de cota de 5MB do navegador. O conteúdo foi persistido no servidor (content.json).', e);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(siteData));
        localOk = true;
      } catch (innerErr) {
        // Ignora erro de cache local secundário pois o servidor já gravou no disco
      }
    }

    if (notify) {
      if (serverOk || localOk) {
        showToast('Alterações salvas e sincronizadas com sucesso!', 'success');
      } else {
        showToast('Erro ao salvar alterações no servidor.', 'warning');
      }
    }

    return serverOk || localOk;
  }

  function resetToDefault() {
    if (confirm('Tem certeza que deseja restaurar todos os textos e sistemas para os valores padrão originais? Todas as edições atuais serão substituídas.')) {
      siteData = JSON.parse(JSON.stringify(DEFAULT_SITE_DATA));
      saveToStorage(false);
      renderAll();
      showToast('Dados restaurados para o padrão original da TotumFlex!', 'info');
    }
  }

  // ==========================================================================
  // GERENCIAMENTO DE TEMA (CLARO / ESCURO)
  // ==========================================================================

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    siteData.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (isAdminAuthenticated) {
      saveToStorage(false);
    }
    showToast(`Tema alterado para modo ${next === 'dark' ? 'escuro' : 'claro'}.`, 'info');
  }

  // ==========================================================================
  // GERENCIAMENTO DE CORES DO SITE (PALETA DINÂMICA)
  // ==========================================================================

  const COLOR_PRESETS = [
    { id: 'cyan', name: 'Ciano Tech', primary: '#00f0ff', secondary: '#0077b6' },
    { id: 'blue', name: 'Azul Corporativo', primary: '#3b82f6', secondary: '#1d4ed8' },
    { id: 'emerald', name: 'Esmeralda', primary: '#10b981', secondary: '#047857' },
    { id: 'purple', name: 'Roxo Inovação', primary: '#a855f7', secondary: '#7c3aed' },
    { id: 'amber', name: 'Âmbar Executivo', primary: '#f59e0b', secondary: '#b45309' },
    { id: 'rose', name: 'Carmim Rubi', primary: '#f43f5e', secondary: '#be123c' },
    { id: 'teal', name: 'Aqua Saneamento', primary: '#14b8a6', secondary: '#0f766e' },
    { id: 'indigo', name: 'Índigo Profundo', primary: '#6366f1', secondary: '#4338ca' }
  ];

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function adjustBrightness(hex, percent) {
    const rgb = hexToRgb(hex);
    const r = Math.min(255, Math.max(0, Math.round(rgb.r * (1 + percent / 100))));
    const g = Math.min(255, Math.max(0, Math.round(rgb.g * (1 + percent / 100))));
    const b = Math.min(255, Math.max(0, Math.round(rgb.b * (1 + percent / 100))));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function applyColorScheme(primaryHex, secondaryHex, presetId = 'custom', notify = false) {
    if (!primaryHex) return;
    if (!secondaryHex) {
      secondaryHex = adjustBrightness(primaryHex, -25);
    }

    const rgb = hexToRgb(primaryHex);
    const root = document.documentElement;

    root.style.setProperty('--accent-cyan', primaryHex);
    root.style.setProperty('--accent-primary', primaryHex);
    root.style.setProperty('--accent-blue', secondaryHex);
    root.style.setProperty('--gradient-brand', `linear-gradient(135deg, ${primaryHex} 0%, ${secondaryHex} 50%, #005d92 100%)`);
    root.style.setProperty('--gradient-glow', `radial-gradient(circle at 50% 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18), transparent 70%)`);
    root.style.setProperty('--shadow-glow', `0 0 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
    root.style.setProperty('--border-active', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`);

    siteData.colorScheme = {
      primary: primaryHex,
      secondary: secondaryHex,
      preset: presetId
    };

    localStorage.setItem(COLOR_KEY, JSON.stringify(siteData.colorScheme));

    // Atualiza rótulo no popover
    const activeLabel = document.getElementById('active-palette-name');
    if (activeLabel) {
      const matched = COLOR_PRESETS.find(p => p.id === presetId || p.primary.toLowerCase() === primaryHex.toLowerCase());
      activeLabel.textContent = matched ? matched.name : 'Personalizada';
      activeLabel.style.color = primaryHex;
    }

    const colorInput = document.getElementById('custom-color-input');
    if (colorInput) colorInput.value = primaryHex;

    const hexInput = document.getElementById('custom-hex-input');
    if (hexInput) hexInput.value = primaryHex;

    // Atualiza classe active nos swatches
    document.querySelectorAll('.color-swatch-item').forEach(sw => {
      const matches = sw.getAttribute('data-preset') === presetId || 
                      (sw.getAttribute('data-color') && sw.getAttribute('data-color').toLowerCase() === primaryHex.toLowerCase());
      sw.classList.toggle('active', !!matches);
    });

    if (notify) {
      const matched = COLOR_PRESETS.find(p => p.id === presetId || p.primary.toLowerCase() === primaryHex.toLowerCase());
      showToast(`Cor do site atualizada para: ${matched ? matched.name : primaryHex}`, 'success');
    }
  }

  function renderColorSwatches() {
    const grid = document.getElementById('color-swatches-grid');
    if (!grid) return;

    const currentPrimary = (siteData.colorScheme && siteData.colorScheme.primary) || '#00f0ff';

    grid.innerHTML = COLOR_PRESETS.map(preset => `
      <button type="button" class="color-swatch-item ${preset.primary.toLowerCase() === currentPrimary.toLowerCase() ? 'active' : ''}" 
              data-preset="${preset.id}" 
              data-color="${preset.primary}" 
              data-secondary="${preset.secondary}" 
              style="background-color: ${preset.primary};" 
              title="${preset.name} (${preset.primary})">
      </button>
    `).join('');

    grid.querySelectorAll('.color-swatch-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const primary = e.currentTarget.getAttribute('data-color');
        const secondary = e.currentTarget.getAttribute('data-secondary');
        const presetId = e.currentTarget.getAttribute('data-preset');
        applyColorScheme(primary, secondary, presetId, true);
        saveToStorage(false);
      });
    });
  }

  // ==========================================================================
  // UTILITÁRIO: ACESSO E ATUALIZAÇÃO POR DOT-NOTATION
  // ==========================================================================

  function getDeepValue(obj, path) {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  }

  function setDeepValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  // ==========================================================================
  // AUTENTICAÇÃO E MODO ADMINISTRADOR (EDITION ENGINE)
  // ==========================================================================

  function setAdminAuthenticated(auth, notify = true) {
    isAdminAuthenticated = auth;
    const body = document.body;
    const navLockIcon = document.getElementById('nav-lock-icon');

    if (auth) {
      body.classList.add('admin-authenticated');
      sessionStorage.setItem(AUTH_KEY, 'true');

      if (navLockIcon) navLockIcon.textContent = '🔓';

      // Ativa a edição sem toast redundante
      setAdminMode(true, false);

      if (notify) {
        showToast('🔓 Autenticado com sucesso! Comandos de administrador liberados.', 'success');
      }
    } else {
      body.classList.remove('admin-authenticated');
      sessionStorage.removeItem(AUTH_KEY);

      if (navLockIcon) navLockIcon.textContent = '🔒';

      // Desativa a edição sem toast redundante
      setAdminMode(false, false);

      if (notify) {
        showToast('🔒 Sessão administrativa bloqueada. Modo visitante ativo.', 'info');
      }
    }
  }

  function openAdminLoginModal() {
    if (isAdminAuthenticated) {
      const wantLogout = confirm('Você está no Modo Administrador.\n\nDeseja BLOQUEAR / SAIR e retornar ao modo visitante público?');
      if (wantLogout) {
        setAdminAuthenticated(false, true);
      }
      return;
    }

    const modal = document.getElementById('admin-login-modal');
    const userField = document.getElementById('login-username');
    const passField = document.getElementById('login-password');
    const errAlert = document.getElementById('login-error-alert');

    if (errAlert) errAlert.style.display = 'none';
    if (userField) userField.value = '';
    if (passField) passField.value = '';

    if (modal) {
      modal.classList.add('open');
      setTimeout(() => {
        if (userField) userField.focus();
      }, 100);
    }
  }

  function closeAdminLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    if (modal) modal.classList.remove('open');
  }

  function handleAdminLoginForm(e) {
    e.preventDefault();
    const userField = document.getElementById('login-username');
    const passField = document.getElementById('login-password');
    const errAlert = document.getElementById('login-error-alert');

    const username = (userField && userField.value.trim().toLowerCase()) || '';
    const password = (passField && passField.value.trim()) || '';

    // Credenciais válidas
    if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
      closeAdminLoginModal();
      setAdminAuthenticated(true, true);
    } else {
      if (errAlert) {
        errAlert.style.display = 'block';
        errAlert.animate([
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(0)' }
        ], { duration: 300 });
      }
      if (passField) passField.focus();
    }
  }

    function setAdminMode(active, notify = false) {
    isAdminMode = active;
    const body = document.body;
    const badge = document.getElementById('admin-status-badge');
    const badgeText = document.getElementById('admin-status-text');
    const toggle = document.getElementById('admin-mode-toggle');
    const colorPickerWrapper = document.getElementById('color-picker-wrapper');
    const colorPopover = document.getElementById('color-palette-popover');

    if (active) {
      body.classList.add('admin-mode-active');
      if (colorPickerWrapper) colorPickerWrapper.style.display = 'block';
      if (badge) {
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        badge.style.color = '#10b981';
      }
      if (badgeText) badgeText.textContent = 'Modo Administrador (Edição em Tempo Real)';
      if (toggle) toggle.checked = true;
      enableInlineEditing();
      if (notify) showToast('Modo Administrador ativado! Clique em qualquer texto para editar diretamente.', 'info');
    } else {
      body.classList.remove('admin-mode-active');
      if (colorPickerWrapper) colorPickerWrapper.style.display = 'none';
      if (colorPopover) colorPopover.classList.remove('open');
      if (badge) {
        badge.style.background = 'rgba(245, 158, 11, 0.12)';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.6)';
        badge.style.color = '#f59e0b';
      }
      if (badgeText) badgeText.textContent = 'Modo Visitante (Visualização)';
      if (toggle) toggle.checked = false;
      disableInlineEditing();
      if (notify) showToast('Modo de visualização ativado.', 'info');
    }

    renderSystems(); // Re-renderiza para mostrar/ocultar botões de edição nos cards
    renderBrandLogo(); // Atualiza selo de edição na logomarca
  }

  let inlineSaveDebounceTimer = null;

  function handleInlineBlur() {
    clearTimeout(inlineSaveDebounceTimer);
    if (isAdminAuthenticated) {
      saveToStorage(false);
    }
  }

  function enableInlineEditing() {
    const editables = document.querySelectorAll('[data-bind]');
    editables.forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
      
      // Remove listeners antigos para evitar duplicidade
      el.removeEventListener('input', handleInlineInput);
      el.addEventListener('input', handleInlineInput);
      el.removeEventListener('blur', handleInlineBlur);
      el.addEventListener('blur', handleInlineBlur);
    });
  }

  function disableInlineEditing() {
    const editables = document.querySelectorAll('[data-bind]');
    editables.forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeEventListener('input', handleInlineInput);
      el.removeEventListener('blur', handleInlineBlur);
    });
  }

  function handleInlineInput(e) {
    const target = e.currentTarget;
    const path = target.getAttribute('data-bind');
    if (!path) return;

    const value = target.innerText.trim();
    setDeepValue(siteData, path, value);

    // Cache local imediato
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(siteData));
    } catch (err) {}

    // Sincronização automática transparente com o servidor (content.json) com debounce de 800ms
    clearTimeout(inlineSaveDebounceTimer);
    inlineSaveDebounceTimer = setTimeout(() => {
      if (isAdminAuthenticated) {
        saveToStorage(false);
      }
    }, 800);
  }

  // ==========================================================================
  
  // ==========================================================================
  // IDENTIDADE VISUAL DA MARCA & LOGOTIPO (PADRÃO DASH SOLUTIONS)
  // ==========================================================================

  let currentEditingBrandType = 'monogram';

  function getActiveBrand() {
    if (!siteData.brand) {
      siteData.brand = {
        logoType: (siteData.navbar && siteData.navbar.logoImage) ? 'image' : 'monogram',
        monogramText: 'TF',
        logoImageUrl: (siteData.navbar && siteData.navbar.logoImage) || '',
        logoImageHeight: (siteData.navbar && siteData.navbar.logoHeight) || 40,
        showName: (siteData.navbar && siteData.navbar.logoMode === 'full') ? false : true,
        nameFirst: (siteData.navbar && siteData.navbar.brandName) || 'TOTUM',
        nameSecond: (siteData.navbar && siteData.navbar.brandHighlight) || 'FLEX',
        showTagline: true,
        tagline: (siteData.navbar && siteData.navbar.brandSubtitle) || 'Flex Informática',
        footerDesc: (siteData.footer && siteData.footer.text) || ''
      };
    }
    return siteData.brand;
  }

  function buildBrandLogoHTML(brand, options = {}) {
    const isHeader = !!options.isHeader;
    const isPreview = !!options.isPreview;
    const isFooter = !!options.isFooter;

    let logoGraphic = '';
    if (brand.logoType === 'image' && brand.logoImageUrl) {
      const height = Math.min(Math.max(brand.logoImageHeight || 40, 24), 70);
      logoGraphic = `
        <img src="${brand.logoImageUrl}" alt="${brand.nameFirst || ''} ${brand.nameSecond || ''}" 
             style="height: ${height}px; max-width: 260px; object-fit: contain; border-radius: 4px; display: block;">
      `;
    } else {
      const symbolText = brand.monogramText || 'TF';
      logoGraphic = `
        <div class="brand-icon-box" style="display:flex; align-items:center; justify-content:center;">${symbolText}</div>
      `;
    }

    let textMarkup = '';
    if (brand.showName || brand.logoType === 'monogram') {
      const nameFirst = brand.nameFirst || 'TOTUM';
      const nameSecond = brand.nameSecond || 'FLEX';
      const tagline = brand.tagline || 'Flex Informática';
      const showTagline = brand.showTagline !== false;

      textMarkup = `
        <div class="brand-text-box">
          <div class="brand-title">
            <span id="${isHeader ? 'field-brand-name' : (isFooter ? 'field-footer-brand-name' : '')}" data-bind="navbar.brandName">${nameFirst}</span><span id="${isHeader ? 'field-brand-highlight' : (isFooter ? 'field-footer-brand-highlight' : '')}" data-bind="navbar.brandHighlight" style="color: var(--accent-cyan);">${nameSecond}</span>
          </div>
          ${showTagline ? `<span class="brand-sub" id="${isHeader ? 'field-brand-subtitle' : (isFooter ? 'field-footer-brand-sub' : '')}" data-bind="navbar.brandSubtitle">${tagline}</span>` : ''}
        </div>
      `;
    }

    return `
      <div style="display: flex; align-items: center; gap: 10px;">
        ${logoGraphic}
        ${textMarkup}
      </div>
    `;
  }

  function renderBrandLogo() {
    const brand = getActiveBrand();

    const headerLogo = document.getElementById('brand-logo-link');
    if (headerLogo) {
      headerLogo.innerHTML = buildBrandLogoHTML(brand, { isHeader: true });
    }

    const footerLogo = document.getElementById('footer-brand-logo');
    if (footerLogo) {
      footerLogo.innerHTML = buildBrandLogoHTML(brand, { isFooter: true });
    }

    const footerDesc = document.getElementById('footer-brand-desc');
    if (footerDesc && brand.footerDesc) {
      footerDesc.textContent = brand.footerDesc;
    }
  }

  function openBrandEditorModal() {
    populateBrandInputs();
    updateBrandLivePreview();
    const modal = document.getElementById('brand-editor-modal') || document.getElementById('brand-logo-modal');
    if (modal) {
      modal.classList.add('open');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }
  window.openBrandEditorModal = openBrandEditorModal;
  window.openBrandLogoModal = openBrandEditorModal;

  function closeBrandEditorModal() {
    const modal = document.getElementById('brand-editor-modal') || document.getElementById('brand-logo-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
  window.closeBrandEditorModal = closeBrandEditorModal;
  window.closeBrandLogoModal = closeBrandEditorModal;

  function setBrandType(type) {
    currentEditingBrandType = type;
    const btnMono = document.getElementById('btn-type-monogram');
    const btnImg = document.getElementById('btn-type-image');
    const monoContainer = document.getElementById('brand-monogram-container');
    const imgContainer = document.getElementById('brand-image-container');

    if (type === 'image') {
      if (btnMono) btnMono.classList.remove('active');
      if (btnImg) btnImg.classList.add('active');
      if (monoContainer) monoContainer.style.display = 'none';
      if (imgContainer) imgContainer.style.display = 'block';
    } else {
      if (btnMono) btnMono.classList.add('active');
      if (btnImg) btnImg.classList.remove('active');
      if (monoContainer) monoContainer.style.display = 'block';
      if (imgContainer) imgContainer.style.display = 'none';
    }
    updateBrandLivePreview();
  };

  window.populateBrandInputs = function () {
    const brand = getActiveBrand();
    currentEditingBrandType = brand.logoType || 'monogram';
    setBrandType(currentEditingBrandType);

    const monoInput = document.getElementById('brand-monogram-text-input');
    if (monoInput) monoInput.value = brand.monogramText || 'TF';

    const urlInput = document.getElementById('brand-logo-url-input');
    if (urlInput) urlInput.value = brand.logoImageUrl || '';

    const removeBtn = document.getElementById('btn-remove-logo-img');
    if (removeBtn) removeBtn.style.display = brand.logoImageUrl ? 'inline-flex' : 'none';

    const slider = document.getElementById('brand-logo-height-slider');
    const sliderVal = document.getElementById('brand-logo-height-val');
    if (slider) slider.value = brand.logoImageHeight || 40;
    if (sliderVal) sliderVal.textContent = `${brand.logoImageHeight || 40}px`;

    const nameFirstInput = document.getElementById('brand-name-first-input');
    if (nameFirstInput) nameFirstInput.value = brand.nameFirst || 'TOTUM';

    const nameSecondInput = document.getElementById('brand-name-second-input');
    if (nameSecondInput) nameSecondInput.value = brand.nameSecond || 'FLEX';

    const showNameChk = document.getElementById('brand-show-name-chk');
    if (showNameChk) showNameChk.checked = brand.showName !== false;

    const taglineInput = document.getElementById('brand-tagline-input');
    if (taglineInput) taglineInput.value = brand.tagline || 'Flex Informática';

    const showTaglineChk = document.getElementById('brand-show-tagline-chk');
    if (showTaglineChk) showTaglineChk.checked = brand.showTagline !== false;

    const footerDescInput = document.getElementById('brand-footer-desc-input');
    if (footerDescInput) footerDescInput.value = brand.footerDesc || '';

    if (brand.logoImageUrl && currentEditingBrandType === 'image') {
      inspectAndDisplayLogoDimensions(brand.logoImageUrl);
    } else {
      inspectAndDisplayLogoDimensions('');
    }
  };

  window.inspectAndDisplayLogoDimensions = function (url) {
    const feedbackEl = document.getElementById('brand-logo-dimensions-feedback');
    if (!feedbackEl) return;

    if (!url) {
      feedbackEl.style.display = 'none';
      feedbackEl.innerHTML = '';
      return;
    }

    const testImg = new Image();
    testImg.onload = function () {
      const w = testImg.naturalWidth;
      const h = testImg.naturalHeight;
      const isSvg = url.includes('image/svg') || url.toLowerCase().endsWith('.svg');

      feedbackEl.style.display = 'flex';
      if (w === 0 || h === 0) {
        feedbackEl.style.display = 'none';
        return;
      }

      const ratioNum = w / h;
      const ratioStr = ratioNum.toFixed(1);
      let ratioLabel = 'Horizontal';
      if (Math.abs(w - h) <= Math.max(w, h) * 0.1) {
        ratioLabel = 'Quadrado (1:1)';
      } else if (w < h) {
        ratioLabel = 'Vertical';
      } else if (ratioNum >= 2.5) {
        ratioLabel = 'Horizontal Panorâmico';
      }

      let isGood = true;
      let statusText = 'Excelente proporção';
      let tip = 'Dimensões adequadas para o cabeçalho.';

      if (isSvg) {
        isGood = true;
        statusText = 'Vetor SVG';
        tip = 'Formato vetorial com nitidez infinita em qualquer resolução.';
      } else if (h < 50) {
        isGood = false;
        statusText = 'Atenção: Altura baixa';
        tip = `A imagem possui apenas ${h}px de altura. Pode perder nitidez em telas Retina. Recomendamos mínimo de 80px a 100px.`;
      } else if (w < h) {
        isGood = false;
        statusText = 'Orientação Vertical';
        tip = 'Imagens verticais podem ficar pequenas no cabeçalho horizontal. Recomendamos logos horizontais (~3:1 ou 4:1) ou símbolo quadrado.';
      } else if (ratioNum >= 2 && ratioNum <= 5 && h >= 60) {
        isGood = true;
        statusText = 'Dimensões Ideais';
        tip = 'Proporção retangular perfeita para o menu de navegação.';
      } else if (Math.abs(w - h) <= Math.max(w, h) * 0.1 && h >= 60) {
        isGood = true;
        statusText = 'Ícone Quadrado Ideal';
        tip = 'Símbolo quadrado perfeito para ser exibido junto ao nome da empresa.';
      } else {
        isGood = true;
        statusText = 'Compatível';
        tip = 'A imagem será ajustada proporcionalmente pelo controle de altura abaixo.';
      }

      feedbackEl.className = `brand-dim-feedback ${isGood ? 'good' : 'warning'}`;
      feedbackEl.innerHTML = `
        <div class="brand-dim-feedback-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div>
            <div><strong>Dimensões Detectadas:</strong> ${w} × ${h} px <span style="color:var(--text-secondary); font-size:0.75rem;">(${ratioLabel} &bull; Proporção ${ratioStr}:1)</span></div>
            <div style="font-size:0.74rem; color:var(--text-secondary); margin-top:2px;">${tip}</div>
          </div>
        </div>
        <span class="brand-dim-feedback-status">${statusText}</span>
      `;
    };

    testImg.onerror = function () {
      feedbackEl.style.display = 'none';
    };

    testImg.src = url;
  };

  window.updateBrandLivePreview = function () {
    const brandObj = {
      logoType: currentEditingBrandType,
      monogramText: document.getElementById('brand-monogram-text-input')?.value.trim() || 'TF',
      logoImageUrl: document.getElementById('brand-logo-url-input')?.value.trim() || '',
      logoImageHeight: parseInt(document.getElementById('brand-logo-height-slider')?.value || '40', 10),
      showName: document.getElementById('brand-show-name-chk') ? document.getElementById('brand-show-name-chk').checked : true,
      nameFirst: document.getElementById('brand-name-first-input')?.value.trim() || 'TOTUM',
      nameSecond: document.getElementById('brand-name-second-input')?.value.trim() || 'FLEX',
      showTagline: document.getElementById('brand-show-tagline-chk') ? document.getElementById('brand-show-tagline-chk').checked : true,
      tagline: document.getElementById('brand-tagline-input')?.value.trim() || 'Flex Informática',
      footerDesc: document.getElementById('brand-footer-desc-input')?.value.trim() || ''
    };

    const sliderVal = document.getElementById('brand-logo-height-val');
    if (sliderVal) sliderVal.textContent = `${brandObj.logoImageHeight}px`;

    const removeBtn = document.getElementById('btn-remove-logo-img');
    if (removeBtn) removeBtn.style.display = brandObj.logoImageUrl ? 'inline-flex' : 'none';

    if (currentEditingBrandType === 'image' && brandObj.logoImageUrl) {
      inspectAndDisplayLogoDimensions(brandObj.logoImageUrl);
    } else {
      inspectAndDisplayLogoDimensions('');
    }

    const previewHtml = buildBrandLogoHTML(brandObj, { isPreview: true });
    const modalPreview = document.getElementById('modal-brand-preview-display');
    if (modalPreview) modalPreview.innerHTML = previewHtml;
  };

  window.handleLogoFileUpload = function (event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem válido (PNG, SVG, JPG, WebP).', 'warning');
      return;
    }

    showToast('Processando e otimizando logotipo...', 'info');
    compressImageFile(file, 600, 300, 0.88).then(dataUrl => {
      const urlInput = document.getElementById('brand-logo-url-input');
      if (urlInput) urlInput.value = dataUrl;
      setBrandType('image');
      updateBrandLivePreview();
      inspectAndDisplayLogoDimensions(dataUrl);
      showToast('Logotipo carregado com sucesso! Verifique as dimensões e clique em "Salvar".', 'success');
    }).catch(err => {
      console.error('Erro ao processar logotipo:', err);
      showToast('Erro ao processar arquivo de imagem do logotipo.', 'warning');
    });
  };

  window.clearLogoImage = function () {
    const urlInput = document.getElementById('brand-logo-url-input');
    if (urlInput) urlInput.value = '';
    const filePicker = document.getElementById('brand-logo-file-picker');
    if (filePicker) filePicker.value = '';
    setBrandType('monogram');
    updateBrandLivePreview();
    inspectAndDisplayLogoDimensions('');
    showToast('Imagem removida. Modo monograma ativado.', 'info');
  };

  window.selectPresetLogo = function (path, isFull) {
    const urlInput = document.getElementById('brand-logo-url-input');
    if (urlInput) urlInput.value = path;
    const showNameChk = document.getElementById('brand-show-name-chk');
    if (showNameChk) showNameChk.checked = !isFull;
    setBrandType('image');
    updateBrandLivePreview();
    inspectAndDisplayLogoDimensions(path);
    showToast('Modelo vetorial oficial aplicado à pré-visualização!', 'info');
  };

  async function saveBrandFromForm() {
    const brandObj = {
      logoType: currentEditingBrandType,
      monogramText: document.getElementById('brand-monogram-text-input')?.value.trim() || 'TF',
      logoImageUrl: document.getElementById('brand-logo-url-input')?.value.trim() || '',
      logoImageHeight: parseInt(document.getElementById('brand-logo-height-slider')?.value || '40', 10),
      showName: document.getElementById('brand-show-name-chk') ? document.getElementById('brand-show-name-chk').checked : true,
      nameFirst: document.getElementById('brand-name-first-input')?.value.trim() || 'TOTUM',
      nameSecond: document.getElementById('brand-name-second-input')?.value.trim() || 'FLEX',
      showTagline: document.getElementById('brand-show-tagline-chk') ? document.getElementById('brand-show-tagline-chk').checked : true,
      tagline: document.getElementById('brand-tagline-input')?.value.trim() || 'Flex Informática',
      footerDesc: document.getElementById('brand-footer-desc-input')?.value.trim() || ''
    };

    siteData.brand = brandObj;

    // Sincronizar com navbar para manter total compatibilidade com o restante do app
    if (!siteData.navbar) siteData.navbar = {};
    siteData.navbar.brandName = brandObj.nameFirst;
    siteData.navbar.brandHighlight = brandObj.nameSecond;
    siteData.navbar.brandSubtitle = brandObj.tagline;
    siteData.navbar.logoImage = brandObj.logoImageUrl;
    siteData.navbar.logoHeight = brandObj.logoImageHeight;
    siteData.navbar.logoMode = brandObj.logoType === 'image' ? (brandObj.showName ? 'icon-text' : 'full') : 'default';

    await saveToStorage(true);
    renderBrandLogo();
    renderStaticBinds();
    closeBrandEditorModal();
    showToast('Identidade visual e logotipo atualizados com sucesso!', 'success');
  }
  window.saveBrandFromForm = saveBrandFromForm;
  const saveBrandLogo = saveBrandFromForm;
  window.saveBrandLogo = saveBrandFromForm;

  window.resetBrandToDefault = function () {
    if (confirm('Deseja restaurar a identidade visual e o logotipo para o padrão original do TotumFlex?')) {
      siteData.brand = {
        logoType: 'monogram',
        monogramText: 'TF',
        logoImageUrl: '',
        logoImageHeight: 40,
        showName: true,
        nameFirst: 'TOTUM',
        nameSecond: 'FLEX',
        showTagline: true,
        tagline: 'Flex Informática',
        footerDesc: ''
      };
      if (siteData.navbar) {
        siteData.navbar.logoImage = '';
        siteData.navbar.logoMode = 'default';
        siteData.navbar.brandName = 'TOTUM';
        siteData.navbar.brandHighlight = 'FLEX';
        siteData.navbar.brandSubtitle = 'Flex Informática';
      }
      saveToStorage(true);
      populateBrandInputs();
      updateBrandLivePreview();
      renderBrandLogo();
      renderStaticBinds();
      showToast('Identidade visual restaurada para o padrão.', 'info');
    }
  };

  function renderStaticBinds() {
    renderBrandLogo();
    const editables = document.querySelectorAll('[data-bind]');
    editables.forEach(el => {
      const path = el.getAttribute('data-bind');
      const val = getDeepValue(siteData, path);
      if (val !== undefined && val !== null) {
        el.innerText = val;
      }
    });

    // Links e dados de cabeçalho
    if (siteData.topBar) {
      const linkPhone = document.getElementById('link-topbar-phone');
      if (linkPhone && siteData.topBar.phone) {
        const cleanPhone = siteData.topBar.phone.replace(/\D/g, '');
        linkPhone.href = `tel:55${cleanPhone}`;
      }
      const linkEmail = document.getElementById('link-topbar-email');
      if (linkEmail && siteData.topBar.email) {
        linkEmail.href = `mailto:${siteData.topBar.email}`;
      }
    }
  }

  function renderStats() {
    const container = document.getElementById('stats-grid-container');
    if (!container || !siteData.hero || !siteData.hero.stats) return;

    container.innerHTML = siteData.hero.stats.map((stat, idx) => `
      <div class="stat-item" data-stat-id="${stat.id}">
        <div class="stat-value" data-bind="hero.stats.${idx}.value">${stat.value}</div>
        <div class="stat-label" data-bind="hero.stats.${idx}.label">${stat.label}</div>
        <div class="stat-detail" data-bind="hero.stats.${idx}.detail">${stat.detail}</div>
      </div>
    `).join('');
  }

  function renderCategories() {
    const filterBar = document.getElementById('category-filter-bar');
    if (!filterBar || !siteData.systemsSection || !siteData.systemsSection.categories) return;

    filterBar.innerHTML = siteData.systemsSection.categories.map(cat => `
      <button type="button" class="filter-btn ${cat.id === currentCategory ? 'active' : ''}" data-category="${cat.id}">
        ${cat.label}
      </button>
    `).join('');

    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentCategory = e.currentTarget.getAttribute('data-category');
        renderCategories();
        renderSystems();
      });
    });
  }

  function renderSystems() {
    const grid = document.getElementById('systems-grid');
    if (!grid || !siteData.systemsSection || !siteData.systemsSection.items) return;

    const items = siteData.systemsSection.items;
    const filtered = currentCategory === 'all' 
      ? items 
      : items.filter(it => it.category === currentCategory);

    let html = filtered.map((item) => {
      const globalIndex = items.findIndex(x => x.id === item.id);
      return `
        <div class="system-card" data-system-id="${item.id}">
          <div class="card-top">
            <div class="card-icon" title="Ícone">${item.icon || '💻'}</div>
            <span class="card-badge" data-bind="systemsSection.items.${globalIndex}.badge">${item.badge}</span>
          </div>

          <h3 class="card-title" data-bind="systemsSection.items.${globalIndex}.title">${item.title}</h3>
          <p class="card-summary" data-bind="systemsSection.items.${globalIndex}.summary">${item.summary}</p>

          <ul class="card-features-list">
            ${(item.features || []).map(f => `
              <li class="card-feature-item">
                <span class="card-feature-icon">✓</span>
                <span>${f}</span>
              </li>
            `).join('')}
          </ul>

          <div style="margin-top: auto;">
            <button type="button" class="card-action-btn" data-system-id="${item.id}" onclick="if(window.totumApp && window.totumApp.openSystemDetail){window.totumApp.openSystemDetail('${item.id}');}else if(window.openSystemDetail){window.openSystemDetail('${item.id}');}">
              <span>Ver detalhes completos</span>
              <span>→</span>
            </button>
          </div>

          <div class="admin-card-controls">
            <button type="button" class="btn-admin btn-admin-primary" style="flex: 1;" onclick="window.totumApp.editSystemModal('${item.id}')">
              ✏️ Editar
            </button>
            <button type="button" class="btn-admin btn-admin-danger" onclick="window.totumApp.deleteSystem('${item.id}')">
              🗑️ Excluir
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Adiciona o card "+ Adicionar Novo Sistema" quando o modo admin está ativo
    html += `
      <div class="system-card system-card-add" onclick="window.totumApp.addNewSystemPrompt()">
        <div class="system-card-add-icon">➕</div>
        <div class="system-card-add-text">Adicionar Novo Sistema</div>
        <p style="font-size: 0.8125rem; color: #94a3b8; margin-top: 6px;">Clique para cadastrar um novo módulo ou serviço</p>
      </div>
    `;

    grid.innerHTML = html;

    // Se admin mode estiver ativo, reativa os editables
    if (isAdminMode) {
      enableInlineEditing();
    }
  }

  function renderDifferentials() {
    const grid = document.getElementById('differentials-grid');
    if (!grid || !siteData.differentials || !siteData.differentials.cards) return;

    grid.innerHTML = siteData.differentials.cards.map((card, idx) => `
      <div class="diff-card">
        <span class="diff-icon">${card.icon}</span>
        <h3 class="diff-title" data-bind="differentials.cards.${idx}.title">${card.title}</h3>
        <p class="diff-desc" data-bind="differentials.cards.${idx}.description">${card.description}</p>
      </div>
    `).join('');
  }

  function renderWorkflow() {
    const grid = document.getElementById('workflow-grid');
    if (!grid || !siteData.workflowSection || !siteData.workflowSection.steps) return;

    grid.innerHTML = siteData.workflowSection.steps.map((st, idx) => `
      <div class="workflow-card">
        <div class="workflow-number">${st.step}</div>
        <h4 class="workflow-card-title" data-bind="workflowSection.steps.${idx}.title">${st.title}</h4>
        <p class="workflow-card-desc" data-bind="workflowSection.steps.${idx}.desc">${st.desc}</p>
      </div>
    `).join('');
  }

  function renderPillars() {
    const container = document.getElementById('pillars-list-container');
    if (!container || !siteData.about || !siteData.about.pillars) return;

    container.innerHTML = siteData.about.pillars.map((pil, idx) => `
      <div class="pillar-item">
        <div class="pillar-bullet">${idx + 1}</div>
        <div>
          <div class="pillar-name" data-bind="about.pillars.${idx}.name">${pil.name}</div>
          <div class="pillar-desc" data-bind="about.pillars.${idx}.desc">${pil.desc}</div>
        </div>
      </div>
    `).join('');
  }

  function renderAll() {
    renderBrandLogo();
    renderStaticBinds();
    renderStats();
    renderCategories();
    renderSystems();
    renderDifferentials();
    renderWorkflow();
    renderPillars();
    renderColorSwatches();

    if (isAdminMode) {
      enableInlineEditing();
    }
  }

  // ==========================================================================
  // OPERAÇÕES DE SISTEMAS (CRUD)
  // ==========================================================================

  async function deleteSystem(id) {
    if (!confirm('Deseja realmente remover este sistema do catálogo do site?')) return;
    
    siteData.systemsSection.items = siteData.systemsSection.items.filter(s => s.id !== id);
    await saveToStorage(false);
    renderSystems();
    showToast('Sistema removido com sucesso!', 'info');
  }

  async function addNewSystemPrompt() {
    const title = prompt('Digite o Nome do Novo Sistema (ex: Gestão de Frotas & Rastreamento):');
    if (!title || !title.trim()) return;

    const summary = prompt('Digite uma breve descrição resumo para o cartão:', 'Controle operacional completo com relatórios em tempo real.');
    const category = prompt('Categoria (digite: rh, operacoes ou fiscal):', 'operacoes') || 'operacoes';
    const icon = prompt('Ícone (emoji ou símbolo, ex: 🚚, 📊, ⚡):', '⚡') || '⚡';

    const newSystem = {
      id: 'sys-' + Date.now(),
      category: ['rh', 'operacoes', 'fiscal'].includes(category.toLowerCase()) ? category.toLowerCase() : 'operacoes',
      badge: 'NOVO MÓDULO',
      icon: icon,
      title: title.trim(),
      summary: summary || 'Descrição do sistema recém-adicionado.',
      description: 'Descrição completa e detalhada do sistema, desenvolvida com as melhores práticas de gestão.',
      features: [
        'Recurso inteligente integrado',
        'Relatórios gerenciais analíticos',
        'Controle de permissões e segurança',
        'Treinamento e suporte especializado'
      ],
      badgeColor: 'cyan'
    };

    siteData.systemsSection.items.push(newSystem);
    await saveToStorage(false);
    renderSystems();
    showToast(`Sistema "${title}" adicionado com sucesso!`, 'success');
  }

  function editSystemModal(id) {
    openEditSystemModal(id);
  }

  function openEditSystemModal(id) {
    const item = siteData.systemsSection.items.find(s => s.id === id);
    if (!item) return;

    // Se o modal de detalhes estiver aberto, fechar para focar na edição
    closeSystemDetail();

    currentEditingSystemId = id;
    const modal = document.getElementById('edit-system-card-modal');
    const titleEl = document.getElementById('edit-system-modal-title');
    const bodyEl = document.getElementById('edit-system-modal-body');

    if (!modal || !bodyEl) return;

    const currentImg = getSystemImage(item);
    titleEl.innerHTML = `<span>✏️</span> Editar Módulo: ${item.title}`;

    bodyEl.innerHTML = `
      <!-- SEÇÃO DA IMAGEM DO CARD E DO MODAL -->
      <div class="edit-card-section">
        <div class="edit-card-section-title">
          <span>🖼️</span> Imagem do Módulo (Exibida entre os textos no Modal de Detalhes)
        </div>

        <!-- Caixa de Orientação Oficial de Dimensões e Proporção (Padrão Dash Solutions) -->
        <div class="system-guide-box" id="system-dimensions-guide">
          <div class="system-guide-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <div class="system-guide-title">Guia de Tamanho &amp; Proporção Recomendados</div>
            <span class="system-guide-badge">Padrão Recomendado</span>
          </div>

          <div class="system-guide-grid">
            <!-- Card 1: Widescreen 16:9 (Ideal) -->
            <div class="system-guide-card highlight">
              <div class="system-card-top">
                <span class="system-card-name">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                  </svg>
                  Proporção 16:9 (Widescreen)
                </span>
                <span class="system-card-tag">Padrão Ideal</span>
              </div>
              <div class="system-guide-dim">1200 × 675 px <span>ou 800 × 450 px</span></div>
              <p>Formato panorâmico retangular. Preenche com perfeição o card e o modal de detalhes, preservando a harmonia da interface sem cortes nem faixas pretas.</p>
            </div>

            <!-- Card 2: Formatos e Resolução -->
            <div class="system-guide-card">
              <div class="system-card-top">
                <span class="system-card-name">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  Formatos Aceitos &amp; Qualidade
                </span>
                <span class="system-card-tag">Alta Nitidez</span>
              </div>
              <div class="system-guide-dim">PNG / WebP <span>ou SVG</span></div>
              <p><strong>PNG ou WebP:</strong> ideal para capturas de telas do ERP e dashboards com gráficos nítidos. <strong>SVG:</strong> para ilustrações e esquemas vetoriais com nitidez infinita.</p>
            </div>
          </div>

          <div class="system-guide-tips">
            <div class="system-guide-tip-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span><strong>Resolução Mínima Recomendada:</strong> Utilize imagens com no mínimo <strong>800px de largura</strong> e <strong>450px de altura</strong> para que textos, menus e números do print fiquem 100% legíveis em monitores Full HD, 4K e celulares.</span>
            </div>
            <div class="system-guide-tip-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 22 22 22"></polygon>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span><strong>Evite Imagens Verticais:</strong> Formatos em pé (retrato) criam barras pretas laterais ou empurram o conteúdo para baixo. Prefira sempre proporções horizontais (16:9 ou 16:10).</span>
            </div>
          </div>
        </div>

        <div class="edit-img-preview-box">
          <img id="edit-sys-img-preview" src="${currentImg}" alt="Visualização da Imagem">
        </div>

        <!-- Feedback Automático das Dimensões Detectadas da Imagem -->
        <div id="edit-sys-img-dimensions-feedback" class="system-dim-feedback" style="display: none;"></div>

        <div class="edit-img-controls-row">
          <label class="btn-upload-file">
            📁 Escolher Imagem do Computador
            <input type="file" id="edit-sys-file-input" accept="image/*" style="display: none;">
          </label>

          <button type="button" class="btn-admin" id="btn-reset-sys-img" title="Restaurar ilustração padrão deste sistema">
            ↺ Restaurar Imagem Padrão
          </button>
        </div>

        <!-- Opções de Enquadramento da Imagem (Sem Cortes vs Cover) -->
        <div class="form-group" style="margin-bottom: 14px; background: rgba(0, 0, 0, 0.25); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <label class="form-label" style="margin-bottom: 8px;">Enquadramento no Modal:</label>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.8125rem; color: #fff;">
              <input type="radio" name="edit-sys-img-fit" value="contain" ${(!item.imageFit || item.imageFit === 'contain') ? 'checked' : ''}>
              <span>🔍 <strong>Ajustar Imagem Inteira (Sem Cortes)</strong> - Padrão</span>
            </label>
            <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.8125rem; color: var(--text-secondary);">
              <input type="radio" name="edit-sys-img-fit" value="cover" ${item.imageFit === 'cover' ? 'checked' : ''}>
              <span>🖼️ Preencher Todo o Espaço (Cover)</span>
            </label>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">Ou insira uma URL da Imagem:</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="edit-sys-img-url" class="form-input" value="${item.image || currentImg}" placeholder="https://exemplo.com/imagem.jpg ou assets/images/...">
            <button type="button" class="btn-secondary" id="btn-apply-sys-url" style="white-space: nowrap;">Aplicar URL</button>
          </div>
        </div>

        <div class="preset-gallery-title">🎨 Modelos Prontos de Telas &amp; Dashboards:</div>
        <div class="preset-gallery-grid">
          ${SYSTEM_IMAGE_PRESETS.map(pr => `
            <button type="button" class="preset-thumb-btn ${pr.url === currentImg ? 'active' : ''}" data-url="${pr.url}" title="${pr.label}">
              <img src="${pr.url}" alt="${pr.label}">
              <span>${pr.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- SEÇÃO DE TEXTOS DO CARD E DO MODAL -->
      <div class="edit-card-section">
        <div class="edit-card-section-title">
          <span>📝</span> Textos e Identificação do Módulo
        </div>

        <div style="display: grid; grid-template-columns: 80px 1fr 180px; gap: 12px; margin-bottom: 14px;">
          <div>
            <label class="form-label">Ícone:</label>
            <input type="text" id="edit-sys-icon" class="form-input" value="${item.icon || '💻'}">
          </div>
          <div>
            <label class="form-label">Título do Módulo:</label>
            <input type="text" id="edit-sys-title" class="form-input" value="${item.title}">
          </div>
          <div>
            <label class="form-label">Tag / Badge:</label>
            <input type="text" id="edit-sys-badge" class="form-input" value="${item.badge}">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <label class="form-label">Categoria do Sistema:</label>
            <select id="edit-sys-category" class="form-select">
              <option value="operacoes" ${item.category === 'operacoes' ? 'selected' : ''}>Operações &amp; Logística</option>
              <option value="rh" ${item.category === 'rh' ? 'selected' : ''}>RH &amp; Pessoal</option>
              <option value="fiscal" ${item.category === 'fiscal' ? 'selected' : ''}>Fiscal &amp; Financeiro</option>
            </select>
          </div>
          <div>
            <label class="form-label">Cor do Badge:</label>
            <select id="edit-sys-badge-color" class="form-select">
              <option value="cyan" ${item.badgeColor === 'cyan' ? 'selected' : ''}>Ciano</option>
              <option value="emerald" ${item.badgeColor === 'emerald' ? 'selected' : ''}>Esmeralda (Verde)</option>
              <option value="purple" ${item.badgeColor === 'purple' ? 'selected' : ''}>Roxo / Violeta</option>
              <option value="amber" ${item.badgeColor === 'amber' ? 'selected' : ''}>Âmbar (Dourado)</option>
              <option value="indigo" ${item.badgeColor === 'indigo' ? 'selected' : ''}>Índigo</option>
              <option value="blue" ${item.badgeColor === 'blue' ? 'selected' : ''}>Azul Royal</option>
              <option value="rose" ${item.badgeColor === 'rose' ? 'selected' : ''}>Rose</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">Resumo do Card (exibido na página inicial):</label>
          <textarea id="edit-sys-summary" class="form-textarea" rows="2">${item.summary}</textarea>
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">Descrição Completa (Texto do Modal - Bloco 1):</label>
          <textarea id="edit-sys-description" class="form-textarea" rows="3">${item.description || item.summary}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Destaques e Recursos Principais (Texto do Modal - Bloco 2, um por linha):</label>
          <textarea id="edit-sys-features" class="form-textarea" rows="4">${(item.features || []).join('\n')}</textarea>
        </div>
      </div>
    `;

    // Conectar eventos do modal de edição
    const previewImg = document.getElementById('edit-sys-img-preview');
    const urlInput = document.getElementById('edit-sys-img-url');
    const fileInput = document.getElementById('edit-sys-file-input');
    const btnApplyUrl = document.getElementById('btn-apply-sys-url');
    const btnResetImg = document.getElementById('btn-reset-sys-img');

    // Inicializar classe de fit do preview
    if (previewImg && item.imageFit === 'cover') {
      previewImg.classList.add('fit-cover');
    }

    const fitRadios = bodyEl.querySelectorAll('input[name="edit-sys-img-fit"]');
    fitRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (previewImg) {
          if (radio.value === 'cover') {
            previewImg.classList.add('fit-cover');
          } else {
            previewImg.classList.remove('fit-cover');
          }
        }
      });
    });

    // Inspecionar e exibir dimensões da imagem atual
    inspectAndDisplaySystemImageDimensions(currentImg);

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          if (!file.type.startsWith('image/')) {
            showToast('Por favor selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP)', 'warning');
            return;
          }
          showToast('Otimizando imagem para alta resolução e melhor desempenho...', 'info');
          compressImageFile(file, 1200, 675, 0.85).then(dataUrl => {
            if (previewImg) previewImg.src = dataUrl;
            if (urlInput) urlInput.value = dataUrl;
            inspectAndDisplaySystemImageDimensions(dataUrl);
            showToast('Imagem carregada e pronta para salvar!', 'success');
          }).catch(err => {
            console.error('Erro ao processar imagem:', err);
            showToast('Erro ao processar arquivo de imagem.', 'warning');
          });
        }
      });
    }

    if (btnApplyUrl && urlInput) {
      btnApplyUrl.addEventListener('click', () => {
        const val = urlInput.value.trim();
        if (val && previewImg) {
          previewImg.src = val;
          inspectAndDisplaySystemImageDimensions(val);
          showToast('URL da imagem aplicada ao preview!', 'info');
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('change', () => {
        const val = urlInput.value.trim();
        if (val && previewImg) {
          previewImg.src = val;
          inspectAndDisplaySystemImageDimensions(val);
        }
      });
    }

    if (btnResetImg) {
      btnResetImg.addEventListener('click', () => {
        const defaultImg = getSystemImage({ id: item.id });
        if (previewImg) previewImg.src = defaultImg;
        if (urlInput) urlInput.value = defaultImg;
        inspectAndDisplaySystemImageDimensions(defaultImg);
        showToast('Imagem restaurada para a ilustração padrão!', 'info');
      });
    }

    // Presets
    const presetBtns = bodyEl.querySelectorAll('.preset-thumb-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (url) {
          if (previewImg) previewImg.src = url;
          if (urlInput) urlInput.value = url;
          inspectAndDisplaySystemImageDimensions(url);
          presetBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    modal.classList.add('open');
  }

  window.inspectAndDisplaySystemImageDimensions = function (url) {
    const feedbackEl = document.getElementById('edit-sys-img-dimensions-feedback');
    if (!feedbackEl) return;

    if (!url || typeof url !== 'string' || !url.trim()) {
      feedbackEl.style.display = 'none';
      feedbackEl.innerHTML = '';
      return;
    }

    const testImg = new Image();
    testImg.onload = function () {
      const w = testImg.naturalWidth;
      const h = testImg.naturalHeight;
      const isSvg = url.includes('image/svg') || url.toLowerCase().endsWith('.svg');

      feedbackEl.style.display = 'flex';

      if (w === 0 || h === 0) {
        if (isSvg) {
          feedbackEl.className = 'system-dim-feedback good';
          feedbackEl.innerHTML = `
            <div class="system-dim-feedback-info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="9 11 12 14 22 4"></polyline>
              </svg>
              <div>
                <div><strong>Formato Vetorial (SVG):</strong> Nitidez infinita em qualquer resolução.</div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Ilustração vetorial pronta para qualquer densidade de tela.</div>
              </div>
            </div>
            <span class="system-dim-status-tag good">Vetor SVG</span>
          `;
        } else {
          feedbackEl.style.display = 'none';
        }
        return;
      }

      const ratioNum = w / h;
      const ratioStr = ratioNum.toFixed(2);
      let ratioLabel = 'Horizontal';
      const is169 = Math.abs(ratioNum - 16 / 9) <= 0.22;
      const is1610 = Math.abs(ratioNum - 16 / 10) <= 0.15;
      const isSquare = Math.abs(w - h) <= Math.max(w, h) * 0.1;

      if (isSquare) {
        ratioLabel = 'Quadrado (1:1)';
      } else if (w < h) {
        ratioLabel = 'Vertical (Retrato)';
      } else if (is169) {
        ratioLabel = 'Widescreen (16:9)';
      } else if (is1610) {
        ratioLabel = 'Panorâmico (16:10)';
      } else if (ratioNum >= 2.2) {
        ratioLabel = 'Ultra-wide';
      }

      let isWarning = false;
      let statusText = 'Dimensões Ideais (16:9)';
      let tip = 'Proporção retangular perfeita para o modal de detalhes e os cards.';

      if (isSvg) {
        statusText = 'Vetor SVG';
        tip = 'Vetor SVG com nitidez infinita em qualquer resolução.';
      } else if (w < 450 || h < 260) {
        isWarning = true;
        statusText = 'Atenção: Baixa Resolução';
        tip = `A imagem possui apenas ${w}×${h}px. Pode perder nitidez em telas de alta resolução. Recomendamos mínimo de 800×450px.`;
      } else if (w < h) {
        isWarning = true;
        statusText = 'Orientação Vertical';
        tip = 'Imagens verticais deixam espaços pretos ou são cortadas no modal. Recomendamos imagens horizontais (16:9).';
      } else if (is169 || is1610) {
        statusText = 'Dimensões Ideais (16:9)';
        tip = 'Proporção panorâmica excelente! Ocupará o modal com perfeita harmonia visual e nitidez.';
      } else if (ratioNum >= 1.3 && ratioNum <= 2.2) {
        statusText = 'Boa Proporção Horizontal';
        tip = 'A imagem preencherá bem o espaço visual do módulo.';
      } else {
        statusText = 'Compatível';
        tip = 'A imagem será ajustada proporcionalmente ao container.';
      }

      feedbackEl.className = `system-dim-feedback ${isWarning ? 'warning' : 'good'}`;
      feedbackEl.innerHTML = `
        <div class="system-dim-feedback-info">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;">
            ${isWarning ? `
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            ` : `
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="9 11 12 14 22 4"></polyline>
            `}
          </svg>
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <strong>Dimensões Detectadas:</strong>
              <span class="dim-coords">${w} × ${h} px</span>
              <span class="dim-ratio-pill">(${ratioLabel} &bull; ${ratioStr}:1)</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px;">${tip}</div>
          </div>
        </div>
        <span class="system-dim-status-tag ${isWarning ? 'warning' : 'good'}">${statusText}</span>
      `;
    };

    testImg.onerror = function () {
      feedbackEl.style.display = 'none';
    };

    testImg.src = url;
  };

  function closeEditSystemModal() {
    const modal = document.getElementById('edit-system-card-modal');
    if (modal) modal.classList.remove('open');
    currentEditingSystemId = null;
  }
  window.openEditSystemModal = openEditSystemModal;
  window.editSystemModal = editSystemModal;
  window.closeEditSystemModal = closeEditSystemModal;
  window.saveEditedSystem = saveEditedSystem;
  window.deleteSystem = deleteSystem;
  window.addNewSystemPrompt = addNewSystemPrompt;

  async function saveEditedSystem() {
    if (!currentEditingSystemId) return;
    const item = siteData.systemsSection.items.find(s => s.id === currentEditingSystemId);
    if (!item) return;

    const titleEl = document.getElementById('edit-sys-title');
    const title = titleEl ? titleEl.value.trim() : '';
    if (!title) {
      showToast('O título do módulo é obrigatório.', 'warning');
      return;
    }

    const iconEl = document.getElementById('edit-sys-icon');
    const badgeEl = document.getElementById('edit-sys-badge');
    const categoryEl = document.getElementById('edit-sys-category');
    const badgeColorEl = document.getElementById('edit-sys-badge-color');
    const summaryEl = document.getElementById('edit-sys-summary');
    const descriptionEl = document.getElementById('edit-sys-description');
    const featuresEl = document.getElementById('edit-sys-features');
    const imgUrlEl = document.getElementById('edit-sys-img-url');

    item.title = title;
    if (iconEl && iconEl.value.trim()) item.icon = iconEl.value.trim();
    if (badgeEl && badgeEl.value.trim()) item.badge = badgeEl.value.trim();
    if (categoryEl && categoryEl.value) item.category = categoryEl.value;
    if (badgeColorEl && badgeColorEl.value) item.badgeColor = badgeColorEl.value;
    if (summaryEl) item.summary = summaryEl.value.trim();
    if (descriptionEl) item.description = descriptionEl.value.trim();
    if (imgUrlEl && imgUrlEl.value.trim()) item.image = imgUrlEl.value.trim();

    const fitRadio = document.querySelector('input[name="edit-sys-img-fit"]:checked');
    item.imageFit = fitRadio ? fitRadio.value : 'contain';

    if (featuresEl) {
      const lines = featuresEl.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) item.features = lines;
    }

    await saveToStorage(false);
    renderSystems();

    // Se o modal de detalhes estiver aberto, atualiza-o imediatamente
    const detailModal = document.getElementById('system-detail-modal');
    if (detailModal && detailModal.classList.contains('open')) {
      openSystemDetail(item.id);
    }

    closeEditSystemModal();
    showToast(`Módulo "${item.title}" atualizado e salvo com sucesso!`, 'success');
  }

  function openSystemDetail(id) {
    const item = siteData.systemsSection.items.find(s => s.id === id);
    if (!item) return;

    const modal = document.getElementById('system-detail-modal');
    const titleEl = document.getElementById('system-detail-title');
    const bodyEl = document.getElementById('system-detail-body');
    const requestBtn = document.getElementById('btn-system-detail-request');

    const currentImg = getSystemImage(item);

    titleEl.innerHTML = `<span style="font-size: 1.5rem; margin-right: 8px;">${item.icon || '💻'}</span> ${item.title}`;
    
    bodyEl.innerHTML = `
      <div style="margin-bottom: 16px;">
        <span class="card-badge" style="font-size: 0.75rem;">${item.badge}</span>
      </div>

      <!-- BLOCO DE TEXTO 1: Descrição Detalhada do Sistema -->
      <p style="font-size: 1rem; color: var(--text-primary); line-height: 1.7; margin-bottom: 20px;">
        ${item.description || item.summary}
      </p>

      <!-- IMAGEM ENTRE OS DOIS BLOCOS DE TEXTO (16:9 PROPORCIONAL SEM CORTES) -->
      <div class="system-detail-image-box">
        <img src="${currentImg}" alt="${item.title}" class="system-detail-img ${item.imageFit === 'cover' ? 'fit-cover' : ''}" id="detail-img-${item.id}">
        ${isAdminMode ? `
          <div class="system-detail-img-admin-bar">
            <button type="button" class="btn-admin-edit-img" onclick="window.totumApp.openEditSystemModal('${item.id}')" title="Alterar imagem e textos deste módulo">
              📷 Alterar Imagem / Editar Card
            </button>
          </div>
        ` : ''}
      </div>

      <!-- BLOCO DE TEXTO 2: Destaques e Recursos Principais -->
      <h4 style="font-size: 0.9375rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">
        Destaques e Recursos Principais:
      </h4>
      <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
        ${(item.features || []).map(f => `
          <li style="display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: var(--text-secondary);">
            <span style="color: var(--accent-emerald); font-weight: bold;">✓</span> ${f}
          </li>
        `).join('')}
      </ul>
      <div style="background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.2); padding: 16px; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary);">
        💡 <strong>Atendimento Personalizado:</strong> Este módulo pode ser adaptado com regras específicas para o seu segmento ou convenção coletiva.
      </div>
    `;

    if (requestBtn) {
      requestBtn.onclick = () => {
        closeSystemDetail();
        const select = document.getElementById('form-system-select');
        if (select) {
          select.value = item.title;
        }
        document.getElementById('contato').scrollIntoView({ behavior: 'smooth' });
      };
    }

    modal.classList.add('open');
  }

  function closeSystemDetail() {
    const modal = document.getElementById('system-detail-modal');
    if (modal) modal.classList.remove('open');
  }
  window.openSystemDetail = openSystemDetail;
  window.closeSystemDetail = closeSystemDetail;

  // ==========================================================================
  // MODAL DO PAINEL CMS COMPLETO (EDITOR FORMULÁRIO)
  // ==========================================================================

  function openCMSModal(initialTab = 'tab-geral') {
    const modal = document.getElementById('cms-modal-backdrop');
    if (!modal) return;

    modal.classList.add('open');
    renderCMSTabs(initialTab);
  }

  function closeCMSModal() {
    const modal = document.getElementById('cms-modal-backdrop');
    if (modal) modal.classList.remove('open');
  }

  function renderCMSTabs(activeTabId) {
    const tabs = document.querySelectorAll('.modal-tab-btn');
    tabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === activeTabId);
    });

    const body = document.getElementById('cms-modal-body');
    if (!body) return;

    let contentHtml = '';

    if (activeTabId === 'tab-geral') {
      contentHtml = `
        <h3 style="margin-bottom: 20px; font-size: 1.15rem; color: var(--accent-cyan);">Informações Gerais & Barra Superior</h3>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Mensagem de Anúncio no Topo:</label>
          <input type="text" id="cms-topbar-announcement" class="form-input" value="${siteData.topBar.announcement || ''}">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label class="form-label">Telefone WhatsApp:</label>
            <input type="text" id="cms-topbar-phone" class="form-input" value="${siteData.topBar.phone || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Telefone Fixo:</label>
            <input type="text" id="cms-topbar-phone2" class="form-input" value="${siteData.topBar.phoneSecondary || ''}">
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">E-mail Principal:</label>
          <input type="email" id="cms-topbar-email" class="form-input" value="${siteData.topBar.email || ''}">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">Nome da Marca (Parte 1):</label>
            <input type="text" id="cms-brand-name" class="form-input" value="${siteData.navbar.brandName || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Nome da Marca (Destaque):</label>
            <input type="text" id="cms-brand-highlight" class="form-input" value="${siteData.navbar.brandHighlight || ''}">
          </div>
        </div>
      `;
    } else if (activeTabId === 'tab-cores') {
      const currentPrimary = (siteData.colorScheme && siteData.colorScheme.primary) || '#00f0ff';
      contentHtml = `
        
        <!-- SEÇÃO DE LOGOMARCA NO CMS -->
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
            <div>
              <span style="font-weight: 700; color: #fff; font-size: 1rem;">🏷️ Logomarca da Marca &amp; Cabeçalho</span>
              <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 2px;">Altere o logotipo visual exibido no topo e rodapé do site</p>
            </div>
            <button type="button" class="btn-primary" style="padding: 8px 16px; font-size: 0.8125rem;" onclick="window.totumApp.openBrandLogoModal()">
              🎨 Abrir Configurador Completo de Logo
            </button>
          </div>
          <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); flex-wrap: wrap;">
            <div style="min-width: 50px;">
              <div style="font-size: 0.6875rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">Logo Atual:</div>
              <div id="cms-brand-logo-preview" style="height: 38px; display: flex; align-items: center;">
                ${(siteData.navbar && siteData.navbar.logoImage) 
                  ? `<img src="${siteData.navbar.logoImage}" style="max-height: 38px; max-width: 120px; object-fit: contain;">` 
                  : `<div class="brand-icon-box" style="width:36px; height:36px; font-size: 1rem;">TF</div>`}
              </div>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <label class="form-label" style="margin-bottom: 4px;">URL da Imagem da Logomarca:</label>
              <input type="text" id="cms-brand-logo-input" class="form-input" value="${(siteData.navbar && siteData.navbar.logoImage) || ''}" placeholder="https://... ou assets/images/...">
            </div>
          </div>
        </div>

        <h3 style="margin-bottom: 8px; font-size: 1.15rem; color: var(--accent-cyan);">🎨 Personalização de Cores & Identidade Visual</h3>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 24px;">
          Selecione a paleta de cores corporativa do TotumFlex. As alterações afetam imediatamente os botões, títulos em destaque, brilhos, cards e elementos visuais de todo o site.
        </p>

        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 14px;">Paletas Prontas Corporativas:</h4>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px;">
          ${COLOR_PRESETS.map(p => `
            <button type="button" class="btn-admin" style="padding: 14px 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; border: 1px solid ${p.primary.toLowerCase() === currentPrimary.toLowerCase() ? 'var(--text-light)' : 'var(--border-subtle)'}; background: rgba(255,255,255,0.04); cursor: pointer;" onclick="window.totumApp.applyColorScheme('${p.primary}', '${p.secondary}', '${p.id}', true)">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${p.primary}; box-shadow: 0 0 12px ${p.primary}80;"></div>
              <span style="font-size: 0.8125rem; font-weight: 700; color: #fff;">${p.name}</span>
              <span style="font-size: 0.72rem; color: #94a3b8;">${p.primary}</span>
            </button>
          `).join('')}
        </div>

        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">Ou Escolha Qualquer Cor Personalizada:</h4>
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); padding: 20px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 16px;">
          <input type="color" id="cms-custom-color-input" class="input-color-circle" value="${currentPrimary}" style="width: 48px; height: 48px;">
          <div style="flex: 1;">
            <label class="form-label">Código HEX:</label>
            <input type="text" id="cms-custom-hex-input" class="form-input" value="${currentPrimary}" placeholder="#00f0ff">
          </div>
          <button type="button" class="btn-primary" style="align-self: flex-end; padding: 12px 24px;" onclick="window.totumApp.applyCustomFromCMS()">
            Aplicar Cor Personalizada
          </button>
        </div>
      `;
    } else if (activeTabId === 'tab-hero') {
      contentHtml = `
        <h3 style="margin-bottom: 20px; font-size: 1.15rem; color: var(--accent-cyan);">Seção Hero & Destaque Principal</h3>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Badge Superior:</label>
          <input type="text" id="cms-hero-badge" class="form-input" value="${siteData.hero.badge || ''}">
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Título Principal (Primeira Parte):</label>
          <input type="text" id="cms-hero-title-main" class="form-input" value="${siteData.hero.titleMain || ''}">
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Título em Gradiente (Destaque):</label>
          <input type="text" id="cms-hero-title-highlight" class="form-input" value="${siteData.hero.titleHighlight || ''}">
        </div>
        <div class="form-group" style="margin-bottom: 24px;">
          <label class="form-label">Descrição Principal do Hero:</label>
          <textarea id="cms-hero-desc" class="form-textarea" rows="3">${siteData.hero.description || ''}</textarea>
        </div>

        <h4 style="margin-bottom: 16px; font-size: 1rem; color: var(--text-primary);">Configuração das 4 Estatísticas:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          ${(siteData.hero.stats || []).map((st, idx) => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); padding: 12px; border-radius: var(--radius-sm);">
              <label class="form-label">Valor #${idx + 1}:</label>
              <input type="text" id="cms-stat-${idx}-val" class="form-input" value="${st.value}" style="margin-bottom: 6px;">
              <label class="form-label">Rótulo:</label>
              <input type="text" id="cms-stat-${idx}-lbl" class="form-input" value="${st.label}">
            </div>
          `).join('')}
        </div>
      `;
    } else if (activeTabId === 'tab-sistemas') {
      contentHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="font-size: 1.15rem; color: var(--accent-cyan);">Gerenciar Sistemas Cadastrados</h3>
          <button type="button" class="btn-primary" style="padding: 8px 16px; font-size: 0.8125rem;" onclick="window.totumApp.addNewSystemPrompt()">
            ➕ Novo Sistema
          </button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${(siteData.systemsSection.items || []).map((sys, idx) => `
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-weight: 700; color: #fff; font-size: 1rem;">${sys.icon || '💻'} ${sys.title}</span>
                <span class="card-badge">${sys.category}</span>
              </div>
              <div style="display: grid; grid-template-columns: 80px 1fr 150px; gap: 12px; margin-bottom: 10px;">
                <div>
                  <label class="form-label">Ícone:</label>
                  <input type="text" id="cms-sys-${idx}-icon" class="form-input" value="${sys.icon || '💻'}">
                </div>
                <div>
                  <label class="form-label">Título do Módulo:</label>
                  <input type="text" id="cms-sys-${idx}-title" class="form-input" value="${sys.title}">
                </div>
                <div>
                  <label class="form-label">Tag / Badge:</label>
                  <input type="text" id="cms-sys-${idx}-badge" class="form-input" value="${sys.badge}">
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 10px;">
                <label class="form-label">Resumo do Card:</label>
                <textarea id="cms-sys-${idx}-summary" class="form-textarea" rows="2">${sys.summary}</textarea>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-subtle); flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img src="${getSystemImage(sys)}" alt="${sys.title}" style="width: 54px; height: 34px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-active); background: #0f172a;">
                  <span style="font-size: 0.8125rem; color: var(--text-secondary);">Imagem do Modal configurada</span>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn-admin btn-admin-primary" style="font-size: 0.8125rem; padding: 6px 12px;" onclick="window.totumApp.openEditSystemModal('${sys.id}')">
                    🖼️ Alterar Imagem &amp; Detalhes
                  </button>
                  <button type="button" class="btn-admin btn-admin-danger" style="font-size: 0.8125rem; padding: 6px 12px;" onclick="window.totumApp.deleteSystem('${sys.id}')">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (activeTabId === 'tab-sobre') {
      contentHtml = `
        <h3 style="margin-bottom: 20px; font-size: 1.15rem; color: var(--accent-cyan);">Sobre Nós, Missão e Visão</h3>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Título da Seção Sobre:</label>
          <input type="text" id="cms-about-title" class="form-input" value="${siteData.about.title || ''}">
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Texto Histórico / Fundação:</label>
          <textarea id="cms-about-history" class="form-textarea" rows="4">${siteData.about.history || ''}</textarea>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Missão da Empresa:</label>
          <textarea id="cms-about-mission" class="form-textarea" rows="3">${siteData.about.mission || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Visão da Empresa:</label>
          <textarea id="cms-about-vision" class="form-textarea" rows="3">${siteData.about.vision || ''}</textarea>
        </div>
      `;
    } else if (activeTabId === 'tab-contato') {
      contentHtml = `
        <h3 style="margin-bottom: 20px; font-size: 1.15rem; color: var(--accent-cyan);">Contatos & Rodapé</h3>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Endereço Completo em Belém/PA:</label>
          <input type="text" id="cms-contact-address" class="form-input" value="${siteData.contact.address || ''}">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
          <div class="form-group">
            <label class="form-label">Telefone WhatsApp:</label>
            <input type="text" id="cms-contact-phone" class="form-input" value="${siteData.contact.phone || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Telefone Fixo:</label>
            <input type="text" id="cms-contact-phonefixed" class="form-input" value="${siteData.contact.phoneFixed || ''}">
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Horário de Atendimento:</label>
          <input type="text" id="cms-contact-hours" class="form-input" value="${siteData.contact.hours || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Texto de Copyright no Rodapé:</label>
          <input type="text" id="cms-footer-copyright" class="form-input" value="${siteData.footer.copyright || ''}">
        </div>
      `;
    }

    body.innerHTML = contentHtml;
  }

  async function saveCMSModalData() {
    // Coleta valores da aba atual e atualiza siteData
    const announcement = document.getElementById('cms-topbar-announcement');
    if (announcement) siteData.topBar.announcement = announcement.value;

    const phone = document.getElementById('cms-topbar-phone');
    if (phone) siteData.topBar.phone = phone.value;

    const phone2 = document.getElementById('cms-topbar-phone2');
    if (phone2) siteData.topBar.phoneSecondary = phone2.value;

    const email = document.getElementById('cms-topbar-email');
    if (email) siteData.topBar.email = email.value;

    const brandName = document.getElementById('cms-brand-name');
    if (brandName) siteData.navbar.brandName = brandName.value;

    const brandHighlight = document.getElementById('cms-brand-highlight');
    if (brandHighlight) siteData.navbar.brandHighlight = brandHighlight.value;

    const heroBadge = document.getElementById('cms-hero-badge');
    if (heroBadge) siteData.hero.badge = heroBadge.value;

    const heroTitleMain = document.getElementById('cms-hero-title-main');
    if (heroTitleMain) siteData.hero.titleMain = heroTitleMain.value;

    const heroTitleHighlight = document.getElementById('cms-hero-title-highlight');
    if (heroTitleHighlight) siteData.hero.titleHighlight = heroTitleHighlight.value;

    const heroDesc = document.getElementById('cms-hero-desc');
    if (heroDesc) siteData.hero.description = heroDesc.value;

    // Atualiza estatísticas se existirem
    (siteData.hero.stats || []).forEach((st, idx) => {
      const v = document.getElementById(`cms-stat-${idx}-val`);
      const l = document.getElementById(`cms-stat-${idx}-lbl`);
      if (v) st.value = v.value;
      if (l) st.label = l.value;
    });

    // Atualiza sistemas da lista se existirem
    (siteData.systemsSection.items || []).forEach((sys, idx) => {
      const icon = document.getElementById(`cms-sys-${idx}-icon`);
      const title = document.getElementById(`cms-sys-${idx}-title`);
      const badge = document.getElementById(`cms-sys-${idx}-badge`);
      const summary = document.getElementById(`cms-sys-${idx}-summary`);

      if (icon) sys.icon = icon.value;
      if (title) sys.title = title.value;
      if (badge) sys.badge = badge.value;
      if (summary) sys.summary = summary.value;
    });

    // Sobre
    
    const cmsLogoInput = document.getElementById('cms-brand-logo-input');
    if (cmsLogoInput) {
      if (!siteData.navbar) siteData.navbar = {};
      siteData.navbar.logoImage = cmsLogoInput.value.trim();
      if (siteData.navbar.logoImage && !siteData.navbar.logoMode) {
        siteData.navbar.logoMode = 'icon-text';
      }
      renderBrandLogo();
    }

    const aboutTitle = document.getElementById('cms-about-title');
    if (aboutTitle) siteData.about.title = aboutTitle.value;

    const aboutHistory = document.getElementById('cms-about-history');
    if (aboutHistory) siteData.about.history = aboutHistory.value;

    const aboutMission = document.getElementById('cms-about-mission');
    if (aboutMission) siteData.about.mission = aboutMission.value;

    const aboutVision = document.getElementById('cms-about-vision');
    if (aboutVision) siteData.about.vision = aboutVision.value;

    // Contato
    const contactAddr = document.getElementById('cms-contact-address');
    if (contactAddr) siteData.contact.address = contactAddr.value;

    const contactPhone = document.getElementById('cms-contact-phone');
    if (contactPhone) siteData.contact.phone = contactPhone.value;

    const contactPhoneFixed = document.getElementById('cms-contact-phonefixed');
    if (contactPhoneFixed) siteData.contact.phoneFixed = contactPhoneFixed.value;

    const contactHours = document.getElementById('cms-contact-hours');
    if (contactHours) siteData.contact.hours = contactHours.value;

    const footerCopy = document.getElementById('cms-footer-copyright');
    if (footerCopy) siteData.footer.copyright = footerCopy.value;

    await saveToStorage(true);
    renderAll();
    closeCMSModal();
  }

  // ==========================================================================
  // EXPORTAÇÃO E IMPORTAÇÃO JSON
  // ==========================================================================

  function exportToJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(siteData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `totumflex-config-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Arquivo de configuração JSON baixado com sucesso!', 'success');
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported && imported.hero && imported.systemsSection) {
          siteData = imported;
          saveToStorage(false);
          renderAll();
          showToast('Configurações importadas com sucesso!', 'success');
        } else {
          showToast('Arquivo JSON inválido para a estrutura da TotumFlex.', 'warning');
        }
      } catch (err) {
        showToast('Erro ao ler arquivo JSON: ' + err.message, 'warning');
      }
    };
    reader.readAsText(file);
  }

  // ==========================================================================
  // FEEDBACK VISUAL: TOASTS
  // ==========================================================================

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ==========================================================================
  // FORMULÁRIO DE CONTATO (WHATSAPP INTEGRATION)
  // ==========================================================================

  function handleDemoFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('form-name').value.trim();
    const company = document.getElementById('form-company').value.trim();
    const phone = document.getElementById('form-phone').value.trim();
    const system = document.getElementById('form-system-select').value;
    const message = document.getElementById('form-message').value.trim();

    const text = `Olá TotumFlex! Meu nome é ${name}, da empresa *${company}*.
Gostaria de agendar uma demonstração do sistema: *${system}*.
Telefone para contato: ${phone}
${message ? `Observações adicionais: ${message}` : ''}`;

    const cleanPhone = (siteData.contact.phone || '91993519240').replace(/\D/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`;

    showToast('Redirecionando para o WhatsApp da Flex Informática...', 'success');
    window.open(whatsappUrl, '_blank');
  }

  // ==========================================================================
  // BIND DE EVENTOS DA INTERFACE
  // ==========================================================================

  function bindEvents() {
    // Alternância do Modo Administrador
    const adminToggle = document.getElementById('admin-mode-toggle');
    if (adminToggle) {
      adminToggle.addEventListener('change', (e) => {
        setAdminMode(e.target.checked);
      });
    }

    // Botões de ação da Toolbar
    const btnOpenCms = document.getElementById('btn-open-cms');
    if (btnOpenCms) btnOpenCms.addEventListener('click', () => openCMSModal('tab-geral'));

    const btnSaveChanges = document.getElementById('btn-save-changes');
    if (btnSaveChanges) btnSaveChanges.addEventListener('click', () => saveToStorage(true));

    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) btnExport.addEventListener('click', exportToJson);

    const btnImportTrigger = document.getElementById('btn-import-trigger');
    const fileImportInput = document.getElementById('file-import-json');
    if (btnImportTrigger && fileImportInput) {
      btnImportTrigger.addEventListener('click', () => fileImportInput.click());
      fileImportInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleImportFile(e.target.files[0]);
        }
      });
    }

    const btnReset = document.getElementById('btn-reset-default');
    if (btnReset) btnReset.addEventListener('click', resetToDefault);

    // Botão de Tema
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Modal CMS
    const btnCloseCms = document.getElementById('btn-close-cms');
    if (btnCloseCms) btnCloseCms.addEventListener('click', closeCMSModal);

    const btnModalCancel = document.getElementById('btn-modal-cancel');
    if (btnModalCancel) btnModalCancel.addEventListener('click', closeCMSModal);

    const btnModalSave = document.getElementById('btn-modal-save');
    if (btnModalSave) btnModalSave.addEventListener('click', saveCMSModalData);

    const cmsTabs = document.querySelectorAll('.modal-tab-btn');
    cmsTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = e.currentTarget.getAttribute('data-tab');
        renderCMSTabs(tabId);
      });
    });

    // Modal de Detalhes do Sistema
    const btnCloseDetail = document.getElementById('btn-close-system-detail');
    if (btnCloseDetail) btnCloseDetail.addEventListener('click', closeSystemDetail);

    const btnCloseDetail2 = document.getElementById('btn-system-detail-close');

    // Modal de Edição de Card do Sistema
    
    // Logomarca e Modal de Personalização (Padrão Dash Solutions)
    const brandLogoLink = document.getElementById('brand-logo-link');
    if (brandLogoLink) {
      brandLogoLink.addEventListener('click', (e) => {
        if (isAdminMode) {
          e.preventDefault();
          e.stopPropagation();
          window.openBrandEditorModal();
        }
      });
    }

    const headerBrandEditBtn = document.getElementById('header-brand-edit-btn');
    if (headerBrandEditBtn) {
      headerBrandEditBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.openBrandEditorModal();
      });
    }

    const btnAdminBrandLogo = document.getElementById('btn-admin-brand-logo');
    if (btnAdminBrandLogo) {
      btnAdminBrandLogo.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.openBrandEditorModal();
      });
    }

    const brandEditorModal = document.getElementById('brand-editor-modal') || document.getElementById('brand-logo-modal');
    if (brandEditorModal) {
      brandEditorModal.addEventListener('click', (e) => {
        if (e.target === brandEditorModal) {
          window.closeBrandEditorModal();
        }
      });
    }

    const btnCloseBrandLogo = document.getElementById('btn-close-brand-logo');
    const btnCancelBrandLogo = document.getElementById('btn-cancel-brand-logo');
    const btnSaveBrandLogo = document.getElementById('btn-save-brand-logo');
    const brandLogoModal = document.getElementById('brand-logo-modal');

    if (btnCloseBrandLogo) btnCloseBrandLogo.addEventListener('click', closeBrandEditorModal);
    if (btnCancelBrandLogo) btnCancelBrandLogo.addEventListener('click', closeBrandEditorModal);
    if (btnSaveBrandLogo) btnSaveBrandLogo.addEventListener('click', saveBrandFromForm);
    if (brandLogoModal) {
      brandLogoModal.addEventListener('click', (e) => {
        if (e.target === brandLogoModal) closeBrandEditorModal();
      });
    }

    // Delegação de clique direta no grid de sistemas (Ver detalhes, Editar, Excluir, Adicionar)
    const systemsGrid = document.getElementById('systems-grid');
    if (systemsGrid) {
      systemsGrid.addEventListener('click', (e) => {
        // 1. Ver Detalhes Completos
        const detailBtn = e.target.closest('.card-action-btn');
        if (detailBtn) {
          e.preventDefault();
          e.stopPropagation();
          const card = detailBtn.closest('.system-card');
          const systemId = detailBtn.getAttribute('data-system-id') || card?.getAttribute('data-system-id');
          if (systemId) openSystemDetail(systemId);
          return;
        }

        // 2. Editar Card
        const editBtn = e.target.closest('.admin-card-controls .btn-admin-primary, .btn-edit-card');
        if (editBtn) {
          e.preventDefault();
          e.stopPropagation();
          const card = editBtn.closest('.system-card');
          const systemId = editBtn.getAttribute('data-system-id') || card?.getAttribute('data-system-id');
          if (systemId) openEditSystemModal(systemId);
          return;
        }

        // 3. Excluir Card
        const deleteBtn = e.target.closest('.admin-card-controls .btn-admin-danger, .btn-delete-card');
        if (deleteBtn) {
          e.preventDefault();
          e.stopPropagation();
          const card = deleteBtn.closest('.system-card');
          const systemId = deleteBtn.getAttribute('data-system-id') || card?.getAttribute('data-system-id');
          if (systemId) deleteSystem(systemId);
          return;
        }

        // 4. Adicionar Card
        const addCard = e.target.closest('.system-card-add');
        if (addCard) {
          e.preventDefault();
          e.stopPropagation();
          addNewSystemPrompt();
          return;
        }
      });
    }

    // Controle e navegação dos links do menu
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinksEl = document.getElementById('nav-links-list') || document.querySelector('.nav-links');
    if (mobileBtn && navLinksEl) {
      mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navLinksEl.classList.toggle('mobile-open');
      });
      document.addEventListener('click', (e) => {
        if (!navLinksEl.contains(e.target) && e.target !== mobileBtn) {
          navLinksEl.classList.remove('mobile-open');
        }
      });
      // Fechar menu mobile e atualizar active ao clicar no link
      navLinksEl.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
          navLinksEl.classList.remove('mobile-open');
          navLinksEl.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          this.classList.add('active');
        });
      });

      // ScrollSpy suave para sincronizar o link ativo com a rolagem da página
      const sections = ['hero', 'sistemas', 'diferenciais', 'solucoes', 'empresa', 'contato']
        .map(id => document.getElementById(id))
        .filter(Boolean);
      window.addEventListener('scroll', () => {
        const scrollPos = window.scrollY + 140;
        let currentId = '';
        sections.forEach(sec => {
          if (scrollPos >= sec.offsetTop) {
            currentId = sec.id;
          }
        });
        if (currentId) {
          navLinksEl.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === '#' + currentId) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      }, { passive: true });
    }

    const btnCloseEditSys = document.getElementById('btn-close-edit-system');
    const btnCancelEditSys = document.getElementById('btn-cancel-edit-system');
    const btnSaveEditSys = document.getElementById('btn-save-edit-system');
    const editSysModal = document.getElementById('edit-system-card-modal');

    if (btnCloseEditSys) btnCloseEditSys.addEventListener('click', closeEditSystemModal);
    if (btnCancelEditSys) btnCancelEditSys.addEventListener('click', closeEditSystemModal);
    if (btnSaveEditSys) btnSaveEditSys.addEventListener('click', saveEditedSystem);
    if (editSysModal) {
      editSysModal.addEventListener('click', (e) => {
        if (e.target === editSysModal) closeEditSystemModal();
      });
    }

    if (btnCloseDetail2) btnCloseDetail2.addEventListener('click', closeSystemDetail);

    // Fechar modais ao clicar no backdrop
    const cmsBackdrop = document.getElementById('cms-modal-backdrop');
    if (cmsBackdrop) {
      cmsBackdrop.addEventListener('click', (e) => {
        if (e.target === cmsBackdrop) closeCMSModal();
      });
    }
    const detailBackdrop = document.getElementById('system-detail-modal');
    if (detailBackdrop) {
      detailBackdrop.addEventListener('click', (e) => {
        if (e.target === detailBackdrop) closeSystemDetail();
      });
    }

    // Formulário de Demonstração
    const form = document.getElementById('demo-request-form');
    if (form) form.addEventListener('submit', handleDemoFormSubmit);

    // Alternância do Popover de Paleta de Cores
    const colorPaletteBtn = document.getElementById('color-palette-btn');
    const colorPopover = document.getElementById('color-palette-popover');
    if (colorPaletteBtn && colorPopover) {
      colorPaletteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        colorPopover.classList.toggle('open');
      });

      // Evita fechar ao clicar dentro do popover
      colorPopover.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Fecha popover ao clicar fora
      document.addEventListener('click', () => {
        colorPopover.classList.remove('open');
      });
    }

    // Input de cor customizada livre (sincronização de valores)
    const customColorInput = document.getElementById('custom-color-input');
    const customHexInput = document.getElementById('custom-hex-input');
    const btnApplyCustomColor = document.getElementById('btn-apply-custom-color');

    if (customColorInput && customHexInput) {
      customColorInput.addEventListener('input', (e) => {
        customHexInput.value = e.target.value;
      });

      customHexInput.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
          customColorInput.value = e.target.value;
        }
      });
    }

    if (btnApplyCustomColor && customHexInput) {
      btnApplyCustomColor.addEventListener('click', () => {
        const val = customHexInput.value.trim();
        if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
          applyColorScheme(val, null, 'custom', true);
          saveToStorage(false);
          if (colorPopover) colorPopover.classList.remove('open');
        } else {
          showToast('Formato de cor inválido. Use formato HEX como #00f0ff ou #ff5500', 'warning');
        }
      });
    }

    // Gatilhos de Login do Administrador (Cadeado discreto)
    const btnTopLock = document.getElementById('btn-top-admin-lock');
    if (btnTopLock) btnTopLock.addEventListener('click', openAdminLoginModal);

    const btnNavLock = document.getElementById('btn-nav-admin-lock');
    if (btnNavLock) btnNavLock.addEventListener('click', openAdminLoginModal);

    const btnCloseLogin = document.getElementById('btn-close-login-modal');
    if (btnCloseLogin) btnCloseLogin.addEventListener('click', closeAdminLoginModal);

    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) loginForm.addEventListener('submit', handleAdminLoginForm);

    const btnLogout = document.getElementById('btn-admin-logout');
    if (btnLogout) btnLogout.addEventListener('click', () => setAdminAuthenticated(false, true));

    const loginBackdrop = document.getElementById('admin-login-modal');
    if (loginBackdrop) {
      loginBackdrop.addEventListener('click', (e) => {
        if (e.target === loginBackdrop) closeAdminLoginModal();
      });
    }

    // Atalho de teclado: Ctrl+Shift+A para alternar modo administrador
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!isAdminAuthenticated) {
          openAdminLoginModal();
        } else {
          setAdminMode(!isAdminMode);
        }
      }
    });
  }

  // ==========================================================================
  // INICIALIZAÇÃO NO DOM READY
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', async () => {
    loadInitialData();
    renderAll();
    bindEvents();

    // Sincroniza imediatamente com o servidor para garantir que todos os dispositivos
    // vejam os dados mais recentes do content.json
    await syncContentFromServer();

    // Sincronização multi-dispositivo em tempo real:
    // 1. Quando a janela/aba recebe foco
    window.addEventListener('focus', () => {
      checkServerForUpdates();
    });

    // 2. Quando o usuário desbloqueia o celular ou retorna ao navegador (visibilitychange)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkServerForUpdates();
      }
    });

    // 3. Polling ultraleve em segundo plano a cada 5 segundos (consome apenas ~40 bytes por checagem)
    setInterval(() => {
      checkServerForUpdates();
    }, 5000);


    // Expõe API para chamadas globais (onclick nos botões dinâmicos)
    window.totumApp = {
      openSystemDetail,
      closeSystemDetail,
      openEditSystemModal,
      closeEditSystemModal,
      saveEditedSystem,
      editSystemModal,
      deleteSystem,
      addNewSystemPrompt,
      openBrandEditorModal,
      closeBrandEditorModal,
      openBrandLogoModal: openBrandEditorModal,
      closeBrandLogoModal: closeBrandEditorModal,
      setBrandType,
      saveBrandFromForm,
      saveBrandLogo: saveBrandFromForm,
      saveContentToServer,
      syncContentFromServer,
      renderBrandLogo,
      setAdminMode,
      setAdminAuthenticated,
      openAdminLoginModal,
      closeAdminLoginModal,
      saveToStorage,
      resetToDefault,
      applyColorScheme,
      applyCustomFromCMS: function() {
        const hexEl = document.getElementById('cms-custom-hex-input');
        const colorEl = document.getElementById('cms-custom-color-input');
        const val = (hexEl && hexEl.value.trim()) || (colorEl && colorEl.value) || '#00f0ff';
        applyColorScheme(val, null, 'custom', true);
        saveToStorage(false);
      }
    };

    console.log('Totum Flex Redesign iniciado com sucesso.');
    console.log('Dica: Clique no ícone de cadeado 🔒 para acessar a administração.');
  });

})();
