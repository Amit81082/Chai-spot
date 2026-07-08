const express = require('express');
const Shop = require('../models/Shop');
const requireAuth = require('../middleware/auth');
const { geocodeAddress, getDirections } = require('../utils/geo');

const router = express.Router();

// Create a shop - geocodes the address server-side
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, address, description, photoUrl } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    let geo;
    try {
      geo = await geocodeAddress(address);
    } catch (err) {
      // Bad address / geocoding failure -> 422, not a 500
      return res.status(422).json({ error: err.message });
    }

    const shop = await Shop.create({
      name: name.trim(),
      address: address.trim(),
      description: description ? description.trim() : '',
      photoUrl: photoUrl ? photoUrl.trim() : '',
      location: { type: 'Point', coordinates: [geo.lng, geo.lat] },
      createdBy: req.userId,
    });

    res.status(201).json(shop);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create shop' });
  }
});

// List all shops (for map view)
router.get('/', async (req, res) => {
  try {
    const { search, minRating } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (minRating) filter.avgRating = { $gte: Number(minRating) };

    const shops = await Shop.find(filter).sort({ createdAt: -1 });
    res.json(shops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

// Get one shop
router.get('/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    res.json(shop);
  } catch (err) {
    res.status(400).json({ error: 'Invalid shop id' });
  }
});

// Get directions from a start point to this shop
router.post('/:id/directions', async (req, res) => {
  try {
    const { startLat, startLng } = req.body;
    if (startLat === undefined || startLng === undefined) {
      return res.status(400).json({ error: 'startLat and startLng are required (browser geolocation or manual entry)' });
    }

    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const [shopLng, shopLat] = shop.location.coordinates;

    try {
      const route = await getDirections(
        { lng: Number(startLng), lat: Number(startLat) },
        { lng: shopLng, lat: shopLat }
      );
      res.json(route);
    } catch (err) {
      // No route found between points, or Mapbox error
      return res.status(422).json({ error: err.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get directions' });
  }
});

module.exports = router;
