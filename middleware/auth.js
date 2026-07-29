// Require any logged-in user
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

// Require a specific role (or one of several roles)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Please log in first.' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
