const { verifyToken } = require('../services/auth');
const { httpError } = require('./errorHandler');

function authOptional(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  req.user = token ? verifyToken(token) : null;
  next();
}

function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return next(httpError(401, 'Login required'));
    next();
  });
}

function adminOnly(req, res, next) {
  authRequired(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return next(httpError(403, 'Admin only'));
    }
    next();
  });
}

module.exports = { authOptional, authRequired, adminOnly };
