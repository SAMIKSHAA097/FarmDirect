const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const allowedRoles = ['farmer', 'customer'];
    const user = new User({
      name,
      email,
      password,
      role: allowedRoles.includes(role) ? role : 'customer'
    });

    await user.save();

    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.name = user.name;

    res.status(201).json({ message: 'Registered successfully.', user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.name = user.name;

    res.json({ message: 'Logged in successfully.', user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong during login.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
});

// Current session info
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in.' });
  res.json({ id: req.session.userId, name: req.session.name, role: req.session.role });
});

module.exports = router;
