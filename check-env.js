// Check if required environment variables are set
require('dotenv').config();

// Check AWS Cognito configuration
const cognitoConfig = {
  region: process.env.AWS_REGION,
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  clientSecret: process.env.COGNITO_CLIENT_SECRET
};

// Print configuration status without exposing values
console.log('AWS Cognito Configuration Status:');
console.log(`AWS_REGION: ${cognitoConfig.region ? '✅ Set' : '❌ Missing'}`);
console.log(`COGNITO_USER_POOL_ID: ${cognitoConfig.userPoolId ? '✅ Set' : '❌ Missing'}`);
console.log(`COGNITO_CLIENT_ID: ${cognitoConfig.clientId ? '✅ Set' : '❌ Missing'}`);
console.log(`COGNITO_CLIENT_SECRET: ${cognitoConfig.clientSecret ? '✅ Set' : '❌ Missing'}`);

// Print masked values for debugging
if (cognitoConfig.userPoolId) {
  const maskedPoolId = cognitoConfig.userPoolId.substring(0, 3) + '...' + 
    cognitoConfig.userPoolId.substring(cognitoConfig.userPoolId.length - 3);
  console.log(`User Pool ID (masked): ${maskedPoolId}`);
}

if (cognitoConfig.clientId) {
  const maskedClientId = cognitoConfig.clientId.substring(0, 3) + '...' + 
    cognitoConfig.clientId.substring(cognitoConfig.clientId.length - 3);
  console.log(`Client ID (masked): ${maskedClientId}`);
}

if (cognitoConfig.clientSecret) {
  console.log(`Client Secret: ${cognitoConfig.clientSecret ? '(Present, length: ' + cognitoConfig.clientSecret.length + ')' : 'Missing'}`);
}

// Check AWS credentials
console.log('\nAWS Credentials Status:');
console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`);
