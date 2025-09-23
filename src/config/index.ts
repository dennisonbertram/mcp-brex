import { config as dotenvConfig } from 'dotenv';
import { logError, logWarn } from '../utils/logger.js';

// Load environment variables once at module import
dotenvConfig();

interface Config {
  brex: {
    apiKey: string;
    apiUrl: string;
  };
}

function validateEnv(): Config {
  const required: string[] = ['BREX_API_KEY'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
    logError(error);
    throw error;
  }

  // Default to official Brex API base URL if not provided
  const apiUrl = process.env.BREX_API_URL || 'https://platform.brexapis.com';
  if (!process.env.BREX_API_URL) {
    logWarn('BREX_API_URL not set; defaulting to https://platform.brexapis.com');
  }

  return {
    brex: {
      apiKey: process.env.BREX_API_KEY!,
      apiUrl,
    },
  };
}

export const appConfig = validateEnv();
