const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

// Authentication routes
// Handle sign-in
router.post('/signin', authController.signIn);

// Handle registration
router.post('/signup', authController.signUp);
router.post('/register', authController.signUp); // Legacy route compatibility

// Handle email verification
router.post('/confirm-signup', authController.confirmSignUp);

// Handle password reset requests
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.confirmForgotPassword);

// Get current user profile
router.get('/user', auth.authenticateToken, authController.getUserInfo);

// Handle sign-out
router.post('/signout', auth.authenticateToken, authController.signOut);

module.exports = router;
