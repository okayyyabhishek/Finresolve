// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing

import { Decimal, toDecimal } from '../utils/decimal';
import { CONFIDENCE_THRESHOLD } from '../config/financeRules';
import { PolicyGate } from './policyGate';
import {
  GroundTruth,
  Exception,
  Investigation
} from '../models';

export interface CoverageRiskPoint {
  threshold: number;
  coverage: number;             // % of exceptions auto-resolved
  accuracy: number;             // % of auto-resolved decisions that are correct vs ground truth
  errorRate: number;            // % of auto-resolved that are erroneous
  financialExposure: number;    // Raw ₹ financial error value
  financialExposureFormatted: string; // Formatted ₹ string
  escalationRate: number;       // % escalated
  autoResolvedCount: number;
  escalatedCount: number;
}

export interface CoverageRiskSweepResult {
  batchId: string;
  points: CoverageRiskPoint[];
  currentThreshold: number;
  optimalThreshold: number;
  currentMetrics: CoverageRiskPoint;
  optimalMetrics: CoverageRiskPoint;
  riskSummary: string;
}

export class CoverageRiskEngine {
  /**
   * Sweeps confidence thresholds from 0.0 to 1.0 (step 0.05) to compute empirical coverage-risk trade-offs.
   */
  public static async sweep(batchId: string): Promise<CoverageRiskSweepResult> {
    const [groundTruths, exceptions, investigations] = await Promise.all([
      GroundTruth.find({ batchId }).lean(),
      Exception.find({ batchId }).lean(),
      Investigation.find({ batchId }).lean()
    ]);

    const groundTruthMap = new Map<string, typeof groundTruths[0]>();
    for (const gt of groundTruths) {
      groundTruthMap.set(gt.paymentId, gt);
    }

    const investigationMap = new Map<string, typeof investigations[0]>();
    for (const inv of investigations) {
      investigationMap.set(inv.exceptionId, inv);
    }

    const totalExceptions = exceptions.length;
    const points: CoverageRiskPoint[] = [];

    // Sweep 21 thresholds: 0.00, 0.05, 0.10, ..., 1.00
    for (let t = 0; t <= 100; t += 5) {
      const thresholdVal = Number((t / 100).toFixed(2));
      let autoResolvedCount = 0;
      let escalatedCount = 0;
      let correctlyAutoResolved = 0;
      let incorrectlyAutoResolved = 0;
      let financialExposureDec = new Decimal(0);

      for (const exp of exceptions) {
        const inv = investigationMap.get(exp.exceptionId);
        const gt = groundTruthMap.get(exp.paymentId);

        if (!inv || !gt) {
          escalatedCount++;
          continue;
        }

        // Re-evaluate policy gate with swept confidence threshold
        const policyResult = PolicyGate.evaluate(inv as any, exp as any, {
          confidenceThreshold: thresholdVal
        });

        if (policyResult.decision === 'auto_resolve') {
          autoResolvedCount++;
          if (gt.correctDecision === 'auto_resolve') {
            correctlyAutoResolved++;
          } else {
            incorrectlyAutoResolved++;
            financialExposureDec = financialExposureDec.plus(toDecimal(exp.discrepancy).abs());
          }
        } else {
          escalatedCount++;
        }
      }

      const coverage = totalExceptions > 0 ? (autoResolvedCount / totalExceptions) * 100 : 0;
      const accuracy = autoResolvedCount > 0 ? (correctlyAutoResolved / autoResolvedCount) * 100 : 100;
      const errorRate = autoResolvedCount > 0 ? (incorrectlyAutoResolved / autoResolvedCount) * 100 : 0;
      const escalationRate = totalExceptions > 0 ? (escalatedCount / totalExceptions) * 100 : 0;
      const rawExposure = Number(financialExposureDec.toFixed(2));

      points.push({
        threshold: thresholdVal,
        coverage: Number(coverage.toFixed(1)),
        accuracy: Number(accuracy.toFixed(1)),
        errorRate: Number(errorRate.toFixed(1)),
        financialExposure: rawExposure,
        financialExposureFormatted: `₹${financialExposureDec.toFixed(2)}`,
        escalationRate: Number(escalationRate.toFixed(1)),
        autoResolvedCount,
        escalatedCount
      });
    }

    const currentThresholdNum = Number(CONFIDENCE_THRESHOLD.toFixed(2));

    // Find closest point to current threshold
    let currentMetrics = points.find((p) => Math.abs(p.threshold - currentThresholdNum) < 0.001);
    if (!currentMetrics) {
      currentMetrics = points[17] || points[points.length - 1]; // ~0.85
    }

    // Optimal threshold: Maximum coverage with accuracy >= 95% and errorRate <= 5%
    const eligiblePoints = points.filter((p) => p.accuracy >= 95.0 && p.errorRate <= 5.0);
    const optimalMetrics = eligiblePoints.length > 0
      ? eligiblePoints.reduce((best, curr) => (curr.coverage > best.coverage ? curr : best), eligiblePoints[0])
      : currentMetrics;

    const optimalThreshold = optimalMetrics.threshold;

    const riskSummary = `At configured confidence threshold of ${currentThresholdNum}, FINRESOLVE achieves ${currentMetrics.coverage}% autonomous coverage with ${currentMetrics.accuracy}% accuracy and ₹${currentMetrics.financialExposure.toFixed(2)} financial risk exposure. Optimal operating point identified at threshold ${optimalThreshold} (${optimalMetrics.coverage}% coverage, ${optimalMetrics.accuracy}% accuracy).`;

    return {
      batchId,
      points,
      currentThreshold: currentThresholdNum,
      optimalThreshold,
      currentMetrics,
      optimalMetrics,
      riskSummary
    };
  }
}
