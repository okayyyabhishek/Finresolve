import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from backend root or current directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3001'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/finresolve'),
  MONGODB_DB_NAME: z.string().default('finresolve'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  
  // Policy gate overrides
  CONFIDENCE_THRESHOLD: z.string().optional().default('0.85'),
  EVIDENCE_COMPLETENESS_THRESHOLD: z.string().optional().default('0.80'),
  MAX_AUTO_RESOLVE_AMOUNT: z.string().optional().default('10000')
});

const parsedEnv = environmentSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
