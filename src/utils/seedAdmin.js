/**
 * Manually seeds the single Admin account directly into MongoDB.
 * Run once via: npm run seed:admin
 * Admin has no public registration route by design (see project spec).
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import User from '../models/User.js';

const seedAdmin = async () => {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    logger.error('ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — aborting seed.');
    process.exit(1);
  }

  await mongoose.connect(env.MONGO_URI);

  const existing = await User.findOne({ email: env.ADMIN_EMAIL });
  if (existing) {
    logger.info(`Admin already exists for ${env.ADMIN_EMAIL} — nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  await User.create({
    name: env.ADMIN_NAME || 'Super Admin',
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD, // hashed automatically by the User pre-save hook
    role: 'admin',
  });

  logger.info(`Admin account created for ${env.ADMIN_EMAIL}. Rotate ADMIN_PASSWORD now.`);
  await mongoose.disconnect();
};

seedAdmin().catch((err) => {
  logger.error(`Admin seed failed: ${err.message}`);
  process.exit(1);
});
