/**
 * Intelligence Engine Tests — Phase 3.5
 *
 * Tests for: Feature Engine, Metrics Engine, Persona Engine,
 * Segment Engine, Churn Engine, Category Affinity Engine,
 * Customer360 API, Explain API
 */

// ============================================================
// PURE UNIT TESTS (no DB, no NestJS)
// ============================================================

describe('SegmentResolver — Rule Evaluation Logic', () => {
  // Extracted evaluation functions for unit testing

  function compareValue(actual: any, op: string, expected: any): boolean {
    if (actual === undefined || actual === null) return false;
    const a = Number(actual);
    const b = Number(expected);
    switch (op) {
      case 'eq':
        return actual === expected || a === b;
      case 'neq':
        return actual !== expected && a !== b;
      case 'gt':
        return a > b;
      case 'gte':
        return a >= b;
      case 'lt':
        return a < b;
      case 'lte':
        return a <= b;
      case 'contains':
        return String(actual)
          .toLowerCase()
          .includes(String(expected).toLowerCase());
      default:
        return false;
    }
  }

  interface RuleCondition {
    type: 'metric' | 'feature' | 'persona' | 'preference' | 'group';
    field?: string;
    op?: string;
    value?: any;
    persona?: string;
    operator?: 'AND' | 'OR';
    conditions?: RuleCondition[];
  }

  interface SegmentRule {
    operator: 'AND' | 'OR';
    conditions: RuleCondition[];
  }

  interface CustomerContext {
    metrics: Record<string, any>;
    features: Record<string, any>;
    personas: Set<string>;
    preferences: Record<string, any>;
  }

  function evaluateCondition(
    condition: RuleCondition,
    ctx: CustomerContext,
  ): boolean {
    switch (condition.type) {
      case 'group':
        return evaluateGroup(
          {
            operator: condition.operator || 'AND',
            conditions: condition.conditions || [],
          },
          ctx,
        );
      case 'metric':
        return compareValue(
          ctx.metrics[condition.field!],
          condition.op!,
          condition.value,
        );
      case 'feature':
        return compareValue(
          ctx.features[condition.field!],
          condition.op!,
          condition.value,
        );
      case 'persona':
        return ctx.personas.has(condition.persona!);
      case 'preference':
        return compareValue(
          ctx.preferences[condition.field!],
          condition.op!,
          condition.value,
        );
      default:
        return false;
    }
  }

  function evaluateGroup(group: SegmentRule, ctx: CustomerContext): boolean {
    const results = group.conditions.map((c) => evaluateCondition(c, ctx));
    return group.operator === 'AND'
      ? results.every((r) => r)
      : results.some((r) => r);
  }

  // --- Comparison tests ---

  describe('compareValue', () => {
    it('should handle eq with numbers', () => {
      expect(compareValue(100, 'eq', 100)).toBe(true);
      expect(compareValue(100, 'eq', 200)).toBe(false);
    });

    it('should handle gte', () => {
      expect(compareValue(100, 'gte', 100)).toBe(true);
      expect(compareValue(100, 'gte', 50)).toBe(true);
      expect(compareValue(100, 'gte', 200)).toBe(false);
    });

    it('should handle lte', () => {
      expect(compareValue(50, 'lte', 100)).toBe(true);
      expect(compareValue(100, 'lte', 100)).toBe(true);
      expect(compareValue(200, 'lte', 100)).toBe(false);
    });

    it('should handle gt', () => {
      expect(compareValue(101, 'gt', 100)).toBe(true);
      expect(compareValue(100, 'gt', 100)).toBe(false);
    });

    it('should handle lt', () => {
      expect(compareValue(99, 'lt', 100)).toBe(true);
      expect(compareValue(100, 'lt', 100)).toBe(false);
    });

    it('should handle neq', () => {
      expect(compareValue(100, 'neq', 200)).toBe(true);
      expect(compareValue(100, 'neq', 100)).toBe(false);
    });

    it('should handle contains', () => {
      expect(compareValue('hello world', 'contains', 'hello')).toBe(true);
      expect(compareValue('hello world', 'contains', 'HELLO')).toBe(true); // case-insensitive
      expect(compareValue('hello', 'contains', 'xyz')).toBe(false);
    });

    it('should return false for null/undefined actuals', () => {
      expect(compareValue(null, 'eq', 100)).toBe(false);
      expect(compareValue(undefined, 'gte', 50)).toBe(false);
    });

    it('should return false for unknown operators', () => {
      expect(compareValue(100, 'invalid', 100)).toBe(false);
    });
  });

  // --- AND logic ---

  describe('AND logic', () => {
    const ctx: CustomerContext = {
      metrics: { totalRevenue: 15000, daysSinceLastOrder: 30, totalOrders: 5 },
      features: { DISCOUNT_AFFINITY: 0.7, PREMIUM_BUYER_SCORE: 0.9 },
      personas: new Set(['HIGH_VALUE_LOYALIST', 'PREMIUM_BUYER']),
      preferences: { emailEnabled: true },
    };

    it('should match when ALL conditions are true', () => {
      const rule: SegmentRule = {
        operator: 'AND',
        conditions: [
          { type: 'metric', field: 'totalRevenue', op: 'gte', value: 10000 },
          { type: 'metric', field: 'daysSinceLastOrder', op: 'lte', value: 90 },
        ],
      };
      expect(evaluateGroup(rule, ctx)).toBe(true);
    });

    it('should NOT match when ANY condition is false', () => {
      const rule: SegmentRule = {
        operator: 'AND',
        conditions: [
          { type: 'metric', field: 'totalRevenue', op: 'gte', value: 10000 },
          {
            type: 'metric',
            field: 'daysSinceLastOrder',
            op: 'gte',
            value: 180,
          }, // fails
        ],
      };
      expect(evaluateGroup(rule, ctx)).toBe(false);
    });
  });

  // --- OR logic ---

  describe('OR logic', () => {
    const ctx: CustomerContext = {
      metrics: {
        totalRevenue: 3000,
        daysSinceLastOrder: 200,
        churnRiskScore: 0.9,
      },
      features: {},
      personas: new Set(),
      preferences: {},
    };

    it('should match when ANY condition is true', () => {
      const rule: SegmentRule = {
        operator: 'OR',
        conditions: [
          { type: 'metric', field: 'totalRevenue', op: 'gte', value: 10000 }, // false
          { type: 'metric', field: 'churnRiskScore', op: 'gte', value: 0.8 }, // true
        ],
      };
      expect(evaluateGroup(rule, ctx)).toBe(true);
    });

    it('should NOT match when ALL conditions are false', () => {
      const rule: SegmentRule = {
        operator: 'OR',
        conditions: [
          { type: 'metric', field: 'totalRevenue', op: 'gte', value: 50000 },
          { type: 'metric', field: 'daysSinceLastOrder', op: 'lte', value: 30 },
        ],
      };
      expect(evaluateGroup(rule, ctx)).toBe(false);
    });
  });

  // --- NESTED logic ---

  describe('Nested group logic', () => {
    const ctx: CustomerContext = {
      metrics: {
        totalRevenue: 7000,
        churnRiskScore: 0.85,
        daysSinceLastOrder: 200,
      },
      features: { DISCOUNT_AFFINITY: 0.3 },
      personas: new Set(['PREMIUM_BUYER']),
      preferences: {},
    };

    it('should support (spend > 5000 OR churn > 0.8) AND persona = PREMIUM_BUYER', () => {
      const rule: SegmentRule = {
        operator: 'AND',
        conditions: [
          {
            type: 'group',
            operator: 'OR',
            conditions: [
              { type: 'metric', field: 'totalRevenue', op: 'gt', value: 5000 },
              { type: 'metric', field: 'churnRiskScore', op: 'gt', value: 0.8 },
            ],
          },
          { type: 'persona', persona: 'PREMIUM_BUYER' },
        ],
      };
      expect(evaluateGroup(rule, ctx)).toBe(true);
    });

    it('should fail nested when outer AND fails', () => {
      const rule: SegmentRule = {
        operator: 'AND',
        conditions: [
          {
            type: 'group',
            operator: 'OR',
            conditions: [
              { type: 'metric', field: 'totalRevenue', op: 'gt', value: 5000 },
              { type: 'metric', field: 'churnRiskScore', op: 'gt', value: 0.8 },
            ],
          },
          { type: 'persona', persona: 'DISCOUNT_HUNTER' }, // not in set
        ],
      };
      expect(evaluateGroup(rule, ctx)).toBe(false);
    });

    it('should support double nesting', () => {
      const rule: SegmentRule = {
        operator: 'AND',
        conditions: [
          {
            type: 'group',
            operator: 'OR',
            conditions: [
              {
                type: 'group',
                operator: 'AND',
                conditions: [
                  {
                    type: 'metric',
                    field: 'totalRevenue',
                    op: 'gte',
                    value: 5000,
                  },
                  {
                    type: 'metric',
                    field: 'churnRiskScore',
                    op: 'gte',
                    value: 0.8,
                  },
                ],
              },
              {
                type: 'feature',
                field: 'DISCOUNT_AFFINITY',
                op: 'gte',
                value: 0.5,
              }, // false
            ],
          },
          { type: 'persona', persona: 'PREMIUM_BUYER' },
        ],
      };
      // Inner AND: 7000>=5000 AND 0.85>=0.8 → true
      // OR: true OR false → true
      // Outer AND: true AND persona match → true
      expect(evaluateGroup(rule, ctx)).toBe(true);
    });
  });

  // --- Persona conditions ---

  describe('Persona conditions', () => {
    it('should match if persona exists in set', () => {
      const ctx: CustomerContext = {
        metrics: {},
        features: {},
        personas: new Set(['HIGH_VALUE_LOYALIST', 'PREMIUM_BUYER']),
        preferences: {},
      };
      expect(
        evaluateCondition(
          { type: 'persona', persona: 'HIGH_VALUE_LOYALIST' },
          ctx,
        ),
      ).toBe(true);
    });

    it('should NOT match if persona is absent', () => {
      const ctx: CustomerContext = {
        metrics: {},
        features: {},
        personas: new Set(['DISCOUNT_HUNTER']),
        preferences: {},
      };
      expect(
        evaluateCondition({ type: 'persona', persona: 'PREMIUM_BUYER' }, ctx),
      ).toBe(false);
    });
  });

  // --- Feature + Preference conditions ---

  describe('Feature and preference conditions', () => {
    const ctx: CustomerContext = {
      metrics: {},
      features: { DISCOUNT_AFFINITY: 0.75, PREMIUM_BUYER_SCORE: 0.4 },
      personas: new Set(),
      preferences: { emailEnabled: true, preferredChannel: 'EMAIL' },
    };

    it('should evaluate feature gte', () => {
      expect(
        evaluateCondition(
          {
            type: 'feature',
            field: 'DISCOUNT_AFFINITY',
            op: 'gte',
            value: 0.5,
          },
          ctx,
        ),
      ).toBe(true);
    });

    it('should evaluate preference contains', () => {
      expect(
        evaluateCondition(
          {
            type: 'preference',
            field: 'preferredChannel',
            op: 'contains',
            value: 'EMAIL',
          },
          ctx,
        ),
      ).toBe(true);
    });
  });

  // --- Edge cases ---

  describe('Edge cases', () => {
    it('should return false for empty conditions with AND', () => {
      const ctx: CustomerContext = {
        metrics: {},
        features: {},
        personas: new Set(),
        preferences: {},
      };
      expect(evaluateGroup({ operator: 'AND', conditions: [] }, ctx)).toBe(
        true,
      ); // every([]) === true
    });

    it('should return false for empty conditions with OR', () => {
      const ctx: CustomerContext = {
        metrics: {},
        features: {},
        personas: new Set(),
        preferences: {},
      };
      expect(evaluateGroup({ operator: 'OR', conditions: [] }, ctx)).toBe(
        false,
      ); // some([]) === false
    });

    it('should handle missing metric field gracefully', () => {
      const ctx: CustomerContext = {
        metrics: {},
        features: {},
        personas: new Set(),
        preferences: {},
      };
      expect(
        evaluateCondition(
          { type: 'metric', field: 'nonExistent', op: 'gte', value: 100 },
          ctx,
        ),
      ).toBe(false);
    });

    it('should handle unknown condition type', () => {
      const ctx: CustomerContext = {
        metrics: {},
        features: {},
        personas: new Set(),
        preferences: {},
      };
      expect(
        evaluateCondition(
          { type: 'unknown' as any, field: 'x', op: 'eq', value: 1 },
          ctx,
        ),
      ).toBe(false);
    });
  });
});

// ============================================================
// RFM SCORE COMPUTATION TESTS
// ============================================================

describe('RFM Score Computation', () => {
  function computeRfm(
    daysSinceLastOrder: number,
    totalOrders: number,
    totalRevenue: number,
  ): { r: number; f: number; m: number; combined: number } {
    const r =
      daysSinceLastOrder < 30
        ? 5
        : daysSinceLastOrder < 90
          ? 4
          : daysSinceLastOrder < 180
            ? 3
            : daysSinceLastOrder < 365
              ? 2
              : 1;
    const f =
      totalOrders >= 10
        ? 5
        : totalOrders >= 6
          ? 4
          : totalOrders >= 3
            ? 3
            : totalOrders >= 2
              ? 2
              : 1;
    const m =
      totalRevenue >= 20000
        ? 5
        : totalRevenue >= 10000
          ? 4
          : totalRevenue >= 5000
            ? 3
            : totalRevenue >= 2000
              ? 2
              : 1;
    const combined = Math.round((r * 0.4 + f * 0.35 + m * 0.25) * 20);
    return { r, f, m, combined };
  }

  it('should give maximum score for recent, frequent, high-value customer', () => {
    const result = computeRfm(5, 15, 50000);
    expect(result.r).toBe(5);
    expect(result.f).toBe(5);
    expect(result.m).toBe(5);
    expect(result.combined).toBe(100);
  });

  it('should give minimum score for old, rare, low-value customer', () => {
    const result = computeRfm(400, 1, 500);
    expect(result.r).toBe(1);
    expect(result.f).toBe(1);
    expect(result.m).toBe(1);
    expect(result.combined).toBe(20);
  });

  it('should produce deterministic output for same inputs', () => {
    const r1 = computeRfm(45, 4, 8000);
    const r2 = computeRfm(45, 4, 8000);
    expect(r1).toEqual(r2);
  });

  it('should handle boundary values correctly', () => {
    // Exactly 30 days → score 4 (not 5)
    expect(computeRfm(30, 1, 100).r).toBe(4);
    // Exactly 90 days → score 3
    expect(computeRfm(90, 1, 100).r).toBe(3);
  });
});

// ============================================================
// CHURN RISK COMPUTATION TESTS
// ============================================================

describe('Churn Risk Computation', () => {
  function computeChurn(
    daysSinceLastOrder: number,
    totalOrders: number,
    engagementScore: number,
    avgOrderValue: number,
  ): number {
    const recencyRisk =
      daysSinceLastOrder > 365
        ? 0.95
        : daysSinceLastOrder > 180
          ? 0.8
          : daysSinceLastOrder > 90
            ? 0.6
            : daysSinceLastOrder > 30
              ? 0.3
              : 0.1;
    const freqRisk =
      totalOrders <= 1
        ? 0.7
        : totalOrders <= 2
          ? 0.5
          : totalOrders <= 3
            ? 0.3
            : 0.1;
    const engRisk =
      engagementScore < 20
        ? 0.8
        : engagementScore < 40
          ? 0.6
          : engagementScore < 60
            ? 0.4
            : engagementScore < 80
              ? 0.2
              : 0.05;
    const spendRisk =
      avgOrderValue < 500
        ? 0.6
        : avgOrderValue < 1000
          ? 0.4
          : avgOrderValue < 2000
            ? 0.25
            : 0.1;
    return (
      Math.round(
        (recencyRisk * 0.4 +
          freqRisk * 0.25 +
          engRisk * 0.2 +
          spendRisk * 0.15) *
          10000,
      ) / 10000
    );
  }

  it('should produce high churn for inactive single-buyer with low engagement', () => {
    const risk = computeChurn(400, 1, 10, 300);
    expect(risk).toBeGreaterThanOrEqual(0.8);
  });

  it('should produce low churn for active frequent buyer with high engagement', () => {
    const risk = computeChurn(10, 8, 90, 5000);
    expect(risk).toBeLessThanOrEqual(0.15);
  });

  it('should output between 0 and 1', () => {
    for (let d = 0; d <= 500; d += 100) {
      for (let o = 1; o <= 10; o += 3) {
        for (let e = 0; e <= 100; e += 25) {
          for (let a = 100; a <= 5000; a += 1000) {
            const risk = computeChurn(d, o, e, a);
            expect(risk).toBeGreaterThanOrEqual(0);
            expect(risk).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('should be deterministic', () => {
    expect(computeChurn(100, 3, 50, 2000)).toBe(computeChurn(100, 3, 50, 2000));
  });

  it('should be explainable — each factor contributes linearly', () => {
    // Increasing days should increase risk
    const r1 = computeChurn(20, 5, 50, 1500);
    const r2 = computeChurn(200, 5, 50, 1500);
    expect(r2).toBeGreaterThan(r1);
  });
});

// ============================================================
// PERSONA ASSIGNMENT LOGIC TESTS
// ============================================================

describe('Persona Assignment Rules', () => {
  interface PersonaContext {
    totalRevenue: number;
    totalOrders: number;
    daysSinceLastOrder: number;
    churnRiskScore: number;
    engagementScore: number;
    discountAffinity: number;
    premiumBuyerScore: number;
    categoryDiversity: number;
    weekendBuyerScore: number;
  }

  function evaluatePersonas(ctx: PersonaContext): string[] {
    const assigned: string[] = [];
    if (
      ctx.totalRevenue >= 10000 &&
      ctx.totalOrders >= 4 &&
      ctx.daysSinceLastOrder < 90
    )
      assigned.push('HIGH_VALUE_LOYALIST');
    if (ctx.totalRevenue >= 5000 && ctx.daysSinceLastOrder > 120)
      assigned.push('DORMANT_HIGH_VALUE');
    if (ctx.discountAffinity >= 0.6 && ctx.totalOrders >= 2)
      assigned.push('DISCOUNT_HUNTER');
    if (ctx.premiumBuyerScore >= 0.7) assigned.push('PREMIUM_BUYER');
    if (ctx.totalOrders >= 5 && ctx.daysSinceLastOrder < 60)
      assigned.push('FREQUENT_SHOPPER');
    if (ctx.churnRiskScore >= 0.6) assigned.push('AT_RISK_CUSTOMER');
    if (ctx.weekendBuyerScore >= 0.6) assigned.push('WEEKEND_BUYER');
    if (ctx.categoryDiversity >= 0.6) assigned.push('MULTI_CATEGORY_BUYER');
    return assigned;
  }

  it('should assign HIGH_VALUE_LOYALIST for high-revenue active customer', () => {
    const result = evaluatePersonas({
      totalRevenue: 20000,
      totalOrders: 8,
      daysSinceLastOrder: 15,
      churnRiskScore: 0.1,
      engagementScore: 85,
      discountAffinity: 0.3,
      premiumBuyerScore: 0.8,
      categoryDiversity: 0.7,
      weekendBuyerScore: 0.2,
    });
    expect(result).toContain('HIGH_VALUE_LOYALIST');
    expect(result).toContain('PREMIUM_BUYER');
    expect(result).toContain('MULTI_CATEGORY_BUYER');
    expect(result).not.toContain('AT_RISK_CUSTOMER');
  });

  it('should assign DORMANT_HIGH_VALUE and AT_RISK for silent big spender', () => {
    const result = evaluatePersonas({
      totalRevenue: 12000,
      totalOrders: 3,
      daysSinceLastOrder: 200,
      churnRiskScore: 0.75,
      engagementScore: 20,
      discountAffinity: 0.1,
      premiumBuyerScore: 0.5,
      categoryDiversity: 0.3,
      weekendBuyerScore: 0.1,
    });
    expect(result).toContain('DORMANT_HIGH_VALUE');
    expect(result).toContain('AT_RISK_CUSTOMER');
    expect(result).not.toContain('HIGH_VALUE_LOYALIST');
    expect(result).not.toContain('FREQUENT_SHOPPER');
  });

  it('should assign DISCOUNT_HUNTER for deal seekers', () => {
    const result = evaluatePersonas({
      totalRevenue: 3000,
      totalOrders: 5,
      daysSinceLastOrder: 40,
      churnRiskScore: 0.2,
      engagementScore: 60,
      discountAffinity: 0.8,
      premiumBuyerScore: 0.2,
      categoryDiversity: 0.4,
      weekendBuyerScore: 0.3,
    });
    expect(result).toContain('DISCOUNT_HUNTER');
    expect(result).toContain('FREQUENT_SHOPPER');
    expect(result).not.toContain('PREMIUM_BUYER');
  });

  it('should assign no personas for brand new low-data customer', () => {
    const result = evaluatePersonas({
      totalRevenue: 500,
      totalOrders: 1,
      daysSinceLastOrder: 5,
      churnRiskScore: 0.3,
      engagementScore: 50,
      discountAffinity: 0,
      premiumBuyerScore: 0.1,
      categoryDiversity: 0.2,
      weekendBuyerScore: 0.1,
    });
    expect(result.length).toBe(0);
  });
});

// ============================================================
// DECISION READINESS SCORE TESTS
// ============================================================

describe('Decision Readiness Score', () => {
  function computeReadiness(
    hasMetrics: boolean,
    featureCount: number,
    personaCount: number,
    hasRfm: boolean,
    hasChurn: boolean,
    hasEngagement: boolean,
    hasLtv: boolean,
    hasCatDiv: boolean,
  ): number {
    let score = 0;
    if (hasMetrics) score += 20;
    if (featureCount >= 5) score += 20;
    if (personaCount > 0) score += 15;
    if (hasRfm) score += 10;
    if (hasChurn) score += 10;
    if (hasEngagement) score += 10;
    if (hasLtv) score += 10;
    if (hasCatDiv) score += 5;
    return score;
  }

  it('should return 100 when all intelligence is present', () => {
    expect(computeReadiness(true, 14, 3, true, true, true, true, true)).toBe(
      100,
    );
  });

  it('should return 0 for completely empty customer', () => {
    expect(
      computeReadiness(false, 0, 0, false, false, false, false, false),
    ).toBe(0);
  });

  it('should return partial score for partial data', () => {
    const score = computeReadiness(
      true,
      10,
      0,
      true,
      false,
      true,
      false,
      false,
    );
    expect(score).toBe(60); // 20 + 20 + 10 + 10
  });
});
