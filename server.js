const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3456;
const HOST = '0.0.0.0';
const DIR = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Cabeçalhos CORS e Segurança (Multi-Dispositivo)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqUrl = decodeURI(req.url.split('?')[0]);

  // API Endpoint: Salvar Conteúdo Geral do Site (Sincronização Multi-Dispositivo)
  if (req.method === 'POST' && reqUrl === '/api/save-content') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10000000) { // 10MB max (suporta imagens e logos em base64)
        res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: 'Payload muito grande' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const contentData = JSON.parse(body);
        if (!contentData || typeof contentData !== 'object') {
          throw new Error('Dados de conteúdo inválidos (deve ser um objeto)');
        }

        contentData.updatedAt = new Date().toISOString();
        const contentFilePath = path.join(DIR, 'content.json');
        fs.writeFileSync(contentFilePath, JSON.stringify(contentData, null, 2), 'utf-8');
        
        console.log(`[CMS] Conteúdo salvo com sucesso em content.json (${new Date().toLocaleTimeString()})`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, updatedAt: contentData.updatedAt }));
      } catch (err) {
        console.error('[CMS] Erro ao salvar conteúdo do site:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API Endpoint: Obter Versão/Timestamp do Conteúdo (Polling Ultraleve para Multi-Dispositivo)
  if (req.method === 'GET' && reqUrl === '/api/content-version') {
    const contentFilePath = path.join(DIR, 'content.json');
    if (fs.existsSync(contentFilePath)) {
      try {
        const stats = fs.statSync(contentFilePath);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(JSON.stringify({
          mtime: stats.mtimeMs,
          size: stats.size
        }));
        return;
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: e.message }));
        return;
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'content.json not found' }));
      return;
    }
  }

  // API Endpoint: Obter Conteúdo Sincronizado
  if (req.method === 'GET' && (reqUrl === '/api/content' || reqUrl === '/content.json')) {
    const contentFilePath = path.join(DIR, 'content.json');
    if (fs.existsSync(contentFilePath)) {
      const data = fs.readFileSync(contentFilePath, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(data);
      return;
    }
  }

  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = '/index.html';
  }

  const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(DIR, safePath);

  if (!fs.existsSync(filePath)) {
    if (!path.extname(filePath)) {
      const indexPath = path.join(DIR, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 - Arquivo não encontrado');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  const isDynamicJson = ['content.json', 'theme.json'].includes(path.basename(filePath));
  const cacheControl = isDynamicJson
    ? 'no-cache, no-store, must-revalidate'
    : 'no-cache';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log('🚀 TotumFlex Servidor Ativo (Sincronização Multi-Dispositivo)!');
  console.log('----------------------------------------------------');
  console.log(`📍 Local (nesta máquina): http://localhost:${PORT}`);

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`🌐 Rede interna (${name}): http://${iface.address}:${PORT}`);
      }
    }
  }
  console.log('====================================================');
});
