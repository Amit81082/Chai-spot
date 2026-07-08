const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Shop = require('../models/Shop');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const { computePointsAwarded } = require('../utils/pointsLogic');

const router = express.Router();

const POINTS_PER_REVIEW = Number(process.env.POINTS_PER_REVIEW || 10);
const POINTS_FIRST_REVIEW_BONUS = Number(process.env.POINTS_FIRST_REVIEW_BONUS || 15);

async function recomputeShopRating(shopId) {
  const stats = await Review.aggregate([
    { $match: { shop: new mongoose.Types.ObjectId(shopId) } },
    { $group: { _id: '$shop', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const avgRating = stats.length ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const reviewCount = stats.length ? stats[0].count : 0;

  await Shop.findByIdAndUpdate(shopId, { avgRating, reviewCount });
  return { avgRating, reviewCount };
}

// Get all reviews for a shop
router.get('/shop/:shopId', async (req, res) => {
  try {
    const reviews = await Review.find({ shop: req.params.shopId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(400).json({ error: 'Invalid shop id' });
  }
});

// Create a review (blocks duplicates, awards points)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { shopId, rating, text } = req.body;
    if (!shopId || rating === undefined) {
      return res.status(400).json({ error: 'shopId and rating are required' });
    }
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // Determine bonus BEFORE inserting this review
    const existingReviewCountForShop = await Review.countDocuments({ shop: shopId });
    const pointsAwarded = computePointsAwarded(existingReviewCountForShop, {
      perReview: POINTS_PER_REVIEW,
      firstReviewBonus: POINTS_FIRST_REVIEW_BONUS,
    });

    let review;
    try {
      review = await Review.create({
        shop: shopId,
        user: req.userId,
        rating: numRating,
        text: text ? text.trim() : '',
      });
    } catch (err) {
      if (err.code === 11000) {
        // Unique index on (shop, user) caught a duplicate -> user already reviewed this shop
        return res.status(409).json({ error: 'You already reviewed this shop. Edit your existing review instead.' });
      }
      throw err;
    }

    const { avgRating, reviewCount } = await recomputeShopRating(shopId);

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { points: pointsAwarded } },
      { new: true }
    );

    res.status(201).json({
      review,
      pointsAwarded,
      newPointsBalance: user.points,
      shop: { avgRating, reviewCount },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Edit an existing review (no additional points awarded)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { rating, text } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (String(review.user) !== String(req.userId)) {
      return res.status(403).json({ error: 'You can only edit your own review' });
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
      }
      review.rating = numRating;
    }
    if (text !== undefined) review.text = text.trim();

    await review.save();
    const { avgRating, reviewCount } = await recomputeShopRating(review.shop);

    res.json({ review, shop: { avgRating, reviewCount } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

module.exports = router;
