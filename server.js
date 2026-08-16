/**
 * NUSANTARA TRAFFIC VISION — SURVEILLANCE PRO
 * Multi-City Indonesian ATCS Edge AI Computer Vision Platform
 * Architect: Adjie Kurniawan (instagram.com/adjie.apk)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { PORT, PUBLIC_DIR, MIME_TYPES, SECURITY_CONFIG } = require('./src/config/server.config');
const { applySecurityHeaders } = require('./src/middleware/security');
const { checkRateLimit } = require('./src/middleware/rateLimiter');
const { handleProxyRoute } = require('./src/routes/proxy');
const { handleHealthRoute } = require('./src/routes/health');

const server = http.createServer((req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Apply enterprise security headers
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rate-limiting check
  if (!checkRateLimit(clientIp, SECURITY_CONFIG.rateLimitMax, SECURITY_CONFIG.rateLimitWindowMs)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded. Please wait.' }));
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }
  const pathname = parsedUrl.pathname;

  // 1. CCTV STATUS API
  if (pathname === '/api/cctv/status') {
    handleHealthRoute(req, res);
    return;
  }

  // 2. PROXY STREAMING ROUTE
  if (pathname === '/proxy' || pathname === '/api/proxy') {
    handleProxyRoute(req, res, parsedUrl);
    return;
  }

  // 3. STATIC FILE SERVER
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception Guard:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection Guard:', reason);
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` NUSANTARA TRAFFIC VISION — SURVEILLANCE PRO`);
  console.log(` Copyright (c) 2026 Adjie Kurniawan (instagram.com/adjie.apk)`);
  console.log(` Server running at: http://localhost:${PORT}`);
  console.log(` Modular Architecture: src/config, src/middleware, src/routes ACTIVE`);
  console.log(`====================================================`);
});
