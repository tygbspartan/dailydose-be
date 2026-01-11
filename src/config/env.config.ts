import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  // Server
  port: number;
  nodeEnv: string;
  clientUrl: string;
  
  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // Database
  databaseUrl: string;
  
  // Email (Gmail SMTP)
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPassword: string;
  emailFrom: string;
  
  // Google OAuth
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  
  // Admin Account
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  
  // Token Expiry
  verificationTokenExpiry: string;
  passwordResetTokenExpiry: string;
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value as string;
};

export const config: EnvConfig = {
  // Server
  port: parseInt(getEnvVariable('PORT', '5000')),
  nodeEnv: getEnvVariable('NODE_ENV', 'development'),
  clientUrl: getEnvVariable('CLIENT_URL', 'http://localhost:3000'),
  
  // JWT
  jwtSecret: getEnvVariable('JWT_SECRET'),
  jwtExpiresIn: getEnvVariable('JWT_EXPIRES_IN', '7d'),
  
  // Database
  databaseUrl: getEnvVariable('DATABASE_URL'),
  
  // Email
  emailHost: getEnvVariable('EMAIL_HOST', 'smtp.gmail.com'),
  emailPort: parseInt(getEnvVariable('EMAIL_PORT', '587')),
  emailUser: getEnvVariable('EMAIL_USER'),
  emailPassword: getEnvVariable('EMAIL_PASSWORD'),
  emailFrom: getEnvVariable('EMAIL_FROM'),
  
  // Google OAuth
  googleClientId: getEnvVariable('GOOGLE_CLIENT_ID'),
  googleClientSecret: getEnvVariable('GOOGLE_CLIENT_SECRET'),
  googleCallbackUrl: getEnvVariable('GOOGLE_CALLBACK_URL'),
  
  // Admin Account
  adminEmail: getEnvVariable('ADMIN_EMAIL'),
  adminPassword: getEnvVariable('ADMIN_PASSWORD'),
  adminFirstName: getEnvVariable('ADMIN_FIRST_NAME', 'Admin'),
  adminLastName: getEnvVariable('ADMIN_LAST_NAME', 'User'),
  
  // Token Expiry
  verificationTokenExpiry: getEnvVariable('VERIFICATION_TOKEN_EXPIRY', '24h'),
  passwordResetTokenExpiry: getEnvVariable('PASSWORD_RESET_TOKEN_EXPIRY', '1h'),
};

// Validate critical env variables on startup
export const validateEnv = (): void => {
  console.log('🔍 Validating environment variables...');
  
  // Critical variables
  const criticalVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
  ];
  
  const missing: string[] = [];
  
  criticalVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    throw new Error('Environment validation failed');
  }
  
  console.log('✅ Environment variables validated');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🚪 Port: ${config.port}`);
  console.log(`📧 Email: ${config.emailUser}`);
  console.log(`👤 Admin: ${config.adminEmail}`);
};