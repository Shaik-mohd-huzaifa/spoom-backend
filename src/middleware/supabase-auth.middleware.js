const { supabase } = require('../config/supabase.config');

// Middleware to verify Supabase JWT token
const verifyToken = async (req, res, next) => {
  try {
    // First check for cookies - they have priority for better session persistence
    const sessionCookie = req.cookies?.supabase_auth_token;
    
    // Then fall back to Authorization header
    const headerToken = req.header('Authorization')?.replace('Bearer ', '');
    
    // Use cookie if available, otherwise use header token
    const token = sessionCookie || headerToken;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token found'
      });
    }

    // Set the auth token for this request
    if (typeof token === 'string') {
      // Simple token string from header
      supabase.auth.setSession(token);
    } else if (typeof token === 'object') {
      // JSON cookie with full session object
      supabase.auth.setSession({
        access_token: token.access_token,
        refresh_token: token.refresh_token
      });
    }
    
    // Get the user from the token
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Clear invalid cookies if they exist
      if (sessionCookie) {
        res.clearCookie('supabase_auth_token');
      }
      
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
    // Clear potentially corrupted cookies
    if (req.cookies?.supabase_auth_token) {
      res.clearCookie('supabase_auth_token');
    }
    
    return res.status(401).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
};

module.exports = { verifyToken };
