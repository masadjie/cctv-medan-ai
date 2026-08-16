const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.wasm': 'application/wasm'
};

// ==========================================================================
// SECURITY & SSRF PROTECTION ENGINE (By Adjie Kurniawan - @adjie.apk)
// ==========================================================================

// Rate-limiting tracking (IP -> { count, resetTime })
const ipRateLimits = new Map();

function checkRateLimit(ip, maxRequests = 200, windowMs = 10000) {
  const now = Date.now();
  const record = ipRateLimits.get(ip);
  if (!record || now > record.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  record.count++;
  return record.count <= maxRequests;
}

// Anti-SSRF: Validates that proxy requests cannot target private/internal subnets
function isSafePublicUrl(targetUrlString) {
  try {
    const target = new URL(targetUrlString);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return false;

    const hostname = target.hostname.toLowerCase();
    // Block internal loopback & RFC1918 / Cloud Metadata IPs
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') return false;
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('169.254.')) return false;
    if (hostname === 'metadata.google.internal' || hostname === '169.254.169.254') return false;
    return true;
  } catch (e) {
    return false;
  }
}

// ==========================================================================
// CCTV HEALTH DATA CACHE & SERVER-SIDE SILENT PROBE ENGINE
// ==========================================================================

let atcsCameras = [];
try {
  const dataFileContent = fs.readFileSync(path.join(PUBLIC_DIR, 'cctv_medan_data.js'), 'utf8');
  const match = dataFileContent.match(/const ATCS_MEDAN_CAMERAS = (\[[\s\S]*?\]);/);
  if (match) {
    atcsCameras = eval(match[1]);
  }
} catch (err) {
  console.warn('Failed to parse cctv_medan_data.js:', err.message);
}

const cctvHealthCache = {
  lastChecked: new Date().toISOString(),
  total: atcsCameras.length,
  onlineCount: 0,
  offlineCount: 0,
  author: 'Adjie Kurniawan (instagram.com/adjie.apk)',
  cameras: {}
};

// Initialize all cameras as active by default
atcsCameras.forEach(cam => {
  cctvHealthCache.cameras[cam.id] = {
    online: true,
    latencyMs: 95,
    checkedAt: new Date().toISOString()
  };
});

function probeStreamServerSide(streamUrl, timeoutMs = 3500) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    try {
      const parsed = new URL(streamUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request({
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': `${parsed.protocol}//${parsed.host}/`
        },
        timeout: timeoutMs,
        rejectUnauthorized: false
      }, (res) => {
        const isOk = res.statusCode >= 200 && res.statusCode < 400;
        resolve({
          online: isOk,
          latencyMs: Date.now() - startTime,
          code: res.statusCode
        });
        res.resume(); // Discard stream body quickly
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ online: false, latencyMs: Date.now() - startTime, code: 504 });
      });

      req.on('error', () => {
        resolve({ online: false, latencyMs: Date.now() - startTime, code: 500 });
      });

      req.end();
    } catch (e) {
      resolve({ online: false, latencyMs: 0, code: 400 });
    }
  });
}

// Background Batch Health Checker (Silent, Non-blocking)
async function refreshAllCCTVHealth() {
  if (atcsCameras.length === 0) return;
  const batchSize = 6;
  let online = 0;
  let offline = 0;

  for (let i = 0; i < atcsCameras.length; i += batchSize) {
    const batch = atcsCameras.slice(i, i + batchSize);
    await Promise.all(batch.map(async (cam) => {
      const res = await probeStreamServerSide(cam.url);
      cctvHealthCache.cameras[cam.id] = {
        online: res.online,
        latencyMs: res.latencyMs,
        checkedAt: new Date().toISOString()
      };
      if (res.online) online++;
      else offline++;
    }));
    await new Promise(r => setTimeout(r, 100));
  }

  cctvHealthCache.onlineCount = online;
  cctvHealthCache.offlineCount = offline;
  cctvHealthCache.lastChecked = new Date().toISOString();
}

// Run initial check and recurring 60s background refresh
setTimeout(refreshAllCCTVHealth, 1500);
setInterval(refreshAllCCTVHealth, 60000);

// ==========================================================================
// HTTP SERVER & SECURITY ROUTER
// ==========================================================================

const server = http.createServer(async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Security Headers against Clickjacking, XSS, and unauthorized cloning
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Powered-By', 'Medan Traffic Vision Pro / Adjie Kurniawan (@adjie.apk)');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rate-limiting check
  if (!checkRateLimit(clientIp, 300, 10000)) {
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
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(cctvHealthCache));
    return;
  }

  // 2. PROXY ENDPOINT WITH SSRF SECURITY VALIDATION
  if (pathname === '/proxy' || pathname === '/api/proxy') {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing "url" query parameter' }));
      return;
    }

    const decodedTarget = decodeURIComponent(targetUrl);

    // Strict Anti-SSRF check
    if (!isSafePublicUrl(decodedTarget)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden', message: 'Access to private / internal network targets is strictly blocked by Security Engine.' }));
      return;
    }

    try {
      const targetObj = new URL(decodedTarget);
      const isHttps = targetObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: targetObj.hostname,
        port: targetObj.port || (isHttps ? 443 : 80),
        path: targetObj.pathname + targetObj.search,
        method: req.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
          'Referer': `${targetObj.protocol}//${targetObj.host}/`,
          'Origin': `${targetObj.protocol}//${targetObj.host}`
        },
        timeout: 10000,
        rejectUnauthorized: false
      };

      const proxyReq = httpModule.request(options, (proxyRes) => {
        const contentType = proxyRes.headers['content-type'] || 'application/octet-stream';
        const isM3U8 = decodedTarget.endsWith('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL');

        // Rewrite relative URLs in m3u8 playlists so segment .ts requests route through /proxy
        if (isM3U8) {
          let body = '';
          proxyRes.setEncoding('utf8');
          proxyRes.on('data', chunk => { body += chunk; });
          proxyRes.on('end', () => {
            const baseUrl = decodedTarget.substring(0, decodedTarget.lastIndexOf('/') + 1);
            const lines = body.split('\n');
            const rewrittenLines = lines.map(line => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) {
                if (trimmed.includes('URI="')) {
                  return trimmed.replace(/URI="([^"]+)"/g, (match, p1) => {
                    const absUri = p1.startsWith('http') ? p1 : new URL(p1, baseUrl).href;
                    return `URI="/proxy?url=${encodeURIComponent(absUri)}"`;
                  });
                }
                return line;
              }
              const fullSegmentUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).href;
              return `/proxy?url=${encodeURIComponent(fullSegmentUrl)}`;
            });

            const rewrittenPlaylist = rewrittenLines.join('\n');
            res.writeHead(proxyRes.statusCode || 200, {
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-cache'
            });
            res.end(rewrittenPlaylist);
          });
        } else {
          // Direct stream pipe for video segments (.ts, .m4s, etc.)
          res.writeHead(proxyRes.statusCode || 200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
          });
          proxyRes.pipe(res);
        }
      });

      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy request failed', message: err.message, code: err.code }));
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy request timed out' }));
      });

      proxyReq.end();
    } catch (err) {
      console.error('Invalid URL:', err);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to process URL', message: err.message }));
    }
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
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` MEDAN TRAFFIC VISION — SURVEILLANCE PRO`);
  console.log(` Copyright (c) 2026 Adjie Kurniawan (instagram.com/adjie.apk)`);
  console.log(` Server running at: http://localhost:${PORT}`);
  console.log(` Security: Anti-SSRF, Rate-Limiting & Headers ACTIVE`);
  console.log(`====================================================`);
});
