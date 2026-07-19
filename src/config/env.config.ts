import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Centralized environment configuration.
 *
 * The active environment is selected via the ENV variable (defaults to "staging").
 * This keeps execution parameters (base URLs, timeouts, credentials, etc.)
 * completely separate from test logic and test data, so the same suite can
 * run against staging, QA, or production simply by swapping the ENV value
 * or the corresponding .env.<env> file.
 */

export type Environment = 'staging' | 'qa' | 'production';

const activeEnv = (process.env.ENV as Environment) || 'staging';

// Load the env-specific file first, then fall back to a base .env if present.
dotenv.config({ path: path.resolve(__dirname, `../../env/.env.${activeEnv}`) });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface AppConfig {
  env: Environment;
  baseUrl: string;
  defaultTimeout: number;
  navigationTimeout: number;
  headless: boolean;
  retries: number;
  workers: number | undefined;
}

const baseUrls: Record<Environment, string> = {
  staging: 'https://wl.stg.simplenight.com/',
  qa: process.env.QA_BASE_URL || '',
  production: process.env.PROD_BASE_URL || '',
};

export const config: AppConfig = {
  env: activeEnv,
  baseUrl: process.env.BASE_URL || baseUrls[activeEnv],
  defaultTimeout: Number(process.env.DEFAULT_TIMEOUT) || (process.env.CI ? 20_000 : 15_000),
  navigationTimeout: Number(process.env.NAVIGATION_TIMEOUT) || (process.env.CI ? 45_000 : 30_000),
  headless: process.env.HEADLESS ? process.env.HEADLESS === 'true' : true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
};

export default config;
