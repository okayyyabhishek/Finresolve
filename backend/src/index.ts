import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { Payment, Exception, Investigation, AuditRecord } from './models';
import { DataGenerator } from './services/dataGenerator';
import { ReconciliationEngine } from './services/reconciliationEngine';
import { InvestigationAgent } from './services/investigationAgent';
import { PolicyGate } from './services/policyGate';
import { AuditService } from './services/auditService';
import { toDecimal128 } from './utils/decimal';

import rateLimit from 'express-rate-limit';

// Route imports
import batchRoutes from './routes/batchRoutes';
import exceptionRoutes from './routes/exceptionRoutes';
import investigationRoutes from './routes/investigationRoutes';
import reviewRoutes from './routes/reviewRoutes';
import auditRoutes from './routes/auditRoutes';
import evaluationRoutes from './routes/evaluationRoutes';
import chatRoutes from './routes/chatRoutes';

const app: Express = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const normalizedOrigin = origin.replace(/\/$/, '');
      const configuredFrontend = env.FRONTEND_URL ? env.FRONTEND_URL.replace(/\/$/, '') : '';

      const allowedOrigins = [
        configuredFrontend,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:5173'
      ].filter(Boolean);

      const isVercelDomain = /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(normalizedOrigin);

      if (env.NODE_ENV !== 'production' || allowedOrigins.includes(normalizedOrigin) || isVercelDomain) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true
  })
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate Limiting (F-04)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Chat rate limit exceeded. Please wait before sending more messages.',
    code: 'CHAT_RATE_LIMIT_EXCEEDED'
  }
});

// Apply rate limiters
app.use('/api', generalLimiter);
app.use('/api/v1/chat', chatLimiter);

// Health Check Endpoint
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'FINRESOLVE Settlement Controller Backend',
    version: '1.0.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/batch', batchRoutes);
app.use('/api/v1/exceptions', exceptionRoutes);
app.use('/api/v1/investigations', investigationRoutes);
app.use('/api/v1/review', reviewRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/evaluation', evaluationRoutes);
app.use('/api/v1/chat', chatRoutes);

// Catch-all 404 handler for undefined API routes
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'API endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

let server: any = null;

async function autoInitializeInitialBatch(): Promise<void> {
  try {
    const existingCount = await Payment.countDocuments();
    if (existingCount === 0) {
      console.log('🌱 Initializing default benchmark batch (75 records)...');
      const batchId = 'BATCH-FR-DEMO';
      const dataGenerator = new DataGenerator(42);
      const recon = new ReconciliationEngine();
      const invAgent = new InvestigationAgent();

      await dataGenerator.generateBatch(batchId, 42);
      await recon.reconcileBatch(batchId);

      const exceptions = await Exception.find({ batchId });
      for (const exp of exceptions) {
        exp.status = 'investigating';
        await exp.save();

        const invOutput = await invAgent.executeDeterministicInvestigation(exp);
        const invDoc = new Investigation({
          investigationId: `INV-${exp.exceptionId.replace('EXP-', '')}-001`,
          exceptionId: exp.exceptionId,
          rootCause: invOutput.rootCause,
          evidence: invOutput.evidence,
          confidence: toDecimal128(invOutput.confidence),
          evidenceCompleteness: toDecimal128(invOutput.evidenceCompleteness),
          recommendedAction: invOutput.recommendedAction,
          reasoning: invOutput.reasoning,
          agentModel: invOutput.agentModel,
          toolsUsed: invOutput.toolsUsed,
          durationMs: invOutput.durationMs,
          batchId
        });
        await invDoc.save();

        const policyResult = PolicyGate.evaluate(invDoc, exp);
        exp.status = policyResult.decision === 'auto_resolve' ? 'auto_resolved' : 'escalated';
        await exp.save();

        await AuditService.recordPolicyEvaluation({
          exception: exp,
          investigation: invDoc,
          policyResult,
          batchId
        });
      }
      console.log('✅ Default benchmark batch successfully initialized & ready!');
    }
  } catch (err) {
    console.warn('⚠️ Auto-initialization notice:', err);
  }
}

export async function startServer(): Promise<any> {
  try {
    await connectDatabase();

    await autoInitializeInitialBatch();

    server = app.listen(env.PORT, () => {
      console.log(`
============================================================
🚀 FINRESOLVE Backend Running
============================================================
📡 Port: ${env.PORT}
🌍 Mode: ${env.NODE_ENV}
🤖 Model: ${env.GEMINI_MODEL}
📊 Health: http://localhost:${env.PORT}/api/v1/health
============================================================
      `);
    });

    return server;
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Gracefully shutting down...');
  if (server) server.close();
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Gracefully shutting down...');
  if (server) server.close();
  await disconnectDatabase();
  process.exit(0);
});

// Auto-start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
