import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const httpServer = http.createServer(app);
initSocket(httpServer);

const start = async () => {
  await connectDB();

  httpServer.listen(env.PORT, () => {
    logger.info(`ClassPoll+ API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

start();

// Guard rails: never let the process die silently in production.
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
