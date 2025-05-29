const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Import AWS SDK
const { 
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand
} = require('@aws-sdk/client-cognito-identity-provider');

// Load environment variables
require('dotenv').config();

// Cognito configuration
const cognitoConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  clientSecret: process.env.COGNITO_CLIENT_SECRET
};

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: cognitoConfig.region
});

// Calculate SECRET_HASH
const calculateSecretHash = (username) => {
  const message = username + cognitoConfig.clientId;
  const hmac = crypto.createHmac('sha256', cognitoConfig.clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
};

// Authentication routes
// Sign In route
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Log request information for debugging
    console.log(`Sign-in attempt for email: ${email}`);
    
    // Calculate SECRET_HASH
    const secretHash = calculateSecretHash(email);
    
    // Prepare sign-in parameters
    const params = {
      ClientId: cognitoConfig.clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash
      }
    };
    
    console.log('Sending sign-in request to Cognito with params:', { 
      ClientId: params.ClientId,
      AuthFlow: params.AuthFlow,
      hasSecretHash: !!params.AuthParameters.SECRET_HASH,
      username: params.AuthParameters.USERNAME
    });
    
    try {
      const command = new InitiateAuthCommand(params);
      const result = await cognitoClient.send(command);
      console.log('Cognito authentication successful');
      // Extract user info from the ID token (JWT)
      const idToken = result.AuthenticationResult.IdToken;
      const tokenParts = idToken.split('.');
      
      // Get the payload part of the JWT (second part)
      if (tokenParts.length >= 2) {
        try {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          // Create a user object from the token claims
          const user = {
            id: payload.sub || '',
            email: payload.email || '',
            name: payload['cognito:username'] || '',
            emailVerified: payload.email_verified || false,
            username: payload['cognito:username'] || ''
          };
          
          return res.status(200).json({
            success: true,
            user,
            accessToken: result.AuthenticationResult.AccessToken,
            idToken: result.AuthenticationResult.IdToken,
            refreshToken: result.AuthenticationResult.RefreshToken,
            expiresIn: result.AuthenticationResult.ExpiresIn,
            message: 'Sign in successful'
          });
        } catch (parseError) {
          console.error('Error parsing ID token:', parseError);
          // If we can't parse the token, just return the tokens without user info
          return res.status(200).json({
            success: true,
            accessToken: result.AuthenticationResult.AccessToken,
            idToken: result.AuthenticationResult.IdToken,
            refreshToken: result.AuthenticationResult.RefreshToken,
            expiresIn: result.AuthenticationResult.ExpiresIn,
            message: 'Sign in successful (could not extract user info)'
          });
        }
      } else {
        // If token format is incorrect, just return the tokens
        return res.status(200).json({
          success: true,
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
          expiresIn: result.AuthenticationResult.ExpiresIn,
          message: 'Sign in successful'
        });
      }
    } catch (error) {
      console.error('Cognito authentication error:', error);
      
      // Handle specific AWS Cognito errors
      if (error.name === 'UserNotFoundException') {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      } else if (error.name === 'NotAuthorizedException') {
        return res.status(401).json({
          success: false,
          message: 'Incorrect username or password'
        });
      } else if (error.name === 'UserNotConfirmedException') {
        return res.status(401).json({
          success: false,
          needsConfirmation: true,
          message: 'Please confirm your email before signing in'
        });
      }
      
      // Generic error response
      return res.status(500).json({
        success: false,
        message: 'Authentication failed',
        error: error.message
      });
    }
    
    // This section is now handled in the try-catch block above
  } catch (error) {
    console.error('Sign-in error in route handler:', error);
    
    // Generic error response if we reach this point
    return res.status(500).json({
      success: false,
      message: 'Authentication failed due to server error',
      error: error.message
    });
  }
});

// Sign Up route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }
    
    // Calculate SECRET_HASH
    const secretHash = calculateSecretHash(email);
    
    // Prepare sign-up parameters
    const params = {
      ClientId: cognitoConfig.clientId,
      Username: email,
      Password: password,
      SecretHash: secretHash,
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'name',
          Value: name
        }
      ]
    };
    
    console.log('Sending sign-up request to Cognito...');
    const command = new SignUpCommand(params);
    const result = await cognitoClient.send(command);
    
    // Return successful response
    return res.status(201).json({
      success: true,
      userSub: result.UserSub,
      userConfirmed: result.UserConfirmed,
      message: 'User registered successfully. Please check your email for verification code.'
    });
  } catch (error) {
    console.error('Sign-up error:', error);
    
    // Handle specific AWS Cognito errors
    if (error.name === 'UsernameExistsException') {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    } else if (error.name === 'InvalidPasswordException') {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements'
      });
    }
    
    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Simple status endpoint to test connectivity
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    time: new Date().toISOString(),
    cognito: {
      region: cognitoConfig.region,
      userPoolId: cognitoConfig.userPoolId,
      clientId: cognitoConfig.clientId,
      hasClientSecret: !!cognitoConfig.clientSecret
    }
  });
});

/**
 * Test AWS Cognito connectivity
 * GET /api/auth/test-cognito
 */
router.get('/test-cognito', async (req, res) => {
  try {
    const { CognitoIdentityProviderClient, ListUserPoolsCommand } = require('@aws-sdk/client-cognito-identity-provider');
    
    // Create a test client
    const testClient = new CognitoIdentityProviderClient({
      region: cognitoConfig.region
    });
    
    // Test API call to list user pools (will validate credentials)
    const command = new ListUserPoolsCommand({ MaxResults: 1 });
    const result = await testClient.send(command);
    
    // Return successful test result
    return res.json({
      success: true,
      message: 'Successfully connected to AWS Cognito',
      poolCount: result.UserPools ? result.UserPools.length : 0,
      region: cognitoConfig.region,
      credentials: {
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
      },
      cognitoConfig: {
        hasUserPoolId: !!cognitoConfig.userPoolId,
        hasClientId: !!cognitoConfig.clientId,
        hasClientSecret: !!cognitoConfig.clientSecret
      }
    });
  } catch (error) {
    console.error('AWS Cognito connectivity test failed:', error);
    
    // Return error details
    return res.status(500).json({
      success: false,
      message: 'Failed to connect to AWS Cognito',
      error: error.message,
      errorType: error.name,
      region: cognitoConfig.region,
      credentials: {
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }
});

/**
 * Sign out a user
 * POST /api/auth/signout
 */
router.post('/signout', async (req, res) => {
  try {
    // Get token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(200).json({
        success: true,
        message: 'No active session to sign out'
      });
    }
    
    // In AWS Cognito, we should use the GlobalSignOut command
    // But for our simplified version, we'll just return success
    // as the frontend will clear the tokens
    
    console.log('User signed out successfully');
    
    return res.json({
      success: true,
      message: 'Signed out successfully'
    });
  } catch (error) {
    console.error('Sign-out error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error during sign out',
      error: error.message
    });
  }
});

module.exports = router;
