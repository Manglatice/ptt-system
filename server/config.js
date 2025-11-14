// Configuration management with environment variables
import { existsSync, readFileSync } from 'fs';

// Simple .env loader (no external dependencies)
if (existsSync('.env')) {
  try {
    const envFile = readFileSync('.env', 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value && !process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (err) {
    console.warn('Warning: Could not load .env file:', err.message);
  }
}

export const CONFIG = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Heartbeat
  HEARTBEAT_INTERVAL: parseInt(process.env.HEARTBEAT_INTERVAL || '30000', 10),
  HEARTBEAT_TIMEOUT: parseInt(process.env.HEARTBEAT_TIMEOUT || '45000', 10),

  // Security
  CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
  MAX_USERNAME_LENGTH: 20,
  MIN_USERNAME_LENGTH: 2,
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // WebSocket
  WS_MAX_PAYLOAD: 1048576, // 1MB
  WS_PING_INTERVAL: 30000
};

export const isDevelopment = CONFIG.NODE_ENV === 'development';
export const isProduction = CONFIG.NODE_ENV === 'production';
