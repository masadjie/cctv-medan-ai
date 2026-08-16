/**
 * Nusantara Traffic Vision - Server Configuration
 * Architect: Adjie Kurniawan (instagram.com/adjie.apk)
 */

const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

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

const SECURITY_CONFIG = {
  rateLimitMax: 200,
  rateLimitWindowMs: 10000,
  proxyTimeoutMs: 7000,
  corsOrigins: '*'
};

module.exports = {
  PORT,
  PUBLIC_DIR,
  MIME_TYPES,
  SECURITY_CONFIG
};
