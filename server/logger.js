// Simple logger utility
import { isDevelopment } from './config.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function timestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, data = null) {
  const ts = timestamp();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${ts}] ${level}: ${message}${dataStr}`;
}

export const logger = {
  info(message, data) {
    const msg = formatMessage('INFO', message, data);
    console.log(`${colors.cyan}${msg}${colors.reset}`);
  },

  success(message, data) {
    const msg = formatMessage('SUCCESS', message, data);
    console.log(`${colors.green}${msg}${colors.reset}`);
  },

  warn(message, data) {
    const msg = formatMessage('WARN', message, data);
    console.warn(`${colors.yellow}${msg}${colors.reset}`);
  },

  error(message, error) {
    const msg = formatMessage('ERROR', message, error?.message || error);
    console.error(`${colors.red}${msg}${colors.reset}`);

    if (isDevelopment && error?.stack) {
      console.error(`${colors.red}${error.stack}${colors.reset}`);
    }
  },

  debug(message, data) {
    if (isDevelopment) {
      const msg = formatMessage('DEBUG', message, data);
      console.log(`${colors.magenta}${msg}${colors.reset}`);
    }
  },

  ws(message, data) {
    if (isDevelopment) {
      const msg = formatMessage('WS', message, data);
      console.log(`${colors.blue}${msg}${colors.reset}`);
    }
  }
};
