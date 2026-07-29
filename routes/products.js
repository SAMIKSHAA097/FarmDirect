const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { requireRole } = require('../middleware/auth');

// Public: browse all products (customer-facing)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('farmer', 'name').sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Could not load products.' });
  }
});

// Farmer: view own listings
router.get('/mine', requireRole('farmer'), async (req, res) => {
  try {
    const products = await Product.find({ farmer: req.session.userId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Could not load your listings.' });
  }
});

// Farmer: add a new listing
router.post('/', requireRole('farmer'), async (req, res) => {
  try {
    const { name, description, category, price, stock, unit } = req.body;
    if (!name || price == null || stock == null) {
      return res.status(400).json({ error: 'Name, price, and stock are required.' });
    }
    const product = new Product({
      farmer: req.session.userId,
      name, description, category, price, stock, unit
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Could not create listing.' });
  }
});

// Farmer: update own listing (price/stock/etc.)
router.put('/:id', requireRole('farmer'), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, farmer: req.session.userId });
    if (!product) return res.status(404).json({ error: 'Listing not found.' });

    const { name, description, category, price, stock, unit } = req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (unit !== undefined) product.unit = unit;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Could not update listing.' });
  }
});

// Farmer: delete own listing
router.delete('/:id', requireRole('farmer'), async (req, res) => {
  try {
    const result = await Product.findOneAndDelete({ _id: req.params.id, farmer: req.session.userId });
    if (!result) return res.status(404).json({ error: 'Listing not found.' });
    res.json({ message: 'Listing removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete listing.' });
  }
});

module.exports = router;
