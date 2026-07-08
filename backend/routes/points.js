const express = require('express');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Redemption = require('../models/Redemption');
const requireAuth = require('../middleware/auth');
const { generateCouponCode, canRedeem } = require('../utils/pointsLogic');

const router = express.Router();

const REDEMPTION_THRESHOLD = Number(process.env.REDEMPTION_THRESHOLD || 50);

// Get current point balance
router.get('/balance', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ points: user.points, redemptionThreshold: REDEMPTION_THRESHOLD });
});

// Redeem points for a coupon at a specific shop
router.post('/redeem', requireAuth, async (req, res) => {
  try {
    const { shopId, pointsToSpend } = req.body;
    if (!shopId) return res.status(400).json({ error: 'shopId is required' });

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const spend = pointsToSpend ? Number(pointsToSpend) : REDEMPTION_THRESHOLD;
    if (!Number.isFinite(spend) || spend < REDEMPTION_THRESHOLD) {
      return res.status(400).json({ error: `Minimum redemption is ${REDEMPTION_THRESHOLD} points` });
    }
    // Quick pre-check for a friendlier error message; the real guard against
    // over-redemption (including races) is the atomic findOneAndUpdate below.
    const preCheckUser = await User.findById(req.userId);
    const preCheck = canRedeem(preCheckUser ? preCheckUser.points : 0, spend, REDEMPTION_THRESHOLD);
    if (!preCheck.ok) return res.status(400).json({ error: preCheck.reason });

    // Atomic conditional update: only decrements if user currently has enough points.
    // This prevents a race where two simultaneous requests both pass a naive
    // "check then update" and cause a negative balance.
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.userId, points: { $gte: spend } },
      { $inc: { points: -spend } },
      { new: true }
    );

    if (!updatedUser) {
      // Either points were insufficient, or a concurrent request already spent them
      const current = await User.findById(req.userId);
      return res.status(400).json({
        error: 'Insufficient points for this redemption',
        currentPoints: current ? current.points : 0,
      });
    }

    const couponCode = generateCouponCode();
    const redemption = await Redemption.create({
      user: req.userId,
      shop: shopId,
      pointsSpent: spend,
      couponCode,
    });

    res.status(201).json({
      couponCode,
      pointsSpent: spend,
      newPointsBalance: updatedUser.points,
      redemptionId: redemption._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to redeem points' });
  }
});

// Redemption history for the logged-in user
router.get('/history', requireAuth, async (req, res) => {
  const history = await Redemption.find({ user: req.userId })
    .populate('shop', 'name')
    .sort({ createdAt: -1 });
  res.json(history);
});

// Leaderboard (stretch goal)
router.get('/leaderboard', async (req, res) => {
  const top = await User.find({}).sort({ points: -1 }).limit(10).select('name email points');
  res.json(top);
});

module.exports = router;
