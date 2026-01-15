import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  MAIN_BACKEND_URL: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  // AI API Keys (optional, can use env vars directly)
  NANOBANANA_API_KEY: z.string().optional(),
  OPENAI_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  // Storage (optional, can use env vars directly)
  STORAGE_PROVIDER: z.enum(['cloudinary', 'r2', 's3']).default('cloudinary'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let envConfig: EnvConfig;

try {
  envConfig = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Environment validation error:', error.errors);
    throw new Error('Invalid environment configuration');
  }
  throw error;
}

export const config = envConfig;

