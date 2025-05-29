const { body, validationResult } = require('express-validator');

// Validate workspace settings
const validateWorkspaceSettings = [
  body('notificationsEnabled')
    .optional()
    .isBoolean()
    .withMessage('Notifications enabled must be a boolean value'),
    
  body('privacyLevel')
    .optional()
    .isIn(['private', 'team', 'public'])
    .withMessage('Privacy level must be one of: private, team, public'),
    
  body('allowGuestAccess')
    .optional()
    .isBoolean()
    .withMessage('Allow guest access must be a boolean value'),
    
  body('domainRestrictions')
    .optional()
    .isArray()
    .withMessage('Domain restrictions must be an array'),
    
  body('domainRestrictions.*')
    .optional()
    .isString()
    .withMessage('Each domain restriction must be a string'),
    
  body('defaultUserRole')
    .optional()
    .isIn(['member', 'admin', 'guest'])
    .withMessage('Default user role must be one of: member, admin, guest'),
    
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
  validateWorkspaceSettings
};
