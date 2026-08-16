/**
 * Anti-SSRF & Safe URL Validation Guard
 * Protects against internal IP leakage and unauthorized loopback requests.
 */

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

module.exports = {
  isSafePublicUrl
};
