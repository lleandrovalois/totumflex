# Totum Flex - Redesign Moderno & Painel CMS Integrado

Redesign moderno da plataforma institucional da **Totum Flex / Flex Informática** (Belém - PA), com arquitetura web leve, foco em conversão B2B, modo administrador embutido com autenticação por cadeado e suporte à edição total de conteúdo e cores em tempo real.

---

## 🚀 Principais Funcionalidades

- **Design System Enterprise SaaS:**
  - Interface fluida com modo escuro (*Dark Mode*) e modo claro (*Light Mode*).
  - Componentes com *glassmorphism*, iluminação ambiente e tipografia moderna (*Plus Jakarta Sans*).
- **Personalização Dinâmica de Cores:**
  - 8 paletas prontas com 1 clique (Ciano Tech, Azul Corporativo, Esmeralda, Roxo, Âmbar, Carmim, Aqua e Índigo).
  - Seletor de cor livre (*Color Picker* nativo + código HEX) com recálculo automático de gradientes e contrastes.
- **Modo Administrador Protegido por Cadeado (`🔒`):**
  - Para visitantes, o site é 100% limpo, exibindo apenas um cadeado discreto.
  - Ao clicar no cadeado ou usar `Ctrl + Shift + A`, abre-se o modal de login.
  - Credenciais de demonstração: `admin` / `admin123`.
- **Edição em Tempo Real (WYSIWYG):**
  - Uma vez autenticado, todos os títulos, descrições, números de estatísticas e dados de contato tornam-se editáveis diretamente na tela.
  - Adição, edição e exclusão de módulos/sistemas (CRUD dinâmico).
- **Painel CMS Estruturado:**
  - Modal com abas para gerenciamento detalhado de cada seção.
- **Persistência & Backup:**
  - Dados salvos em `localStorage` e na sessão.
  - Botões para **Exportar JSON** (backup) e **Importar JSON** (restauração).
- **Integração WhatsApp:**
  - Formulário com redirecionamento direto para o WhatsApp oficial com dados pré-formatados.

---

## 📂 Estrutura de Arquivos

```
totumflex-redesign/
├── index.html       # Estrutura HTML5 semântica e acessível
├── style.css        # Folha de estilo com tokens de design e temas
├── app.js           # Controlador JavaScript reativo e modo admin
├── data.js          # Dados padrão estruturados do Totum Flex
├── server.js        # Servidor HTTP local leve
├── .gitignore       # Arquivos ignorados pelo controle de versão
└── README.md        # Documentação do projeto
```

---

## 🛠️ Como Executar Localmente

Caso queira rodar localmente com Node.js:

```bash
# Iniciar o servidor local
node server.js
```

Acesse no navegador:
👉 `http://localhost:3456`

---

## 🔐 Acesso Administrativo
- **Usuário:** `admin`
- **Senha:** `admin123`
