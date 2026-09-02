// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing

import { Decimal, toDecimal, serializeDecimals } from '../utils/decimal';
import {
  GroundTruth,
  Payment,
  Exception,
  Investigation,
  AuditRecord
} from '../models';

export interface EvaluationMetrics {
  batchId: string;
  totalRecords: number;
  totalActualMatched: number;
  totalActualExceptions: number;
  
  // Accuracy & Operational Metrics
  matchAccuracy: number;             // correctly matched / total actual matched (0-100%)
  exceptionDetectionAccuracy: number;// correctly detected / total actual exceptions (0-100%)
  rootCauseAccuracy: number;         // correct root cause / total investigated (0-100%)
  autoResolutionAccuracy: number;    // correctly auto-resolved / total auto-resolved (0-100%)
  falseAutoResolutionRate: number;   // incorrectly auto-resolved / total auto-resolved (0-100%)
  escalationRate: number;            // escalated / total exceptions (0-100%)
  coverage: number;                  // auto-resolved / total exceptions (0-100%)
  errorRate: number;                 // incorrect decisions / total decisions (0-100%)
  financialErrorExposure: string;    // sum of discrepancy for incorrectly auto-resolved cases (INR formatted)
  financialErrorExposureRaw: number; // raw float for charts
  
  // Volume & Throughput
  totalAutoResolved: number;
  totalEscalated: number;
  throughput: number;                // records / sec
  durationMs: number;
  evaluatedAt: string;
}

export class EvaluationEngine {
  /**
   * Computes empirical evaluation metrics by comparing pipeline audit decisions with isolated Ground Truth.
   */
  public static async evaluateBatch(batchId: string, wallClockDurationMs: number = 1000): Promise<EvaluationMetrics> {
    const [groundTruths, payments, exceptions, investigations, audits] = await Promise.all([
      GroundTruth.find({ batchId }).lean(),
      Payment.find({ batchId }).lean(),
      Exception.find({ batchId }).lean(),
      Investigation.find({ batchId }).lean(),
      AuditRecord.find({ batchId }).lean()
    ]);

    if (groundTruths.length === 0) {
      throw new Error(`No Ground Truth records found for batch ${batchId}`);
    }

    const groundTruthMap = new Map<string, typeof groundTruths[0]>();
    for (const gt of groundTruths) {
      groundTruthMap.set(gt.paymentId, gt);
    }

    const exceptionMap = new Map<string, typeof exceptions[0]>();
    for (const exp of exceptions) {
      exceptionMap.set(exp.paymentId, exp);
    }

    const investigationMap = new Map<string, typeof investigations[0]>();
    for (const inv of investigations) {
      investigationMap.set(inv.exceptionId, inv);
    }

    const auditMap = new Map<string, typeof audits[0]>();
    for (const aud of audits) {
      auditMap.set(aud.exceptionId, aud);
    }

    let correctMatched = 0;
    let actualMatchedCount = 0;
    let actualExceptionsCount = 0;
    let correctExceptionsDetected = 0;
    let correctRootCauses = 0;

    let totalAutoResolved = 0;
    let correctlyAutoResolved = 0;
    let incorrectlyAutoResolved = 0;
    let totalEscalated = 0;
    let incorrectDecisions = 0;
    let financialErrorExposure = new Decimal(0);

    for (const gt of groundTruths) {
      const isActualMatched = gt.correctDecision === 'matched';
      if (isActualMatched) {
        actualMatchedCount++;
        const detectedExp = exceptionMap.get(gt.paymentId);
        if (!detectedExp) {
          correctMatched++;
        }
      } else {
        actualExceptionsCount++;
        const detectedExp = exceptionMap.get(gt.paymentId);
        if (detectedExp) {
          correctExceptionsDetected++;
          const inv = investigationMap.get(detectedExp.exceptionId);
          const audit = auditMap.get(detectedExp.exceptionId);

          // Root cause check (matching exception type or relevant root cause keywords)
          if (inv && gt.rootCause) {
            const causeMatch =
              inv.rootCause.toLowerCase().includes(detectedExp.type.replace(/_/g, ' ')) ||
              gt.rootCause.toLowerCase().includes(detectedExp.type.replace(/_/g, ' ')) ||
              inv.rootCause.toLowerCase().includes(detectedExp.type.split('_')[0]);
            if (causeMatch) {
              correctRootCauses++;
            }
          }

          // Policy decision evaluation
          if (audit) {
            const systemDecision = audit.policyDecision;
            if (systemDecision === 'auto_resolve') {
              totalAutoResolved++;
              if (gt.correctDecision === 'auto_resolve') {
                correctlyAutoResolved++;
              } else {
                incorrectlyAutoResolved++;
                incorrectDecisions++;
                financialErrorExposure = financialErrorExposure.plus(toDecimal(detectedExp.discrepancy).abs());
              }
            } else if (systemDecision === 'escalate' || systemDecision === 'insufficient_evidence') {
              totalEscalated++;
              if (gt.correctDecision === 'auto_resolve') {
                // False escalation is safe (not financial error exposure), but counted as non-optimal
              }
            }
          }
        }
      }
    }

    const totalRecords = groundTruths.length;
    const totalExceptionsDetected = exceptions.length;

    const matchAccuracy = actualMatchedCount > 0
      ? (correctMatched / actualMatchedCount) * 100
      : 100;

    const exceptionDetectionAccuracy = actualExceptionsCount > 0
      ? (correctExceptionsDetected / actualExceptionsCount) * 100
      : 100;

    const rootCauseAccuracy = totalExceptionsDetected > 0
      ? (correctRootCauses / totalExceptionsDetected) * 100
      : 100;

    const autoResolutionAccuracy = totalAutoResolved > 0
      ? (correctlyAutoResolved / totalAutoResolved) * 100
      : 100;

    const falseAutoResolutionRate = totalAutoResolved > 0
      ? (incorrectlyAutoResolved / totalAutoResolved) * 100
      : 0;

    const coverage = totalExceptionsDetected > 0
      ? (totalAutoResolved / totalExceptionsDetected) * 100
      : 0;

    const escalationRate = totalExceptionsDetected > 0
      ? (totalEscalated / totalExceptionsDetected) * 100
      : 0;

    const totalDecisions = totalRecords;
    const errorRate = totalDecisions > 0 ? (incorrectDecisions / totalDecisions) * 100 : 0;

    const effectiveDurationSec = Math.max(wallClockDurationMs / 1000, 0.1);
    const throughput = Number((totalRecords / effectiveDurationSec).toFixed(1));

    return {
      batchId,
      totalRecords,
      totalActualMatched: actualMatchedCount,
      totalActualExceptions: actualExceptionsCount,
      matchAccuracy: Number(matchAccuracy.toFixed(1)),
      exceptionDetectionAccuracy: Number(exceptionDetectionAccuracy.toFixed(1)),
      rootCauseAccuracy: Number(rootCauseAccuracy.toFixed(1)),
      autoResolutionAccuracy: Number(autoResolutionAccuracy.toFixed(1)),
      falseAutoResolutionRate: Number(falseAutoResolutionRate.toFixed(1)),
      escalationRate: Number(escalationRate.toFixed(1)),
      coverage: Number(coverage.toFixed(1)),
      errorRate: Number(errorRate.toFixed(2)),
      financialErrorExposure: `₹${financialErrorExposure.toFixed(2)}`,
      financialErrorExposureRaw: Number(financialErrorExposure.toFixed(2)),
      totalAutoResolved,
      totalEscalated,
      throughput,
      durationMs: wallClockDurationMs,
      evaluatedAt: new Date().toISOString()
    };
  }
}
