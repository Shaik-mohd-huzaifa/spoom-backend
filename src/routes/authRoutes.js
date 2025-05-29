const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Authentication routes
router.post('/signin', authController.signIn);
router.post('/signup', authController.signUp);
router.post('/confirm-signup', authController.confirmSignUp);
router.post('/forgot-password', authController.forgotPassword);
router.post('/confirm-forgot-password', authController.confirmForgotPassword);
router.get('/user', authController.getUserInfo);
router.post('/signout', authController.signOut);

module.exports = router;
