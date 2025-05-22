const { supabase } = require('../config/supabase.config');

// Middleware to verify Supabase JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Set the auth token for this request
    supabase.auth.setSession(token);
    
    // Get the user from the token
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: error?.message
      });
    }

    // Set the user in the request object
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
};

module.exports = { verifyToken };
