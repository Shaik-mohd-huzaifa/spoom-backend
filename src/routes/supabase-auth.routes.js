const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase.config');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
        },
      },
    });

    if (error) {
      console.error('Registration error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error registering user',
        error: error.code
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to confirm your account.',
      data: {
        userId: data.user.id
      }
    });
  } catch (error) {
    console.error('Unexpected error in /register:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Verify email with confirmation token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification token is required' 
      });
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      console.error('Verification failed:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Verification failed',
        error: error.code
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully.' 
    });
  } catch (err) {
    console.error('Unexpected error in /verify:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: err.message 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error logging in',
        error: error.code
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: new Date(data.session.expires_at).getTime() - Date.now(),
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata.name,
          emailVerified: data.user.email_confirmed_at !== null,
        }
      }
    });
  } catch (error) {
    console.error('Unexpected error in /login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error logging out',
        error: error.code
      });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (error) {
    console.error('Unexpected error in /logout:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Reset password request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:3000/reset-password',
    });

    if (error) {
      console.error('Password reset request error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error sending password reset email',
        error: error.code
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });
  } catch (error) {
    console.error('Unexpected error in /forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password is required' 
      });
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error resetting password',
        error: error.code
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Unexpected error in /reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      console.error('Token refresh error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error refreshing token',
        error: error.code
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: new Date(data.session.expires_at).getTime() - Date.now()
      }
    });
  } catch (error) {
    console.error('Unexpected error in /refresh-token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user profile
router.get('/me', async (req, res) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Error fetching user data:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: error?.code
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.user_metadata.name,
        emailVerified: user.email_confirmed_at !== null,
      }
    });
  } catch (error) {
    console.error('Unexpected error in /me:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
