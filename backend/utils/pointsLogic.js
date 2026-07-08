/**
 * Pure functions for the points/redemption logic, kept separate from
 * Express/Mongoose so they're easy to unit test without a DB.
 */

function computePointsAwarded(existingReviewCountForShop, { perReview = 10, firstReviewBonus = 15 } = {}) {
  if (existingReviewCountForShop < 0) throw new Error('existingReviewCountForShop cannot be negative');
  return existingReviewCountForShop === 0 ? firstReviewBonus : perReview;
}

function canRedeem(currentPoints, spend, threshold) {
  if (spend < threshold) return { ok: false, reason: `Minimum redemption is ${threshold} points` };
  if (currentPoints < spend) return { ok: false, reason: 'Insufficient points for this redemption' };
  return { ok: true };
}

function generateCouponCode(random = Math.random) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoids ambiguous chars like 0/O, 1/I
  let code = 'CHAI-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(random() * chars.length)];
  }
  return code;
}

module.exports = { computePointsAwarded, canRedeem, generateCouponCode };
