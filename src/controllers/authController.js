const cognitoService = require('../services/cognitoService');

/**
 * Handle user sign-in
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const result = await cognitoService.signIn(email, password);
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.error || 'Authentication failed'
      });
    }
    
    // Set secure HTTP cookies for tokens
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true, // Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production', // Secure in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: result.expiresIn * 1000, // Convert to milliseconds
      path: '/'
    });
  
    res.cookie('idToken', result.idToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: result.expiresIn * 1000, 
      path: '/' 
    });
  
    res.cookie('refreshToken', result.refreshToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/' 
    });
  
    // Also set a non-HttpOnly cookie for client-side auth check
    res.cookie('isAuthenticated', 'true', { 
      httpOnly: false, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: result.expiresIn * 1000,
      path: '/' 
    }); 
    
    // Still return tokens in the response for clients that prefer token-based auth
    res.json({
      success: true,
      accessToken: result.accessToken,
      idToken: result.idToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: {
        email: email,
        // Include any other user details available
      }
    });
  } catch (error) {
    console.error('Sign-in controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Handle user registration
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const signUp = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }
    
    const result = await cognitoService.signUp(email, password, name);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Registration failed'
      });
    }
    
    res.json({
      success: true,
      userSub: result.userSub,
      isConfirmed: result.isConfirmed,
      message: 'User registered successfully. Please check your email for verification code.'
    });
  } catch (error) {
    console.error('Sign-up controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
};

/**
 * Handle email verification
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const confirmSignUp = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }
    
    const result = await cognitoService.confirmSignUp(email, code);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Email verification failed'
      });
    }
    
    res.json({
      success: true,
      message: 'Email verified successfully. You can now sign in.'
    });
  } catch (error) {
    console.error('Confirm sign-up controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification'
    });
  }
};

/**
 * Initiate password reset
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const result = await cognitoService.forgotPassword(email);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Password reset request failed'
      });
    }
    
    res.json({
      success: true,
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    console.error('Forgot password controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password reset request'
    });
  }
};

/**
 * Complete password reset with code and new password
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const confirmForgotPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and new password are required'
      });
    }
    
    const result = await cognitoService.confirmForgotPassword(email, code, newPassword);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Password reset confirmation failed'
      });
    }
    
    res.json({
      success: true,
      message: 'Password reset successful. You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('Confirm forgot password controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password reset confirmation'
    });
  }
};

/**
 * Get current user information
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getUserInfo = async (req, res) => {
  try {
    // The access token is expected to be passed in the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No access token provided'
      });
    }
    
    const accessToken = authHeader.substring(7); // Remove "Bearer " prefix
    const result = await cognitoService.getUserInfo(accessToken);
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.error || 'Failed to retrieve user information'
      });
    }
    
    res.json({
      success: true,
      username: result.username,
      attributes: result.attributes
    });
  } catch (error) {
    console.error('Get user info controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving user information'
    });
  }
};

/**
 * Sign out a user
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const signOut = async (req, res) => {
  try {
    // Get token from cookies first (preferred for session persistence)
    const cookieAccessToken = req.cookies?.accessToken;
    
    // Fall back to header if cookie not available
    const authHeader = req.headers.authorization;
    let headerAccessToken = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      headerAccessToken = authHeader.substring(7); // Remove "Bearer " prefix
    }
    
    // Use cookie token if available, otherwise use header token
    const accessToken = cookieAccessToken || headerAccessToken;
    
    if (!accessToken) {
      // Clear cookies even if no token is provided (just in case)
      clearAuthCookies(res);
      
      return res.status(401).json({
        success: false,
        message: 'No access token provided'
      });
    }
    
    const result = await cognitoService.signOut(accessToken);
    
    // Clear auth cookies regardless of success - this ensures cookies are cleared
    // even if the Cognito sign-out failed
    clearAuthCookies(res);
    
    // If the sign-out failed, return an error after clearing cookies
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.error || 'Sign out failed'
      });
    }
    
    res.json({
      success: true,
      message: 'Signed out successfully'
    });
  } catch (error) {
    console.error('Sign out controller error:', error);
    
    // Clear auth cookies even on error
    clearAuthCookies(res);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during sign out'
    });
  }
};

/**
 * Helper function to clear all authentication cookies
 * @param {object} res - Express response object
 */
const clearAuthCookies = (res) => {
  // Clear all auth cookies with same settings as when they were created
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  };
  
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('idToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.clearCookie('isAuthenticated', {
    ...cookieOptions,
    httpOnly: false // Match the original setting
  });
};

module.exports = {
  signIn,
  signUp,
  confirmSignUp,
  forgotPassword,
  confirmForgotPassword,
  getUserInfo,
  signOut
};
