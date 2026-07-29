import { config, validateEnv } from "./config/env.config";
import {
  testDatabaseConnection,
  disconnectDatabase,
} from "./config/database.config";
import { EmailService } from "./services/email.service";
import { SeedService } from "./services/seed.service";
import { getRedisClient } from "./config/redis.config";

export async function initializeServices(): Promise<void> {
  validateEnv();

  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    throw new Error("Failed to connect to database");
  }

  const emailConnected = await EmailService.testConnection();
  if (!emailConnected) {
    console.warn("⚠️  Email service not connected. Email features may not work.");
  }

  getRedisClient();
  await SeedService.runSeed();
}

export async function shutdownServices(): Promise<void> {
  await disconnectDatabase();
  const redis = getRedisClient();
  if (redis) await redis.quit();
}
