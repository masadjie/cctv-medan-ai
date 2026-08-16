/**
 * In-Memory IP Token Bucket Rate Limiter
 * Guards endpoints against denial-of-service and brute force requests.
 */

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

module.exports = {
  checkRateLimit
};
