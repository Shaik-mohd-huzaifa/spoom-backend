require('dotenv').config();

module.exports = {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'your-user-pool-id',
  clientId: process.env.COGNITO_CLIENT_ID || 'your-client-id',
  clientSecret: process.env.COGNITO_CLIENT_SECRET || 'your-client-secret',
  identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || 'your-identity-pool-id',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-access-key-id',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-secret-access-key',
};

// Make sure to set these environment variables in your .env file:
// AWS_REGION=your-region
// COGNITO_USER_POOL_ID=your-user-pool-id
// COGNITO_CLIENT_ID=your-client-id
// COGNITO_IDENTITY_POOL_ID=your-identity-pool-id
// AWS_ACCESS_KEY_ID=your-access-key-id
// AWS_SECRET_ACCESS_KEY=your-secret-access-key
