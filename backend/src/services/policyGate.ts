// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing

import { Decimal, toDecimal } from '../utils/decimal';
import {
  CONFIDENCE_THRESHOLD,
  EVIDENCE_COMPLETENESS_THRESHOLD,
  MAX_AUTO_RESOLVE_AMOUNT,
  ALLOWED_AUTO_RESOLVE_TYPES
} from '../config/financeRules';
import { IException } from '../models/Exception';
import { IInvestigation } from '../models/Investigation';
import { AgentInvestigationOutput } from './investigationAgent';

export interface PolicyRuleEvaluation {
  rule: string;
  passed: boolean;
  detail: string;
}

export type PolicyDecision = 'auto_resolve' | 'escalate' | 'insufficient_evidence';

export interface PolicyGateResult {
  decision: PolicyDecision;
  reason: string;
  rulesApplied: PolicyRuleEvaluation[];
}

export interface PolicyThresholdOverrides {
  confidenceThreshold?: Decimal | number | string;
  completenessThreshold?: Decimal | number | string;
  maxAmount?: Decimal | number | string;
  allowedTypes?: readonly string[];
}

export class PolicyGate {
  /**
   * Deterministically evaluates an investigation and exception against strict financial safety policies.
   */
  public static evaluate(
    investigation: IInvestigation | AgentInvestigationOutput,
    exception: IException,
    overrides?: PolicyThresholdOverrides
  ): PolicyGateResult {
    const rulesApplied: PolicyRuleEvaluation[] = [];

    const confThreshold = overrides?.confidenceThreshold
      ? toDecimal(overrides.confidenceThreshold)
      : CONFIDENCE_THRESHOLD;

    const compThreshold = overrides?.completenessThreshold
      ? toDecimal(overrides.completenessThreshold)
      : EVIDENCE_COMPLETENESS_THRESHOLD;

    const maxAmountLimit = overrides?.maxAmount
      ? toDecimal(overrides.maxAmount)
      : MAX_AUTO_RESOLVE_AMOUNT;

    const allowedTypes = overrides?.allowedTypes || ALLOWED_AUTO_RESOLVE_TYPES;

    const confidence = toDecimal(investigation.confidence);
    const completeness = toDecimal(investigation.evidenceCompleteness);
    const discrepancy = toDecimal(exception.discrepancy);
    const financialImpact = discrepancy.abs();

    // 1. CONFIDENCE CHECK
    const confidencePassed = confidence.gte(confThreshold);
    rulesApplied.push({
      rule: 'CONFIDENCE_THRESHOLD_CHECK',
      passed: confidencePassed,
      detail: `Investigation confidence (${confidence.toFixed(2)}) ${
        confidencePassed ? '>=' : '<'
      } required threshold (${confThreshold.toFixed(2)})`
    });

    if (!confidencePassed) {
      return {
        decision: 'escalate',
        reason: `Confidence ${confidence.toFixed(2)} below threshold ${confThreshold.toFixed(2)}`,
        rulesApplied
      };
    }

    // 2. EVIDENCE COMPLETENESS CHECK
    const completenessPassed = completeness.gte(compThreshold);
    rulesApplied.push({
      rule: 'EVIDENCE_COMPLETENESS_CHECK',
      passed: completenessPassed,
      detail: `Evidence completeness score (${completeness.toFixed(2)}) ${
        completenessPassed ? '>=' : '<'
      } required threshold (${compThreshold.toFixed(2)})`
    });

    if (!completenessPassed) {
      return {
        decision: 'escalate',
        reason: `Evidence completeness ${completeness.toFixed(2)} below threshold ${compThreshold.toFixed(2)}`,
        rulesApplied
      };
    }

    // 3. FINANCIAL AMOUNT CHECK
    const amountPassed = financialImpact.lte(maxAmountLimit);
    rulesApplied.push({
      rule: 'MAX_AMOUNT_LIMIT_CHECK',
      passed: amountPassed,
      detail: `Financial impact (₹${financialImpact.toFixed(2)}) ${
        amountPassed ? '<=' : '>'
      } max auto-resolve limit (₹${maxAmountLimit.toFixed(2)})`
    });

    if (!amountPassed) {
      return {
        decision: 'escalate',
        reason: `Financial impact ₹${financialImpact.toFixed(2)} exceeds auto-resolve limit ₹${maxAmountLimit.toFixed(2)}`,
        rulesApplied
      };
    }

    // 4. EXCEPTION TYPE CHECK
    const typeAllowed = allowedTypes.includes(exception.type);
    rulesApplied.push({
      rule: 'ALLOWED_EXCEPTION_TYPE_CHECK',
      passed: typeAllowed,
      detail: `Exception type '${exception.type}' ${
        typeAllowed ? 'is permitted' : 'is NOT permitted'
      } for autonomous resolution`
    });

    if (!typeAllowed) {
      return {
        decision: 'escalate',
        reason: `Exception type '${exception.type}' not allowed for auto-resolution`,
        rulesApplied
      };
    }

    // 5. AGENT RECOMMENDATION CHECK
    const recommendationPassed = investigation.recommendedAction === 'auto_resolve';
    rulesApplied.push({
      rule: 'AGENT_RECOMMENDATION_CHECK',
      passed: recommendationPassed,
      detail: `Agent recommended action: '${investigation.recommendedAction}'`
    });

    if (!recommendationPassed) {
      const decision: PolicyDecision =
        investigation.recommendedAction === 'insufficient_evidence'
          ? 'insufficient_evidence'
          : 'escalate';

      return {
        decision,
        reason: `Agent recommended '${investigation.recommendedAction}'`,
        rulesApplied
      };
    }

    // 6. ALL CHECKS PASSED -> AUTO_RESOLVE
    return {
      decision: 'auto_resolve',
      reason: 'All deterministic policy rules satisfied successfully',
      rulesApplied
    };
  }
}
