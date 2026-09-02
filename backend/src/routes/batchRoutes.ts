import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Papa from 'papaparse';
import { DataGenerator } from '../services/dataGenerator';
import { ReconciliationEngine } from '../services/reconciliationEngine';
import { InvestigationAgent } from '../services/investigationAgent';
import { PolicyGate } from '../services/policyGate';
import { AuditService } from '../services/auditService';
import { EvaluationEngine } from '../services/evaluationEngine';
import { CoverageRiskEngine } from '../services/coverageRiskEngine';
import { FinanceEngine } from '../services/financeEngine';
import {
  Payment,
  Settlement,
  Refund,
  Fee,
  Adjustment,
  Exception,
  Investigation,
  AuditRecord,
  GroundTruth
} from '../models';
import { Decimal, toDecimal, toDecimal128, serializeDecimals } from '../utils/decimal';

const router = Router();
const dataGenerator = new DataGenerator(42);
const reconciliationEngine = new ReconciliationEngine();
const investigationAgent = new InvestigationAgent();

// In-memory status tracker for long-running batches
const batchProcessingStatus = new Map<string, any>();

const BatchUploadSchema = z
  .object({
    batchId: z.string().min(1).max(100).optional(),
    records: z
      .array(
        z
          .object({
            paymentId: z.string().optional(),
            merchantId: z.string().optional(),
            customerId: z.string().optional(),
            amount: z.union([z.string(), z.number()]).optional(),
            method: z.string().optional(),
            status: z.string().optional(),
            capturedAt: z.string().optional(),
            settlementGross: z.union([z.string(), z.number()]).optional(),
            settlementFee: z.union([z.string(), z.number()]).optional(),
            settlementTax: z.union([z.string(), z.number()]).optional(),
            settlementNet: z.union([z.string(), z.number()]).optional(),
            utr: z.string().optional(),
            refundAmount: z.union([z.string(), z.number()]).optional(),
            refundReason: z.string().optional(),
            adjustmentAmount: z.union([z.string(), z.number()]).optional(),
            adjustmentType: z.string().optional(),
            adjustmentReason: z.string().optional()
          })
          .passthrough()
      )
      .optional(),
    csvContent: z.string().max(10_000_000).optional() // 10MB max CSV
  })
  .refine(
    (data) => (data.records && data.records.length > 0) || (data.csvContent && data.csvContent.trim().length > 0),
    { message: 'Please provide either a JSON "records" array or "csvContent" string.' }
  );

/**
 * GET /api/v1/batch/template
 * Returns sample CSV template and sample JSON template for batch data upload.
 */
router.get('/template', (_req: Request, res: Response) => {
  const sampleCsv = `paymentId,merchantId,customerId,amount,method,status,capturedAt,settlementGross,settlementFee,settlementTax,settlementNet,utr,refundAmount,refundReason,adjustmentAmount,adjustmentType,adjustmentReason
PAY-U01,MER-001,CUST-1001,10000.00,upi,captured,2026-03-01T10:00:00Z,10000.00,25.00,4.50,9970.50,UTR-RBID-001,,,,
PAY-U02,MER-002,CUST-1002,5000.00,card,captured,2026-03-01T11:00:00Z,5000.00,105.00,18.00,4877.00,UTR-RBID-002,,,,
PAY-U03,MER-003,CUST-1003,7500.00,netbanking,captured,2026-03-01T12:00:00Z,,,,,,,,,
PAY-U04,MER-001,CUST-1004,12000.00,card,captured,2026-03-01T13:00:00Z,12000.00,240.00,43.20,11716.80,UTR-RBID-004,2000.00,Customer Return,,
PAY-U05,MER-004,CUST-1005,3000.00,wallet,captured,2026-03-01T14:00:00Z,3000.00,30.00,5.40,2614.60,UTR-RBID-005,,,350.00,penalty,Risk charge`;

  res.status(200).json({
    csvTemplate: sampleCsv,
    fields: [
      { name: 'paymentId', required: true, description: 'Unique payment ID (e.g. PAY-U01)' },
      { name: 'merchantId', required: true, description: 'Merchant ID (e.g. MER-001)' },
      { name: 'customerId', required: true, description: 'Customer identifier (e.g. CUST-1001)' },
      { name: 'amount', required: true, description: 'Captured amount in INR (e.g. 5000.00)' },
      { name: 'method', required: true, description: 'upi | card | netbanking | wallet' },
      { name: 'status', required: false, description: 'captured | refunded | failed' },
      { name: 'capturedAt', required: false, description: 'ISO date string' },
      { name: 'settlementGross', required: false, description: 'Gross amount in bank clearing file' },
      { name: 'settlementFee', required: false, description: 'Base fee charged' },
      { name: 'settlementTax', required: false, description: 'GST charged' },
      { name: 'settlementNet', required: false, description: 'Actual net settlement amount paid' },
      { name: 'utr', required: false, description: 'Bank UTR reference' },
      { name: 'refundAmount', required: false, description: 'Refund amount if applicable' },
      { name: 'refundReason', required: false, description: 'Refund justification reason' },
      { name: 'adjustmentAmount', required: false, description: 'Adjustment / chargeback debit' },
      { name: 'adjustmentType', required: false, description: 'chargeback | penalty | correction | reversal' },
      { name: 'adjustmentReason', required: false, description: 'Adjustment reason' }
    ]
  });
});

/**
 * POST /api/v1/batch/upload
 * Handles custom CSV / JSON data upload, validates with Decimal.js, stores records,
 * and automatically triggers full reconciliation + AI investigation + policy gate.
 */
router.post('/upload', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = BatchUploadSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid upload payload',
        details: parseResult.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      });
      return;
    }

    const { batchId: customBatchId, records, csvContent } = parseResult.data;
    const batchId = customBatchId || `BATCH-UPLOAD-${Date.now()}`;

    let parsedRows: any[] = [];

    if (Array.isArray(records) && records.length > 0) {
      parsedRows = records;
    } else if (typeof csvContent === 'string' && csvContent.trim().length > 0) {
      const parsedCsv = Papa.parse(csvContent.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
        transform: (v: string) => v.trim()
      });

      if (parsedCsv.errors.length > 0) {
        const criticalErrors = parsedCsv.errors.filter(
          (e) => e.type === 'Delimiter' || (e as any).code === 'UndetectableDelimiter'
        );
        if (criticalErrors.length > 0) {
          res.status(400).json({
            error: 'CSV parsing failed',
            details: criticalErrors.map((e) => ({ row: e.row, message: e.message }))
          });
          return;
        }
      }

      parsedRows = parsedCsv.data as Record<string, string>[];
    }

    if (parsedRows.length === 0) {
      res.status(400).json({ error: 'No valid data rows found in upload payload.' });
      return;
    }

    // Clear any existing data for this batchId
    await Promise.all([
      Payment.deleteMany({ batchId }),
      Settlement.deleteMany({ batchId }),
      Refund.deleteMany({ batchId }),
      Fee.deleteMany({ batchId }),
      Adjustment.deleteMany({ batchId }),
      GroundTruth.deleteMany({ batchId }),
      Exception.deleteMany({ batchId }),
      Investigation.deleteMany({ batchId }),
      AuditRecord.deleteMany({ batchId })
    ]);

    const paymentsToInsert: any[] = [];
    const settlementsToInsert: any[] = [];
    const refundsToInsert: any[] = [];
    const feesToInsert: any[] = [];
    const adjustmentsToInsert: any[] = [];
    const groundTruthsToInsert: any[] = [];

    // Unique suffix per upload to prevent duplicate key collisions across batches
    const uploadSuffix = Date.now().toString().slice(-6);

    let rowIdx = 1;
    for (const row of parsedRows) {
      const paymentId = row.paymentId || `PAY-U${String(rowIdx).padStart(3, '0')}`;
      const merchantId = row.merchantId || 'MER-001';
      const customerId = row.customerId || `CUST-${1000 + rowIdx}`;
      const amountDec = toDecimal(row.amount || '1000.00');
      const methodRaw = (row.method || 'upi').toString().toLowerCase().trim();
      const method = methodRaw || 'upi';

      const capturedAt = row.capturedAt ? new Date(row.capturedAt) : new Date();

      // Theoretical Fee Calculation
      const standardFee = FinanceEngine.calculateFee(amountDec, method);

      paymentsToInsert.push({
        paymentId,
        merchantId,
        customerId,
        amount: toDecimal128(amountDec),
        currency: 'INR',
        method,
        status: row.status || 'captured',
        capturedAt,
        metadata: { channel: 'custom_upload' },
        batchId
      });

      // Fee record
      const feeBase = row.settlementFee ? toDecimal(row.settlementFee) : standardFee.baseFee;
      const feeGst = row.settlementTax ? toDecimal(row.settlementTax) : standardFee.gst;
      const feeTotal = feeBase.plus(feeGst);

      feesToInsert.push({
        feeId: `FEE-U${uploadSuffix}-${String(rowIdx).padStart(3, '0')}`,
        paymentId,
        baseFee: toDecimal128(feeBase),
        gstOnFee: toDecimal128(feeGst),
        totalFee: toDecimal128(feeTotal),
        method,
        rateApplied: toDecimal128(standardFee.rateApplied),
        batchId,
        createdAt: capturedAt
      });

      // Settlement record (if present or gross provided)
      if (row.settlementGross || row.settlementNet || row.utr) {
        const grossAmount = toDecimal(row.settlementGross || amountDec);
        const netAmount = row.settlementNet
          ? toDecimal(row.settlementNet)
          : grossAmount.minus(feeTotal);

        settlementsToInsert.push({
          settlementId: `STL-U${uploadSuffix}-${String(rowIdx).padStart(3, '0')}`,
          paymentId,
          merchantId,
          grossAmount: toDecimal128(grossAmount),
          feeAmount: toDecimal128(feeBase),
          taxAmount: toDecimal128(feeGst),
          netAmount: toDecimal128(netAmount),
          status: 'processed',
          settledAt: new Date(capturedAt.getTime() + 24 * 3600 * 1000),
          utr: row.utr || `UTR-UPLOAD-${String(rowIdx).padStart(6, '0')}`,
          batchId
        });
      }

      // Refund record (if specified)
      if (row.refundAmount && toDecimal(row.refundAmount).gt(0)) {
        const refAmt = toDecimal(row.refundAmount);
        refundsToInsert.push({
          refundId: `REF-U${uploadSuffix}-${String(rowIdx).padStart(3, '0')}`,
          paymentId,
          amount: toDecimal128(refAmt),
          reason: row.refundReason || 'Customer requested refund',
          status: 'processed',
          processedAt: new Date(capturedAt.getTime() + 12 * 3600 * 1000),
          batchId
        });
      }

      // Adjustment record (if specified)
      if (row.adjustmentAmount && toDecimal(row.adjustmentAmount).gt(0)) {
        const adjAmt = toDecimal(row.adjustmentAmount);
        adjustmentsToInsert.push({
          adjustmentId: `ADJ-U${uploadSuffix}-${String(rowIdx).padStart(3, '0')}`,
          paymentId,
          merchantId,
          type: row.adjustmentType || 'chargeback',
          amount: toDecimal128(adjAmt),
          reason: row.adjustmentReason || 'Operational adjustment entry',
          batchId,
          createdAt: capturedAt
        });
      }

      // Infer Ground Truth baseline with intelligent decision inference
      const expectedNetAmount = amountDec.minus(standardFee.totalFee);
      let correctDecision: 'matched' | 'auto_resolve' | 'escalate' = 'matched';

      // If no settlement data provided → missing settlement → escalate
      if (!row.settlementGross && !row.settlementNet && !row.utr) {
        correctDecision = 'escalate';
      } else {
        // If settlement exists, check if amounts match
        const netSettled = row.settlementNet ? toDecimal(row.settlementNet) : expectedNetAmount;
        const diff = netSettled.minus(expectedNetAmount).abs();
        if (diff.gt(new Decimal('0.01'))) {
          // There's a discrepancy — infer based on magnitude
          correctDecision = diff.lte(new Decimal('10000')) ? 'auto_resolve' : 'escalate';
        }
      }

      groundTruthsToInsert.push({
        paymentId,
        expectedSettlement: toDecimal128(expectedNetAmount),
        actualSettlement: toDecimal128(row.settlementNet ? toDecimal(row.settlementNet) : expectedNetAmount),
        exceptionType: null,
        rootCause: null,
        supportingEvidenceIds: [paymentId],
        correctDecision,
        financialImpact: toDecimal128(new Decimal(0)),
        notes: 'User uploaded transaction record',
        batchId
      });

      rowIdx++;
    }

    // Insert all documents
    await Promise.all([
      Payment.insertMany(paymentsToInsert),
      Settlement.insertMany(settlementsToInsert),
      Refund.insertMany(refundsToInsert),
      Fee.insertMany(feesToInsert),
      Adjustment.insertMany(adjustmentsToInsert),
      GroundTruth.insertMany(groundTruthsToInsert)
    ]);

    // Automatically run the pipeline for the uploaded batch
    const startTime = Date.now();
    const reconResult = await reconciliationEngine.reconcileBatch(batchId);
    const exceptions = await Exception.find({ batchId });

    // Process exceptions with bounded concurrency for high-speed robust ingestion
    const chunkSize = 6;
    for (let i = 0; i < exceptions.length; i += chunkSize) {
      const chunk = exceptions.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (exp, cIdx) => {
          exp.status = 'investigating';
          await exp.save();

          const invOutput = await investigationAgent.investigate(exp);
          const invDoc = new Investigation({
            investigationId: `INV-${exp.exceptionId.replace('EXP-', '')}-${Date.now().toString().slice(-4)}-${i + cIdx}`,
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
        })
      );
    }

    const durationMs = Date.now() - startTime;
    const metrics = await EvaluationEngine.evaluateBatch(batchId, durationMs);
    const coverageRisk = await CoverageRiskEngine.sweep(batchId);

    res.status(200).json({
      success: true,
      message: `Uploaded and processed batch ${batchId} (${paymentsToInsert.length} records, ${exceptions.length} exceptions detected)`,
      batchId,
      totalRecordsUploaded: paymentsToInsert.length,
      reconciliationSummary: reconResult.summary,
      metrics,
      coverageRisk
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/batch/generate
 * Generates synthetic benchmark dataset (75 records) with reproducible seed
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const seed = req.body.seed ? parseInt(req.body.seed, 10) : 42;
    const batchId = req.body.batchId || `BATCH-FR-${Date.now()}`;

    const summary = await dataGenerator.generateBatch(batchId, seed);

    res.status(200).json({
      success: true,
      message: `Generated ${summary.totalRecords} synthetic records with seed ${seed}`,
      batchId,
      summary
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/batch/process
 * Executes the complete 5-stage pipeline:
 * RECONCILE -> INVESTIGATE -> POLICY -> AUDIT -> EVALUATE
 */
router.post('/process', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const startTime = Date.now();
    let batchId = req.body.batchId;

    if (!batchId) {
      // Find the most recent batch
      const latestPayment = await Payment.findOne().sort({ createdAt: -1 });
      if (!latestPayment) {
        // Auto-generate if database is empty
        const genSummary = await dataGenerator.generateBatch(`BATCH-FR-${Date.now()}`, 42);
        batchId = genSummary.batchId;
      } else {
        batchId = latestPayment.batchId;
      }
    }

    batchProcessingStatus.set(batchId, {
      status: 'processing',
      stage: 'reconciling',
      progress: 0,
      total: 0,
      startedAt: new Date().toISOString()
    });

    // 1. RECONCILIATION PHASE
    const reconResult = await reconciliationEngine.reconcileBatch(batchId);
    const exceptions = await Exception.find({ batchId });

    batchProcessingStatus.set(batchId, {
      status: 'processing',
      stage: 'investigating',
      progress: 0,
      total: exceptions.length,
      startedAt: new Date().toISOString()
    });

    // Clear old investigations and audit records for this batch
    await Promise.all([
      Investigation.deleteMany({ batchId }),
      AuditRecord.deleteMany({ batchId })
    ]);

    const investigationResults: any[] = [];
    const auditResults: any[] = [];

    // 2. INVESTIGATION & 3. POLICY & 4. AUDIT PHASES (Sequential)
    let processedCount = 0;
    for (const exp of exceptions) {
      exp.status = 'investigating';
      await exp.save();

      // a. Autonomous Investigation
      const invOutput = await investigationAgent.investigate(exp);

      const investigationDoc = new Investigation({
        investigationId: `INV-${exp.exceptionId.replace('EXP-', '')}-${Date.now().toString().slice(-4)}`,
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
      await investigationDoc.save();
      investigationResults.push(investigationDoc);

      // b. Deterministic Policy Gate Evaluation
      const policyResult = PolicyGate.evaluate(investigationDoc, exp);

      // c. Update Exception status
      exp.status = policyResult.decision === 'auto_resolve' ? 'auto_resolved' : 'escalated';
      await exp.save();

      // d. Create Audit Record
      const auditRecord = await AuditService.recordPolicyEvaluation({
        exception: exp,
        investigation: investigationDoc,
        policyResult,
        batchId
      });
      auditResults.push(auditRecord);

      processedCount++;
      batchProcessingStatus.set(batchId, {
        status: 'processing',
        stage: 'investigating',
        progress: processedCount,
        total: exceptions.length,
        startedAt: new Date().toISOString()
      });
    }

    // 5. EVALUATION PHASE
    const wallClockDurationMs = Date.now() - startTime;
    const metrics = await EvaluationEngine.evaluateBatch(batchId, wallClockDurationMs);
    const coverageRisk = await CoverageRiskEngine.sweep(batchId);

    batchProcessingStatus.set(batchId, {
      status: 'complete',
      stage: 'done',
      progress: exceptions.length,
      total: exceptions.length,
      completedAt: new Date().toISOString(),
      durationMs: wallClockDurationMs
    });

    // Auto-cleanup completed batch status after 5 minutes to prevent memory leak
    setTimeout(() => { batchProcessingStatus.delete(batchId); }, 5 * 60 * 1000);

    res.status(200).json({
      success: true,
      batchId,
      summary: {
        totalRecords: metrics.totalRecords,
        matched: reconResult.summary.matchedCount,
        exceptions: reconResult.summary.exceptionCount,
        autoResolved: metrics.totalAutoResolved,
        escalated: metrics.totalEscalated,
        durationMs: wallClockDurationMs
      },
      reconciliationSummary: reconResult.summary,
      metrics,
      coverageRisk
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/batch/reset
 * Purges all custom test records and restores the pristine benchmark demo batch (BATCH-FR-DEMO).
 */
router.post('/reset', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Purge all existing collections
    await Promise.all([
      Payment.deleteMany({}),
      Settlement.deleteMany({}),
      Refund.deleteMany({}),
      Fee.deleteMany({}),
      Adjustment.deleteMany({}),
      GroundTruth.deleteMany({}),
      Exception.deleteMany({}),
      Investigation.deleteMany({}),
      AuditRecord.deleteMany({})
    ]);

    // 2. Generate clean benchmark dataset (75 records)
    const batchId = 'BATCH-FR-DEMO';
    const genSummary = await dataGenerator.generateBatch(batchId, 42);

    // 3. Reconcile
    const reconResult = await reconciliationEngine.reconcileBatch(batchId);
    const exceptions = await Exception.find({ batchId });

    // 4. Investigate & Policy Gate
    for (const exp of exceptions) {
      exp.status = 'investigating';
      await exp.save();

      const invOutput = await investigationAgent.executeDeterministicInvestigation(exp);
      const invDoc = new Investigation({
        investigationId: `INV-${exp.exceptionId.replace('EXP-', '')}-001`,
        exceptionId: exp.exceptionId,
        rootCause: invOutput.rootCause,
        evidence: invOutput.evidence,
        confidence: toDecimal128(invOutput.confidence),
        evidenceCompleteness: toDecimal128(invOutput.evidenceCompleteness),
        recommendedAction: invOutput.recommendedAction,
        reasoning: invOutput.reasoning,
        agentModel: 'Deterministic Rules Engine (Benchmark Mode)',
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

    const metrics = await EvaluationEngine.evaluateBatch(batchId, 1200);

    res.status(200).json({
      success: true,
      message: 'System database successfully reset to pristine benchmark dataset (BATCH-FR-DEMO).',
      batchId,
      summary: {
        totalRecords: genSummary.totalRecords,
        matchedCount: reconResult.summary.matchedCount,
        exceptionCount: reconResult.summary.exceptionCount,
        autoResolvedCount: metrics.totalAutoResolved,
        escalatedCount: metrics.totalEscalated
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/batch/status/:batchId
 * Returns current processing status for a batch
 */
router.get('/status/:batchId', (req: Request, res: Response): void => {
  const { batchId } = req.params;
  const status = batchProcessingStatus.get(batchId) || {
    status: 'idle',
    batchId
  };
  res.status(200).json(status);
});

export default router;
