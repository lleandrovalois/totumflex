# 📘 Manual de Implantação e Operação — Totum Flex

**Versão do Documento:** 1.0  
**Data:** Outubro de 2026  
**Produto:** Totum Flex — Plataforma Institucional & Painel CMS Integrado  
**Destinatário:** Equipe Técnica / Administradores / Cliente Final  

---

## 1. 📌 Visão Geral da Solução

O **Totum Flex** foi desenvolvido sobre uma arquitetura web moderna, leve e ultra-otimizada (*Static Web Architecture*). 

### Destaques Técnicos:
* **Zero dependência de bancos de dados externos pesados (SQL/NoSQL) no servidor:** todo o conteúdo é renderizado instantaneamente no navegador do usuário.
* **Segurança e Alta Velocidade:** por ser estático na entrega e dinâmico na execução, o site é imune a vulnerabilidades clássicas de injeção SQL no servidor web e atinge tempo de carregamento quase instantâneo.
* **Painel CMS & Edição em Tempo Real (WYSIWYG):** permite alterar textos, módulos, paleta de cores, telefones e links sem necessidade de alterar códigos manualmente, com persistência e suporte a backup em JSON.

---

## 2. 📂 Estrutura de Arquivos da Entrega

Ao receber o pacote do sistema, a estrutura conterá os seguintes arquivos:

| Arquivo / Pasta | Finalidade |
| :--- | :--- |
| `index.html` | Estrutura principal da página, metatags SEO e modais administrativos. |
| `style.css` | Folha de estilo, design system, paletas de cores, temas Dark/Light e responsividade. |
| `app.js` | Controlador lógico, modo administrador, autenticação, edição em tempo real e persistência. |
| `data.js` | Base de dados inicial (conteúdo, telefones, serviços, depoimentos e contatos). |
| `server.js` | Servidor HTTP leve para execução em rede local, intranet ou VPS com Node.js (opcional). |
| `README.md` | Documentação técnica resumida. |

---

## 3. ⚙️ Requisitos de Infraestrutura

O Totum Flex é compatível com praticamente **qualquer ambiente de hospedagem** do mercado:

* **Hospedagem Web Padrão:** Qualquer servidor que sirva arquivos estáticos (Apache, Nginx, IIS, cPanel, Plesk, HostGator, Locaweb, KingHost, UOL Host, etc.).
* **Plataformas Cloud / Edge:** Vercel, Netlify, Cloudflare Pages, AWS S3 + CloudFront, Firebase Hosting.
* **Ambiente On-Premise / Servidor Local / Intranet:** Servidor Windows ou Linux com Node.js (v18+) ou IIS / Nginx.
* **Protocolo Recomendado:** HTTPS com certificado SSL ativo (Let's Encrypt gratuito ou certificado do domínio).

---

## 4. 🚀 Guia de Implantação (Passo a Passo)

Escolha o método mais adequado para o cenário do seu cliente:

### Opção A: Hospedagem Tradicional / cPanel (Método Mais Comum)

Este é o método indicado para provedores como HostGator, Locaweb, Hostinger, KingHost ou servidores com **cPanel**:

1. Acesse o painel da hospedagem (ex: `seudominio.com.br/cpanel`).
2. Abra o **Gerenciador de Arquivos** (ou conecte via cliente **FTP/SFTP** como FileZilla).
3. Navegue até a pasta raiz do site (geralmente chamada de `public_html` ou `www`).
4. Faça o upload dos seguintes arquivos:
   * `index.html`
   * `style.css`
   * `app.js`
   * `data.js`
   *(Observação: a pasta ou imagens auxiliares, caso existam, devem ser enviadas no mesmo diretório).*
5. Certifique-se de que as permissões de leitura dos arquivos estejam definidas como padrão (`644` para arquivos).
6. Acesse o domínio no navegador (`https://www.seudominio.com.br`) para validar o funcionamento.

---

### Opção B: Servidor Próprio / VPS / Intranet (Linux ou Windows com Node.js)

Indicado se o cliente for rodar o site em servidor próprio com o `server.js` integrado:

1. **Instalação do Node.js:**  
   Certifique-se de ter o [Node.js](https://nodejs.org/) instalado (versão 18 ou superior).
2. **Cópia dos arquivos:**  
   Copie a pasta completa do projeto para o diretório de destino do servidor (ex: `/var/www/totumflex` no Linux ou `C:\inetpub\totumflex` no Windows).
3. **Execução contínua em produção com PM2 (Recomendado para Linux/Windows Server):**
   ```bash
   # Instalar o gerenciador de processos PM2 globalmente
   npm install -g pm2

   # Iniciar o servidor Totum Flex
   pm2 start server.js --name "totumflex"

   # Configurar para reiniciar automaticamente caso o servidor reinicie
   pm2 startup
   pm2 save
   ```
4. **Liberação de Firewall:**  
   Abra a porta configurada (padrão `3456`) no Firewall do sistema operacional para acesso via rede interna ou configure um proxy reverso no **Nginx/IIS** apontando para a porta 80/443.

---

### Opção C: Plataformas Cloud Modernas (Vercel / Netlify / Cloudflare Pages)

Caso deseje hospedagem de altíssima escala com CDN global e SSL automático:

1. Crie uma conta no provedor escolhido (ex: [Vercel](https://vercel.com) ou [Netlify](https://netlify.com)).
2. Faça o upload da pasta do projeto ou conecte ao repositório Git.
3. Defina o diretório raiz como o diretório do projeto (não requer comando de build).
4. O site será publicado instantaneamente com HTTPS configurado.

---

## 5. 🔒 Checklist Obrigatório Antes de Ir para Produção

Antes de entregar as chaves ao cliente final, execute os passos abaixo:

### 1. Alteração da Senha Padrão de Administrador
No arquivo `app.js`, localize a verificação de login (linha aproximada 317):
```javascript
// Substitua pelas credenciais definitivas do cliente:
if (username === 'admin' && (password === 'SUA_NOVA_SENHA_AQUI')) {
```
> [!IMPORTANT]
> No arquivo `index.html`, remova ou personalize a dica visual que exibe a senha padrão dentro do modal de login (`#adminModal`).

### 2. Validação dos Links de Contato e WhatsApp
Verifique no arquivo `data.js` (ou através do próprio painel administrativo no navegador) se os seguintes dados estão corretos:
* Número do WhatsApp com DDI e DDD (ex: `5591993519240`).
* Telefones fixos e e-mails de atendimento.
* Endereço físico da empresa.

---

## 6. 🖥️ Manual de Operação para o Cliente (Modo Administrador)

O Totum Flex possui um **Gerenciador de Conteúdo Visual Integrado (CMS)**.

### Como Acessar a Área Administrativa:
1. Acesse o site no navegador.
2. Clique no ícone de cadeado (`🔒`) localizado no canto superior/inferior da tela ou utilize o atalho de teclado:  
   👉 **`Ctrl + Shift + A`**
3. Digite o usuário e a senha cadastrados.

### O que o Administrador pode fazer:
* **Edição Direta na Tela (WYSIWYG):**  
  Ao estar autenticado, passe o mouse e clique sobre qualquer título, parágrafo ou número de estatística para editá-lo diretamente.
* **Painel CMS Completo:**  
  Permite adicionar, remover ou editar módulos de software, depoimentos e diferenciais.
* **Personalização de Cores e Identidade:**  
  Alterne entre 8 paletas corporativas prontas ou use o seletor livre (*Color Picker*) para adequar à marca exata da empresa.

### Política de Backup e Segurança dos Dados:
* Todas as alterações feitas são salvas automaticamente no armazenamento local do navegador.
* **Exportar Backup (JSON):** Na barra superior de administração, clique no botão **"Exportar JSON"** para salvar uma cópia de segurança de todos os dados do site.
* **Restaurar Backup (JSON):** Caso precise transferir as edições para outro computador ou restaurar o conteúdo, basta clicar em **"Importar JSON"** e carregar o arquivo exportado.

---

## 7. 🛠️ Perguntas Frequentes & Suporte (FAQ)

**1. O site precisa de suporte a PHP ou banco de dados MySQL?**  
Não. O Totum Flex foi concebido com tecnologia estática inteligente, o que reduz custos de hospedagem a praticamente zero e elimina necessidade de atualizações complexas de banco de dados.

**2. As edições feitas no painel por um computador aparecem para os clientes?**  
Quando os dados forem consolidados pelo administrador, recomenda-se clicar em **"Exportar JSON"** e salvar o arquivo como a base oficial (`data.js`) para que todos os visitantes visualizem as novas informações por padrão.

**3. O site é responsivo para dispositivos móveis?**  
Sim, a interface é 100% responsiva e adapta-se automaticamente a smartphones, tablets, notebooks e monitores ultrawide.

---

**Suporte Técnico & Desenvolvimento:**  
Totum Flex / Flex Informática  
Belém - PA
