import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { CONFIG } from './config.js';
import { validateUsername, validateStatus, RateLimiter } from './validation.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const USERS_DIR = join(ROOT_DIR, 'users');
const PUBLIC_DIR = join(ROOT_DIR, 'public');

// Ensure users directory exists
if (!existsSync(USERS_DIR)) {
  mkdirSync(USERS_DIR, { recursive: true });
  logger.info('Created users directory', { path: USERS_DIR });
}

// Rate limiters
const apiRateLimiter = new RateLimiter(CONFIG.RATE_LIMIT_WINDOW, CONFIG.RATE_LIMIT_MAX_REQUESTS);
const wsRateLimiter = new RateLimiter(10000, 50); // 50 messages per 10 seconds for WS

// Cleanup rate limiters every 5 minutes
setInterval(() => {
  apiRateLimiter.cleanup();
  wsRateLimiter.cleanup();
}, 300000);

// MIME types for static file serving
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
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json'
};

// Connected users: Map<userId, {ws, username, lastHeartbeat, status, ip}>
const connectedUsers = new Map();

// User management functions
function getUserFilePath(username) {
  return join(USERS_DIR, `${username}.json`);
}

function userExists(username) {
  try {
    return existsSync(getUserFilePath(username));
  } catch (err) {
    logger.error('Error checking user existence', err);
    return false;
  }
}

function createUser(username) {
  try {
    const userData = {
      username,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    writeFileSync(getUserFilePath(username), JSON.stringify(userData, null, 2));
    logger.success('User created', { username });
    return userData;
  } catch (err) {
    logger.error('Error creating user', err);
    throw new Error('Failed to create user');
  }
}

function getUser(username) {
  try {
    if (!userExists(username)) return null;
    const data = readFileSync(getUserFilePath(username), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    logger.error('Error reading user', err);
    return null;
  }
}

function updateUserLogin(username) {
  try {
    const user = getUser(username);
    if (user) {
      user.lastLogin = new Date().toISOString();
      writeFileSync(getUserFilePath(username), JSON.stringify(user, null, 2));
    }
  } catch (err) {
    logger.error('Error updating user login', err);
  }
}

function getAllUsers() {
  try {
    const files = readdirSync(USERS_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (err) {
    logger.error('Error reading users directory', err);
    return [];
  }
}

// WebSocket message broadcasting
function broadcast(message, excludeUserId = null) {
  const messageStr = JSON.stringify(message);
  connectedUsers.forEach((client, userId) => {
    if (userId !== excludeUserId && client.ws.readyState === 1) {
      try {
        client.ws.send(messageStr);
      } catch (err) {
        logger.error('Error broadcasting to user', { userId, error: err.message });
      }
    }
  });
}

function sendToUser(userId, message) {
  const client = connectedUsers.get(userId);
  if (client && client.ws.readyState === 1) {
    try {
      client.ws.send(JSON.stringify(message));
    } catch (err) {
      logger.error('Error sending to user', { userId, error: err.message });
    }
  }
}

function getOnlineUsers() {
  const users = [];
  connectedUsers.forEach((client, userId) => {
    users.push({
      userId,
      username: client.username,
      status: client.status
    });
  });
  return users;
}

// Security headers
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (CONFIG.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

// Get client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         'unknown';
}

// HTTP Server
const httpServer = createServer((req, res) => {
  setSecurityHeaders(res);

  const clientIp = getClientIp(req);

  // Handle API endpoints
  if (req.url.startsWith('/api/')) {
    // Rate limiting
    const rateLimit = apiRateLimiter.check(clientIp);
    res.setHeader('X-RateLimit-Limit', CONFIG.RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetIn);

    if (!rateLimit.allowed) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Too many requests',
        resetIn: rateLimit.resetIn
      }));
      logger.warn('Rate limit exceeded', { ip: clientIp, endpoint: req.url });
      return;
    }

    res.setHeader('Content-Type', 'application/json');

    // POST /api/register
    if (req.url === '/api/register' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
        // Prevent large payloads
        if (body.length > 1024) {
          res.writeHead(413);
          res.end(JSON.stringify({ error: 'Payload too large' }));
          req.connection.destroy();
        }
      });

      req.on('end', () => {
        try {
          const { username } = JSON.parse(body);

          // Validate username
          const validation = validateUsername(username);
          if (!validation.valid) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: validation.error }));
            return;
          }

          const validUsername = validation.username;

          if (userExists(validUsername)) {
            res.writeHead(409);
            res.end(JSON.stringify({ error: 'Username already exists' }));
            return;
          }

          const user = createUser(validUsername);
          res.writeHead(201);
          res.end(JSON.stringify({ success: true, user }));
        } catch (err) {
          logger.error('Registration error', err);
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    // POST /api/login
    if (req.url === '/api/login' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
        if (body.length > 1024) {
          res.writeHead(413);
          res.end(JSON.stringify({ error: 'Payload too large' }));
          req.connection.destroy();
        }
      });

      req.on('end', () => {
        try {
          const { username } = JSON.parse(body);

          // Validate username
          const validation = validateUsername(username);
          if (!validation.valid) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: validation.error }));
            return;
          }

          const validUsername = validation.username;

          if (!userExists(validUsername)) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'User not found' }));
            return;
          }

          const user = getUser(validUsername);
          if (!user) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Error loading user' }));
            return;
          }

          updateUserLogin(validUsername);

          res.writeHead(200);
          res.end(JSON.stringify({ success: true, user }));
          logger.info('User logged in', { username: validUsername, ip: clientIp });
        } catch (err) {
          logger.error('Login error', err);
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    // GET /api/users
    if (req.url === '/api/users' && req.method === 'GET') {
      const users = getAllUsers();
      res.writeHead(200);
      res.end(JSON.stringify({ users }));
      return;
    }

    // 404 for unknown API routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Serve static files
  let filePath = join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    logger.warn('Directory traversal attempt', { ip: clientIp, url: req.url });
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Try index.html for SPA routing
      if (ext === '') {
        try {
          const indexPath = join(PUBLIC_DIR, 'index.html');
          const content = readFileSync(indexPath);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
          return;
        } catch {
          // Fall through to 404
        }
      }
      res.writeHead(404);
      res.end('Not found');
    } else {
      logger.error('Error serving file', err);
      res.writeHead(500);
      res.end('Server error');
    }
  }
});

// WebSocket Server
const wss = new WebSocketServer({
  server: httpServer,
  maxPayload: CONFIG.WS_MAX_PAYLOAD
});

wss.on('connection', (ws, req) => {
  const clientIp = getClientIp(req);
  let userId = null;
  let messageCount = 0;

  logger.ws('New WebSocket connection', { ip: clientIp });

  ws.on('message', (data) => {
    messageCount++;

    // Rate limiting for WebSocket messages
    const rateLimit = wsRateLimiter.check(clientIp);
    if (!rateLimit.allowed) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Too many messages, please slow down'
      }));
      logger.warn('WS rate limit exceeded', { ip: clientIp });
      return;
    }

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'auth': {
          // Validate username
          const validation = validateUsername(message.username);
          if (!validation.valid) {
            ws.send(JSON.stringify({ type: 'error', error: validation.error }));
            ws.close(1008, validation.error);
            return;
          }

          const validUsername = validation.username;

          if (!userExists(validUsername)) {
            ws.send(JSON.stringify({ type: 'error', error: 'User not found' }));
            ws.close(1008, 'User not found');
            return;
          }

          // Check if user already connected
          if (connectedUsers.has(validUsername)) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'User already connected from another device'
            }));
            ws.close(1008, 'Already connected');
            return;
          }

          userId = validUsername;
          connectedUsers.set(userId, {
            ws,
            username: validUsername,
            lastHeartbeat: Date.now(),
            status: 'online',
            ip: clientIp
          });

          updateUserLogin(validUsername);

          ws.send(JSON.stringify({
            type: 'auth_success',
            userId,
            username: validUsername,
            onlineUsers: getOnlineUsers()
          }));

          broadcast({
            type: 'user_joined',
            userId,
            username: validUsername
          }, userId);

          logger.success('User authenticated', { username: validUsername, ip: clientIp });
          break;
        }

        case 'heartbeat': {
          if (userId && connectedUsers.has(userId)) {
            connectedUsers.get(userId).lastHeartbeat = Date.now();
            ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
          }
          break;
        }

        case 'status_change': {
          if (!userId || !connectedUsers.has(userId)) {
            ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
            return;
          }

          const statusValidation = validateStatus(message.status);
          if (!statusValidation.valid) {
            ws.send(JSON.stringify({ type: 'error', error: statusValidation.error }));
            return;
          }

          connectedUsers.get(userId).status = statusValidation.status;
          broadcast({
            type: 'user_status_changed',
            userId,
            status: statusValidation.status
          });

          logger.debug('User status changed', { userId, status: statusValidation.status });
          break;
        }

        case 'signal': {
          // WebRTC signaling relay
          if (!userId) {
            ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
            return;
          }

          const { targetUserId, signal } = message;
          if (!targetUserId || !signal) {
            ws.send(JSON.stringify({ type: 'error', error: 'Invalid signal message' }));
            return;
          }

          sendToUser(targetUserId, {
            type: 'signal',
            fromUserId: userId,
            signal
          });

          logger.debug('Signal relayed', { from: userId, to: targetUserId });
          break;
        }

        default:
          logger.debug('Unknown message type', { type: message.type });
          ws.send(JSON.stringify({ type: 'error', error: 'Unknown message type' }));
      }
    } catch (err) {
      logger.error('Message handling error', err);
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
    }
  });

  ws.on('close', (code, reason) => {
    if (userId && connectedUsers.has(userId)) {
      const username = connectedUsers.get(userId).username;
      connectedUsers.delete(userId);

      broadcast({
        type: 'user_left',
        userId,
        username
      });

      logger.info('User disconnected', {
        username,
        code,
        reason: reason.toString(),
        messages: messageCount
      });
    }
  });

  ws.on('error', (err) => {
    logger.error('WebSocket error', { ip: clientIp, error: err.message });
  });

  ws.on('pong', () => {
    if (userId && connectedUsers.has(userId)) {
      connectedUsers.get(userId).lastHeartbeat = Date.now();
    }
  });
});

// Heartbeat checker - runs every 15 seconds
setInterval(() => {
  const now = Date.now();
  const toRemove = [];

  connectedUsers.forEach((client, userId) => {
    if (now - client.lastHeartbeat > CONFIG.HEARTBEAT_TIMEOUT) {
      logger.info('User heartbeat timeout', { username: client.username });
      toRemove.push(userId);
    }
  });

  toRemove.forEach(userId => {
    const client = connectedUsers.get(userId);
    if (client) {
      try {
        client.ws.close(1000, 'Heartbeat timeout');
      } catch (err) {
        logger.error('Error closing connection', err);
      }
      connectedUsers.delete(userId);
      broadcast({
        type: 'user_left',
        userId,
        username: client.username
      });
    }
  });

  // Send ping to all connected clients
  connectedUsers.forEach((client) => {
    if (client.ws.readyState === 1) {
      try {
        client.ws.ping();
      } catch (err) {
        logger.error('Error sending ping', err);
      }
    }
  });
}, 15000);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');

  connectedUsers.forEach((client) => {
    try {
      client.ws.close(1000, 'Server shutting down');
    } catch (err) {
      logger.error('Error closing connection during shutdown', err);
    }
  });

  httpServer.close(() => {
    logger.success('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.warn('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.emit('SIGTERM');
});

// Start server
httpServer.listen(CONFIG.PORT, () => {
  logger.success(`PTT Server running on http://localhost:${CONFIG.PORT}`);
  logger.info('Configuration', {
    environment: CONFIG.NODE_ENV,
    heartbeatInterval: CONFIG.HEARTBEAT_INTERVAL,
    heartbeatTimeout: CONFIG.HEARTBEAT_TIMEOUT,
    usersDirectory: USERS_DIR
  });
});
