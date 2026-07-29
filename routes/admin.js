const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('admin'));

// View all registered users
router.get('/users', async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});

// Remove a user
router.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User removed.' });
});

// View all product listings across all farmers
router.get('/products', async (req, res) => {
  const products = await Product.find().populate('farmer', 'name email').sort({ createdAt: -1 });
  res.json(products);
});

// Remove any listing
router.delete('/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Listing removed.' });
});

// View all orders across all customers
router.get('/orders', async (req, res) => {
  const orders = await Order.find().populate('customer', 'name email').sort({ createdAt: -1 });
  res.json(orders);
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json(order);
});

module.exports = router;
