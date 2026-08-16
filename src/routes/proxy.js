/**
 * High-Performance Safe CCTV HLS Proxy Route
 * Features:
 * - Anti-SSRF URL Validation
 * - M3U8 Playlist URL rewriting for segment relaying
 * - Connection pooling and automatic error fallback
 */

const http = require('http');
const https = require('https');
const { isSafePublicUrl } = require('../utils/ssrfGuard');
const { SECURITY_CONFIG } = require('../config/server.config');

function handleProxyRoute(req, res, parsedUrl) {
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
    res.end(JSON.stringify({
      error: 'Forbidden',
      message: 'Access to private / internal network targets is strictly blocked by Security Engine.'
    }));
    return;
  }

  try {
    const targetObj = new URL(decodedTarget);
    const isHttps = targetObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const isJogja = targetObj.hostname.includes('jogjakota.go.id');
    const isMedan = targetObj.hostname.includes('medan.go.id');

    const options = {
      hostname: targetObj.hostname,
      port: targetObj.port || (isHttps ? 443 : 80),
      path: targetObj.pathname + targetObj.search,
      method: req.method,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': isJogja ? 'https://cctv.jogjakota.go.id/' : (isMedan ? 'https://atcsdishub.medan.go.id/' : `${targetObj.protocol}//${targetObj.host}/`),
        'Origin': isJogja ? 'https://cctv.jogjakota.go.id' : (isMedan ? 'https://atcsdishub.medan.go.id' : `${targetObj.protocol}//${targetObj.host}`)
      },
      timeout: SECURITY_CONFIG.proxyTimeoutMs || 10000,
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
    console.error('Invalid Proxy URL:', err);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to process URL', message: err.message }));
  }
}

module.exports = {
  handleProxyRoute
};
