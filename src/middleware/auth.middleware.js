const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { userPoolId, region } = require('../config/aws-cognito.config');

// Create a JWKS client to fetch the JSON Web Key Set (JWKS)
const client = jwksClient({
  jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
});

// Function to get the signing key
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Error getting signing key:', err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  // Verify token
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }

    // Add user from payload
    req.user = decoded;
    next();
  });
};

// Middleware to check user role
const checkRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    if (roles.length && !roles.includes(req.user['cognito:groups']?.[0])) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions.' 
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkRole
};
