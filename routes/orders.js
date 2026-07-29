const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const { requireRole } = require('../middleware/auth');

// Customer: place an order
// Expected body: { items: [{ productId, quantity }] }
router.post('/', requireRole('customer'), async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must include at least one item.' });
  }

  try {
    const orderItems = [];
    let totalAmount = 0;
    const decrementedProducts = []; // track for rollback if a later item fails

    for (const { productId, quantity } of items) {
      if (!quantity || quantity < 1) {
        await rollback(decrementedProducts);
        return res.status(400).json({ error: 'Invalid quantity for one of the items.' });
      }

      // Atomic check-and-decrement: only succeeds if enough stock remains,
      // which prevents two customers from overselling the last unit.
      const product = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!product) {
        await rollback(decrementedProducts);
        return res.status(409).json({ error: 'One of the items no longer has enough stock.' });
      }

      decrementedProducts.push({ id: product._id, quantity });
      orderItems.push({
        product: product._id,
        name: product.name,
        quantity,
        priceAtOrder: product.price
      });
      totalAmount += product.price * quantity;
    }

    const order = new Order({
      customer: req.session.userId,
      items: orderItems,
      totalAmount
    });
    await order.save();

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not place order.' });
  }
});

// Roll back stock decrements if a later item in the same order fails
async function rollback(decrementedProducts) {
  for (const { id, quantity } of decrementedProducts) {
    await Product.findByIdAndUpdate(id, { $inc: { stock: quantity } });
  }
}

// Customer: view own order history
router.get('/mine', requireRole('customer'), async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.session.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Could not load your orders.' });
  }
});

module.exports = router;
