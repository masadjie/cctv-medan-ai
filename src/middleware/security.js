/**
 * HTTP Security Headers & Attribution Engine
 * Architect: Adjie Kurniawan (instagram.com/adjie.apk)
 */

function applySecurityHeaders(res) {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, User-Agent');
  res.setHeader('X-Powered-By', 'Nusantara-Traffic-Vision/1.0.0-PRO (Adjie Kurniawan)');
}

module.exports = {
  applySecurityHeaders
};
