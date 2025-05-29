const { 
  CognitoIdentityProviderClient, 
  GetUserCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
const config = require('../config/config');

// Initialize Cognito client with credentials from config
const cognitoClient = new CognitoIdentityProviderClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  }
});

/**
 * Middleware to verify JWT tokens from AWS Cognito and fetch user from database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  // First check for token in cookies (for session persistence)
  const cookieToken = req.cookies?.accessToken;
  
  // Fall back to Authorization header if cookie not found
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  // Use cookie token if available, otherwise use header token
  const token = cookieToken || headerToken;
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token is required' 
    });
  }

  try {
    // Use AWS SDK to verify token and get user info
    const command = new GetUserCommand({
      AccessToken: token
    });
    
    // This will throw an error if the token is invalid
    const response = await cognitoClient.send(command);
    
    // Store token in the request for future use
    req.token = token;
    
    // Extract user attributes from Cognito response
    const userAttributes = {};
    response.UserAttributes.forEach(attr => {
      userAttributes[attr.Name] = attr.Value;
    });
    
    // Add user info to request
    req.user = {
      id: response.Username,
      email: userAttributes.email || '',
      name: userAttributes.name || '',
      emailVerified: userAttributes.email_verified === 'true'
    };
    
    // Store original Cognito response for potential use
    req.cognitoUser = {
      username: response.Username,
      attributes: userAttributes
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.message === 'Invalid or expired token' ||
        error.code === 'NotAuthorizedException') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to authenticate token',
      error: error.message
    });
  }
};

/**
 * Optional authentication - doesn't reject if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    // No token, continue without authentication
    req.user = null;
    req.token = null;
    return next();
  }

  try {
    // Use our Cognito service to verify and get user info
    const cognitoUser = await cognitoService.getCurrentUser(token);
    
    // Store token in the request for future use
    req.token = token;
    
    // Find user in our database by email
    const dbUser = await users.findByEmail(cognitoUser.email);
    
    if (dbUser) {
      // Add database user to request
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        isActive: dbUser.is_active,
        createdAt: dbUser.created_at
      };
    } else {
      // User in Cognito but not in our database - rare case
      req.user = null;
    }
    
    next();
  } catch (error) {
    // Token is invalid, but we don't reject
    console.error('Optional auth token error:', error);
    req.user = null;
    req.token = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
