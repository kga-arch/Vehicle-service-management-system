const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('Auth Middleware - Cookies:', req.cookies);
    console.log('Auth Middleware - Headers:', req.headers);
    
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth Middleware - No token found');
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    console.log('Auth Middleware - Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth Middleware - Token decoded:', { userId: decoded.userId });

    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      console.log('Auth Middleware - User not found for token');
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    console.log('Auth Middleware - User found:', { userId: user._id, role: user.role });
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware - Error:', error);
    res.status(401).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Invalid token'
    });
  }
};

module.exports = { authMiddleware };