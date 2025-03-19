import { config } from 'dotenv';
import { logError } from '../utils/logger.js';

// Load environment variables
config();

interface Config {
  brex: {
    apiKey: string;
    apiUrl: string;
  };
  server: {
    port: number;
    nodeEnv: string;
  };
  rateLimit: {
    requests: number;
    windowMs: number;
  };
}

function validateEnv(): Config {
  const requiredEnvVars = [
    'BREX_API_KEY',
    'BREX_API_URL',
    'PORT',
    'NODE_ENV',
    'RATE_LIMIT_REQUESTS',
    'RATE_LIMIT_WINDOW_MS'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    const error = new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    logError(error);
    throw error;
  }

  return {
    brex: {
      apiKey: process.env.BREX_API_KEY!,
      apiUrl: process.env.BREX_API_URL!,
    },
    server: {
      port: parseInt(process.env.PORT!, 10),
      nodeEnv: process.env.NODE_ENV!,
    },
    rateLimit: {
      requests: parseInt(process.env.RATE_LIMIT_REQUESTS!, 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS!, 10),
    },
  };
}

export const config = validateEnv(); 