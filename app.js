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

  // ==========================================================================
  // INICIALIZAÇÃO E CARREGAMENTO DE DADOS
  // ==========================================================================

  function loadInitialData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        siteData = JSON.parse(stored);
      } else {
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
    const savedAuth = sessionStorage.getItem(AUTH_KEY) === 'true';
    setAdminAuthenticated(savedAuth, false);
  }

  function saveToStorage(notify = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(siteData));
      if (notify) {
        showToast('Alterações salvas com sucesso no seu navegador!', 'success');
      }
    } catch (e) {
      console.error('Erro ao salvar no LocalStorage:', e);
      showToast('Erro ao salvar dados localmente.', 'warning');
    }
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
    const topLockIcon = document.getElementById('top-lock-icon');
    const topLockText = document.getElementById('top-lock-text');

    if (auth) {
      body.classList.add('admin-authenticated');
      sessionStorage.setItem(AUTH_KEY, 'true');

      if (navLockIcon) navLockIcon.textContent = '🔓';
      if (topLockIcon) topLockIcon.textContent = '🔓';
      if (topLockText) topLockText.textContent = 'Admin Ativo';

      // Ativa a edição
      setAdminMode(true);

      if (notify) {
        showToast('🔓 Autenticado com sucesso! Comandos de administrador liberados.', 'success');
      }
    } else {
      body.classList.remove('admin-authenticated');
      sessionStorage.removeItem(AUTH_KEY);

      if (navLockIcon) navLockIcon.textContent = '🔒';
      if (topLockIcon) topLockIcon.textContent = '🔒';
      if (topLockText) topLockText.textContent = 'Admin';

      // Desativa a edição
      setAdminMode(false);

      if (notify) {
        showToast('🔒 Sessão administrativa bloqueada. Modo visitante ativo.', 'info');
      }
    }
  }

  function openAdminLoginModal() {
    if (isAdminAuthenticated) {
      const wantLogout = confirm('Você já está autenticado como Administrador.\n\nDeseja BLOQUEAR / SAIR agora?\n(Clique em Cancelar para continuar editando)');
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

  function setAdminMode(active) {
    isAdminMode = active;
    const body = document.body;
    const badge = document.getElementById('admin-status-badge');
    const badgeText = document.getElementById('admin-status-text');
    const toggle = document.getElementById('admin-mode-toggle');

    if (active) {
      body.classList.add('admin-mode-active');
      if (badge) {
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        badge.style.color = '#10b981';
      }
      if (badgeText) badgeText.textContent = 'Modo Administrador (Edição em Tempo Real)';
      if (toggle) toggle.checked = true;
      enableInlineEditing();
      showToast('Modo Administrador ativado! Clique em qualquer texto para editar diretamente.', 'info');
    } else {
      body.classList.remove('admin-mode-active');
      if (badge) {
        badge.style.background = 'rgba(245, 158, 11, 0.12)';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.6)';
        badge.style.color = '#f59e0b';
      }
      if (badgeText) badgeText.textContent = 'Modo Visitante (Visualização)';
      if (toggle) toggle.checked = false;
      disableInlineEditing();
      showToast('Modo de visualização ativado.', 'info');
    }

    renderSystems(); // Re-renderiza para mostrar/ocultar botões de edição nos cards
  }

  function enableInlineEditing() {
    const editables = document.querySelectorAll('[data-bind]');
    editables.forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
      
      // Remove listeners antigos para evitar duplicidade
      el.removeEventListener('input', handleInlineInput);
      el.addEventListener('input', handleInlineInput);
    });
  }

  function disableInlineEditing() {
    const editables = document.querySelectorAll('[data-bind]');
    editables.forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeEventListener('input', handleInlineInput);
    });
  }

  function handleInlineInput(e) {
    const target = e.currentTarget;
    const path = target.getAttribute('data-bind');
    if (!path) return;

    const value = target.innerText.trim();
    setDeepValue(siteData, path, value);
    // Sincroniza em segundo plano sem incomodar o usuário com toast a cada tecla
    localStorage.setItem(STORAGE_KEY, JSON.stringify(siteData));
  }

  // ==========================================================================
  // RENDERIZAÇÃO DA PÁGINA COM DADOS DO STATE
  // ==========================================================================

  function renderStaticBinds() {
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
            <button type="button" class="card-action-btn" onclick="window.totumApp.openSystemDetail('${item.id}')">
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

  function deleteSystem(id) {
    if (!confirm('Deseja realmente remover este sistema do catálogo do site?')) return;
    
    siteData.systemsSection.items = siteData.systemsSection.items.filter(s => s.id !== id);
    saveToStorage(false);
    renderSystems();
    showToast('Sistema removido com sucesso!', 'info');
  }

  function addNewSystemPrompt() {
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
    saveToStorage(false);
    renderSystems();
    showToast(`Sistema "${title}" adicionado com sucesso!`, 'success');
  }

  function editSystemModal(id) {
    const item = siteData.systemsSection.items.find(s => s.id === id);
    if (!item) return;

    openCMSModal('tab-sistemas');
  }

  function openSystemDetail(id) {
    const item = siteData.systemsSection.items.find(s => s.id === id);
    if (!item) return;

    const modal = document.getElementById('system-detail-modal');
    const titleEl = document.getElementById('system-detail-title');
    const bodyEl = document.getElementById('system-detail-body');
    const requestBtn = document.getElementById('btn-system-detail-request');

    titleEl.innerHTML = `<span style="font-size: 1.5rem; margin-right: 8px;">${item.icon || '💻'}</span> ${item.title}`;
    
    bodyEl.innerHTML = `
      <div style="margin-bottom: 16px;">
        <span class="card-badge" style="font-size: 0.75rem;">${item.badge}</span>
      </div>
      <p style="font-size: 1rem; color: var(--text-primary); line-height: 1.7; margin-bottom: 24px;">
        ${item.description || item.summary}
      </p>
      <h4 style="font-size: 0.9375rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin-bottom: 12px;">
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
          // Tenta selecionar ou adiciona como valor
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
              <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button type="button" class="btn-admin btn-admin-danger" onclick="window.totumApp.deleteSystem('${sys.id}')">
                  Excluir Módulo
                </button>
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

  function saveCMSModalData() {
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

    saveToStorage(true);
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

  document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    renderAll();
    bindEvents();

    // Expõe API para chamadas globais (onclick nos botões dinâmicos)
    window.totumApp = {
      openSystemDetail,
      editSystemModal,
      deleteSystem,
      addNewSystemPrompt,
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
