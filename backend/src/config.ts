import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

export interface Config {
  HEVY_API_KEY: string | null;
  PORT: number;
}

export function getConfig(): Config {
  const hevyApiKey = process.env.HEVY_API_KEY || null;
  const port = parseInt(process.env.PORT || '3001', 10);

  return {
    HEVY_API_KEY: hevyApiKey,
    PORT: port,
  };
}

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.HEVY_API_KEY) {
    errors.push('HEVY_API_KEY is not set. Copy backend/.env.example to backend/.env and paste your key from https://hevy.com/settings?developer.');
  }

  if (isNaN(parseInt(process.env.PORT || '3001', 10))) {
    errors.push('PORT must be a valid number.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
