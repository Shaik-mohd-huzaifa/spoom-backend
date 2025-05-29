require('dotenv').config();

// Import specific configurations
const awsCognitoConfig = require('./aws-cognito.config');
const dbConfig = require('./db.config');

// Main configuration object
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // Server configuration
  server: {
    port: process.env.PORT || 5000,
    baseUrl: process.env.BASE_URL || 'http://localhost:5000',
    apiVersion: process.env.API_VERSION || 'v1',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000']
  },
  
  // AWS Configuration
  aws: {
    region: awsCognitoConfig.region,
    cognitoUserPoolId: awsCognitoConfig.userPoolId,
    cognitoClientId: awsCognitoConfig.clientId,
    cognitoClientSecret: awsCognitoConfig.clientSecret,
    cognitoIdentityPoolId: awsCognitoConfig.identityPoolId,
    accessKeyId: awsCognitoConfig.accessKeyId,
    secretAccessKey: awsCognitoConfig.secretAccessKey
  },
  
  // Database configuration
  db: dbConfig,
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  
  // Cookie configuration
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;
