/**
 * Minimal structured logger. Swap the transport for Winston/Pino later
 * without touching any call sites, since everything goes through this module.
 */
const timestamp = () => new Date().toISOString();

const format = (level, message) => `[${timestamp()}] [${level.toUpperCase()}] ${message}`;

export const logger = {
  info: (message) => console.log(format('info', message)),
  warn: (message) => console.warn(format('warn', message)),
  error: (message) => console.error(format('error', message)),
  debug: (message) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(format('debug', message));
    }
  },
};

export default logger;
