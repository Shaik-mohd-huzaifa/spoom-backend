const { body, validationResult } = require('express-validator');

// Validate user settings
const validateUserSettings = [
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be one of: light, dark, system'),
    
  body('language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'])
    .withMessage('Language must be a valid language code'),
    
  body('notificationsEnabled')
    .optional()
    .isBoolean()
    .withMessage('Notifications enabled must be a boolean value'),
    
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean value'),
    
  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be a boolean value'),
    
  body('desktopNotifications')
    .optional()
    .isBoolean()
    .withMessage('Desktop notifications must be a boolean value'),
    
  body('privacySettings')
    .optional()
    .isObject()
    .withMessage('Privacy settings must be an object'),
    
  body('privacySettings.shareStatus')
    .optional()
    .isBoolean()
    .withMessage('Share status must be a boolean value'),
    
  body('privacySettings.showOnlineStatus')
    .optional()
    .isBoolean()
    .withMessage('Show online status must be a boolean value'),
    
  body('privacySettings.allowDataCollection')
    .optional()
    .isBoolean()
    .withMessage('Allow data collection must be a boolean value'),
    
  // Middleware to handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateUserSettings
};
