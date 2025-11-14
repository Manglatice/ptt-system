// Input validation and sanitization utilities
import { CONFIG } from './config.js';

/**
 * Validate username
 * - Must be alphanumeric with optional hyphens and underscores
 * - Length between MIN and MAX
 * - No path traversal attempts
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < CONFIG.MIN_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${CONFIG.MIN_USERNAME_LENGTH} characters`
    };
  }

  if (trimmed.length > CONFIG.MAX_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `Username must be no more than ${CONFIG.MAX_USERNAME_LENGTH} characters`
    };
  }

  if (!CONFIG.USERNAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, hyphens, and underscores'
    };
  }

  // Check for path traversal attempts
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid username format'
    };
  }

  // Reserved names
  const reserved = ['admin', 'root', 'system', 'null', 'undefined', 'api', 'server'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return {
      valid: false,
      error: 'Username is reserved'
    };
  }

  return { valid: true, username: trimmed };
}

/**
 * Validate status
 */
export function validateStatus(status) {
  const validStatuses = ['online', 'busy', 'away'];

  if (!status || typeof status !== 'string') {
    return { valid: false, error: 'Status is required' };
  }

  if (!validStatuses.includes(status.toLowerCase())) {
    return {
      valid: false,
      error: `Status must be one of: ${validStatuses.join(', ')}`
    };
  }

  return { valid: true, status: status.toLowerCase() };
}

/**
 * Sanitize string output to prevent XSS
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';

  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate JSON payload size
 */
export function validatePayloadSize(data, maxSize = 10240) { // 10KB default
  const size = Buffer.byteLength(JSON.stringify(data));

  if (size > maxSize) {
    return {
      valid: false,
      error: `Payload too large (${size} bytes, max ${maxSize} bytes)`
    };
  }

  return { valid: true };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map(); // ip -> [timestamps]
  }

  check(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create request log for this identifier
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const requestLog = this.requests.get(identifier);

    // Remove old requests outside the window
    const recentRequests = requestLog.filter(timestamp => timestamp > windowStart);
    this.requests.set(identifier, recentRequests);

    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil((recentRequests[0] + this.windowMs - now) / 1000)
      };
    }

    // Add current request
    recentRequests.push(now);

    return {
      allowed: true,
      remaining: this.maxRequests - recentRequests.length,
      resetIn: Math.ceil(this.windowMs / 1000)
    };
  }

  clear() {
    this.requests.clear();
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(t => t > windowStart);
      if (recent.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recent);
      }
    }
  }
}
