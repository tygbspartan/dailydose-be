import app from "./app";
import { config, validateEnv } from "./config/env.config";
import {
  testDatabaseConnection,
  disconnectDatabase,
} from "./config/database.config";
import { EmailService } from "./services/email.service";
import { SeedService } from "./services/seed.service";

// Validate environment variables on startup
try {
  validateEnv();
} catch (error) {
  console.error("❌ Environment validation failed:", error);
  process.exit(1);
}

// Test database and email connection before starting server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      console.error("❌ Failed to connect to database. Exiting...");
      process.exit(1);
    }

    // Test email service connection
    const emailConnected = await EmailService.testConnection();

    if (!emailConnected) {
      console.warn(
        "⚠️  Email service not connected. Email features may not work."
      );
      // Don't exit - allow server to run without email
    }

    // Run seed (create admin user)
    await SeedService.runSeed();

    // Start server
    app.listen(config.port, () => {
      console.log("=================================");
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📍 http://localhost:${config.port}/api/health`);
      console.log(`⚡ Environment: ${config.nodeEnv}`);
      console.log("=================================");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle shutdown gracefully
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await disconnectDatabase();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: Error) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});
