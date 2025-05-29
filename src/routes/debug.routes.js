const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

// Debug endpoint to view cookies and auth state
router.get('/cookies', (req, res) => {
  try {
    // Return a list of all cookies in the request
    const cookies = req.cookies || {};
    
    res.json({
      success: true,
      message: 'Debug info',
      data: {
        cookies: Object.keys(cookies),
        cookieDetails: Object.entries(cookies).map(([key, value]) => ({
          name: key,
          value: key.includes('Token') ? '****' : value, // Mask token values
          present: !!value
        }))
      }
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving debug info'
    });
  }
});

// Debug endpoint to check auth status
router.get('/auth-status', auth.optionalAuth, (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Auth status',
      data: {
        isAuthenticated: !!req.user,
        userInfo: req.user ? {
          id: req.user.id,
          email: req.user.email
        } : null,
        tokenPresent: !!req.token
      }
    });
  } catch (error) {
    console.error('Auth status route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving auth status'
    });
  }
});

module.exports = router;
