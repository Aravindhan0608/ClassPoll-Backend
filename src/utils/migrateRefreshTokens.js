/**
 * Migration Utility: Cleans up legacy plaintext refresh tokens in MongoDB.
 *
 * In accordance with Stage 2 security architecture, all refresh tokens
 * are now stored as SHA-256 hashes. To prevent token reuse and eliminate
 * plaintext exposure risks, legacy active sessions must be invalidated,
 * prompting users to log in once under the secure hashed architecture.
 *
 * Usage:
 *   node src/utils/migrateRefreshTokens.js
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import User from '../models/User.js';

const migrate = async () => {
  logger.info('Starting refresh token security migration...');
  await mongoose.connect(env.MONGO_URI);

  // Invalidate any existing sessions by unsetting the legacy refreshToken field
  const result = await User.updateMany(
    { refreshToken: { $exists: true, $ne: null } },
    { $unset: { refreshToken: 1, previousRefreshToken: 1, tokenRotatedAt: 1 } }
  );

  logger.info(`Migration complete: ${result.modifiedCount} legacy user session(s) safely invalidated.`);
  logger.info('All users will log in securely with SHA-256 hashed refresh tokens on their next session.');

  await mongoose.disconnect();
};

migrate().catch((err) => {
  logger.error(`Migration failed: ${err.message}`);
  process.exit(1);
});

