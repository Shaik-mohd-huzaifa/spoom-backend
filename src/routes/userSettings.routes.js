const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { validateUserSettings } = require('../validators/userSettingsValidator');

/**
 * @route GET /api/user-settings
 * @description Get user settings for the authenticated user
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user settings from database
    const userSettings = await db.getUserSettings(userId);
    
    if (!userSettings) {
      return res.status(404).json({
        success: false,
        message: 'User settings not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: userSettings
    });
  } catch (error) {
    console.error('Error getting user settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving user settings',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/user-settings
 * @description Update user settings
 * @access Private
 */
router.put('/', authenticateToken, validateUserSettings, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      theme,
      language,
      notificationsEnabled,
      emailNotifications,
      pushNotifications,
      desktopNotifications,
      privacySettings
    } = req.body;
    
    // Update user settings in database
    const updatedSettings = await db.upsertUserSettings(
      userId,
      {
        theme,
        language,
        notificationsEnabled,
        emailNotifications,
        pushNotifications,
        desktopNotifications,
        privacySettings
      }
    );
    
    return res.status(200).json({
      success: true,
      message: 'User settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating user settings',
      error: error.message
    });
  }
});

/**
 * @route PATCH /api/user-settings/theme
 * @description Update user theme
 * @access Private
 */
router.patch('/theme', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { theme } = req.body;
    
    if (!theme) {
      return res.status(400).json({
        success: false,
        message: 'Theme is required'
      });
    }
    
    // Update just the theme
    const updatedSettings = await db.upsertUserSettings(
      userId,
      { theme }
    );
    
    return res.status(200).json({
      success: true,
      message: 'User theme updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating user theme:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating user theme',
      error: error.message
    });
  }
});

/**
 * @route PATCH /api/user-settings/notifications
 * @description Update user notification settings
 * @access Private
 */
router.patch('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      notificationsEnabled,
      emailNotifications,
      pushNotifications,
      desktopNotifications
    } = req.body;
    
    // Update just the notification settings
    const updatedSettings = await db.upsertUserSettings(
      userId,
      {
        notificationsEnabled,
        emailNotifications,
        pushNotifications,
        desktopNotifications
      }
    );
    
    return res.status(200).json({
      success: true,
      message: 'User notification settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating user notification settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating user notification settings',
      error: error.message
    });
  }
});

/**
 * @route PATCH /api/user-settings/privacy
 * @description Update user privacy settings
 * @access Private
 */
router.patch('/privacy', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { privacySettings } = req.body;
    
    if (!privacySettings) {
      return res.status(400).json({
        success: false,
        message: 'Privacy settings are required'
      });
    }
    
    // Update just the privacy settings
    const updatedSettings = await db.upsertUserSettings(
      userId,
      { privacySettings }
    );
    
    return res.status(200).json({
      success: true,
      message: 'User privacy settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating user privacy settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating user privacy settings',
      error: error.message
    });
  }
});

module.exports = router;
