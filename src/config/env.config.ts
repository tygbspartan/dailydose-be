import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  port: number;
  nodeEnv: string;
  clientUrl: string;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  databaseUrl?: string;
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value as string;
};

export const config: EnvConfig = {
  port: parseInt(getEnvVariable("PORT", "5000")),
  nodeEnv: getEnvVariable("NODE_ENV", "development"),
  clientUrl: getEnvVariable("CLIENT_URL", "http://localhost:3000"),

  // These will be used later when we add auth & database
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  databaseUrl: process.env.DATABASE_URL,
};

// Validate critical env variables on startup
export const validateEnv = (): void => {
  console.log("🔍 Validating environment variables...");

  if (config.nodeEnv === "production" && !config.jwtSecret) {
    throw new Error("JWT_SECRET is required in production");
  }

  console.log("✅ Environment variables validated");
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🚪 Port: ${config.port}`);
};
