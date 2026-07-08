const { computePointsAwarded, canRedeem, generateCouponCode } = require('../utils/pointsLogic');

describe('computePointsAwarded', () => {
  test('awards the first-review bonus when shop has zero existing reviews', () => {
    expect(computePointsAwarded(0, { perReview: 10, firstReviewBonus: 15 })).toBe(15);
  });

  test('awards the standard amount when shop already has reviews', () => {
    expect(computePointsAwarded(1, { perReview: 10, firstReviewBonus: 15 })).toBe(10);
    expect(computePointsAwarded(50, { perReview: 10, firstReviewBonus: 15 })).toBe(10);
  });

  test('uses default point values when none provided', () => {
    expect(computePointsAwarded(0)).toBe(15);
    expect(computePointsAwarded(3)).toBe(10);
  });

  test('throws on a negative existing count (invalid input)', () => {
    expect(() => computePointsAwarded(-1)).toThrow();
  });
});

describe('canRedeem', () => {
  test('rejects a spend below the threshold', () => {
    const result = canRedeem(100, 30, 50);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Minimum redemption/);
  });

  test('rejects when the user does not have enough points', () => {
    const result = canRedeem(40, 50, 50);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Insufficient points/);
  });

  test('allows redemption when points are exactly at the threshold', () => {
    expect(canRedeem(50, 50, 50)).toEqual({ ok: true });
  });

  test('allows redemption when the user has more than enough points', () => {
    expect(canRedeem(200, 50, 50)).toEqual({ ok: true });
  });

  test('rejects redeeming more points than the user owns even above threshold', () => {
    // e.g. user has 60, tries to redeem 100 (an attempted over-redemption)
    const result = canRedeem(60, 100, 50);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Insufficient points/);
  });
});

describe('generateCouponCode', () => {
  test('matches the CHAI-XXXXXX format', () => {
    const code = generateCouponCode();
    expect(code).toMatch(/^CHAI-[A-Z0-9]{6}$/);
  });

  test('avoids ambiguous characters (0, O, 1, I) in the random suffix', () => {
    const code = generateCouponCode();
    const suffix = code.replace('CHAI-', '');
    expect(suffix).not.toMatch(/[01OI]/);
  });

  test('is deterministic when given a fixed random source (always picks first char)', () => {
    const code = generateCouponCode(() => 0);
    expect(code).toBe('CHAI-AAAAAA');
  });
});
