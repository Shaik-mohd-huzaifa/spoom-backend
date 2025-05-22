const express = require('express');
const router = express.Router();
const { CognitoIdentityServiceProvider } = require('aws-sdk');
const crypto = require('crypto');
const { 
  region, 
  userPoolId, 
  clientId, 
  clientSecret, 
  accessKeyId, 
  secretAccessKey 
} = require('../config/aws-cognito.config');

// Helper to generate Cognito SECRET_HASH
function generateSecretHash(username) {
  const message = username + clientId;
  return crypto.createHmac('sha256', clientSecret)
    .update(message)
    .digest('base64');
}

// Initialize Cognito service provider
const cognito = new CognitoIdentityServiceProvider({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});


// Register a new user
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  // Generate a username that is not an email (use name or email prefix + timestamp)
  let username = name && name.trim() ? name.trim().replace(/\s+/g, '_') : email.split('@')[0];
  username = username + '_' + Date.now();

  const params = {
    ClientId: clientId,
    Username: username,
    Password: password,
    SecretHash: generateSecretHash(username),
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name }
    ]
  };

  try {
    const data = await cognito.signUp(params).promise();
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to confirm your account.',
      data: {
        userId: data.UserSub
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error registering user',
      error: error.code
    });
  }
});

// Confirm user (verification)
router.post('/verify', async (req, res) => {
  console.log('Verify endpoint hit', req.body);
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required.' });
    }
    
    // Try to find the user by email first using ListUsers
    try {
      const listUsersParams = {
        UserPoolId: userPoolId,
        Filter: `email = "${email}"`
      };
      
      const listResult = await cognito.listUsers(listUsersParams).promise();
      console.log(`Found ${listResult.Users.length} users with email ${email}`);
      
      if (listResult.Users && listResult.Users.length > 0) {
        // Try to verify each user with this email
        let userVerified = false;
        for (const user of listResult.Users) {
          const username = user.Username;
          console.log(`Attempting to verify user: ${username}`);
          
          const params = {
            ClientId: clientId,
            Username: username,
            ConfirmationCode: code,
            SecretHash: generateSecretHash(username),
          };
          
          try {
            await cognito.confirmSignUp(params).promise();
            console.log('User confirmed:', username);
            userVerified = true;
            return res.status(200).json({ success: true, message: 'User confirmed successfully.' });
          } catch (error) {
            console.log(`Failed to verify ${username}: ${error.code} - ${error.message}`);
            // Continue trying with other users if available
          }
        }
        
        if (!userVerified) {
          console.log('All users with this email failed verification with the provided code');
        }
      }
    } catch (listError) {
      console.error('Error listing users by email:', listError);
      // Fall back to the timestamp-based approach if we can't list users
    }
    
    // Fall back to timestamp-based approach if ListUsers fails or finds no users
    console.log('Falling back to timestamp-based username reconstruction');
    let username = email.split('@')[0];
    const now = Date.now();
    let lastError = null;
    
    // Try a much wider window - 24 hours instead of just 5 minutes
    const attempts = 24 * 60 * 60; // 24 hours in seconds
    const interval = 60; // Check every minute instead of every second to cover more time
    
    console.log(`Attempting verification with ${attempts / interval} potential usernames over 24 hours`);
    
    for (let i = 0; i < attempts; i += interval) {
      const ts = now - i * 1000;
      const testUsername = `${username}_${ts}`;
      const params = {
        ClientId: clientId,
        Username: testUsername,
        ConfirmationCode: code,
        SecretHash: generateSecretHash(testUsername),
      };
      
      try {
        await cognito.confirmSignUp(params).promise();
        console.log('User confirmed with timestamp approach:', testUsername);
        return res.status(200).json({ success: true, message: 'User confirmed successfully.' });
      } catch (error) {
        lastError = error;
        // If error is not CodeMismatch or UserNotFound, break
        if (error.code !== 'UserNotFoundException' && error.code !== 'CodeMismatchException' && error.code !== 'NotAuthorizedException') {
          console.error('Breaking loop due to unexpected error:', error.code, error.message);
          break;
        }
      }
    }
    
    // If not confirmed after all attempts
    console.error('Verification failed after all attempts:', lastError?.message || lastError);
    return res.status(400).json({
      success: false,
      message: lastError?.message || 'Verification failed: Invalid code provided, please request a code again.',
      error: lastError?.code || 'UnknownError'
    });
  } catch (err) {
    console.error('Unexpected error in /verify:', err);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err?.message });
  }
});

// Resend verification code
router.post('/resend-code', async (req, res) => {
  console.log('Resend code endpoint hit', req.body);
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    console.log(`Attempting to resend verification code for email: ${email}`);
    
    // Try to find all users with this email
    const listUsersParams = {
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 10 // Get more than one in case there are multiple registrations
    };
    
    try {
      const listResult = await cognito.listUsers(listUsersParams).promise();
      console.log(`Found ${listResult.Users?.length || 0} users with email ${email}`);
      
      if (listResult.Users && listResult.Users.length > 0) {
        // Try each user until we successfully resend a code
        let codeResent = false;
        let lastResendError = null;
        
        for (const user of listResult.Users) {
          const username = user.Username;
          console.log(`Attempting to resend code for user: ${username}`);
          
          // Check if the user is already confirmed
          const userStatus = user.UserStatus;
          if (userStatus === 'CONFIRMED') {
            console.log(`User ${username} is already confirmed, skipping`);
            continue;
          }
          
          // Request a new code
          const params = {
            ClientId: clientId,
            Username: username,
            SecretHash: generateSecretHash(username)
          };
          
          try {
            await cognito.resendConfirmationCode(params).promise();
            console.log('Verification code successfully resent for:', username);
            codeResent = true;
            
            return res.status(200).json({
              success: true,
              message: 'A new verification code has been sent to your email',
            });
          } catch (resendError) {
            console.log(`Failed to resend code for ${username}: ${resendError.code} - ${resendError.message}`);
            lastResendError = resendError;
          }
        }
        
        if (!codeResent) {
          console.log('Failed to resend code for any user with this email');
          if (lastResendError) {
            return res.status(400).json({
              success: false,
              message: lastResendError.message || 'Could not resend verification code',
              error: lastResendError.code
            });
          }
        }
      } else {
        console.log(`No users found with email ${email}, trying timestamp-based approach`);
      }
    } catch (listError) {
      console.error('Error listing users by email:', listError);
      // Fall back to the timestamp-based approach
    }
    
    // If we couldn't find the user or resend via ListUsers, try timestamp-based approach
    console.log('Falling back to timestamp-based username reconstruction for resend');
    const baseUsername = email.split('@')[0];
    const now = Date.now();
    let resent = false;
    let lastError = null;
    
    // Try with a much wider time window - 24 hours instead of just 1 hour
    const attempts = 24 * 60 * 60; // 24 hours in seconds
    const interval = 60; // Check every minute instead of every second
    
    console.log(`Attempting resend with ${attempts / interval} potential usernames over 24 hours`);
    
    for (let i = 0; i < attempts; i += interval) {
      const ts = now - i * 1000;
      const testUsername = `${baseUsername}_${ts}`;
      
      try {
        const params = {
          ClientId: clientId,
          Username: testUsername,
          SecretHash: generateSecretHash(testUsername)
        };
        
        await cognito.resendConfirmationCode(params).promise();
        console.log('Code resent successfully using timestamp approach for:', testUsername);
        resent = true;
        
        return res.status(200).json({
          success: true,
          message: 'A new verification code has been sent to your email',
        });
        
      } catch (error) {
        lastError = error;
        // Only continue if it's a UserNotFound error
        if (error.code !== 'UserNotFoundException') {
          console.log(`Breaking timestamp loop due to non-UserNotFound error: ${error.code} - ${error.message}`);
          break;
        }
      }
    }
    
    // If we couldn't resend to any user
    if (!resent) {
      console.error('Failed to resend verification code after all attempts');
      return res.status(400).json({
        success: false,
        message: lastError?.message || 'Could not resend verification code. Please try registering again.',
        error: lastError?.code
      });
    }
  } catch (err) {
    console.error('Unexpected error in /resend-code:', err);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err?.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
      SECRET_HASH: generateSecretHash(email)
    }
  };

  try {
    const data = await cognito.initiateAuth(params).promise();
    
    // Get user details
    const userData = await cognito.getUser({
      AccessToken: data.AuthenticationResult.AccessToken
    }).promise();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: data.AuthenticationResult.AccessToken,
        refreshToken: data.AuthenticationResult.RefreshToken,
        expiresIn: data.AuthenticationResult.ExpiresIn,
        idToken: data.AuthenticationResult.IdToken,
        user: {
          email: userData.UserAttributes.find(attr => attr.Name === 'email')?.Value,
          name: userData.UserAttributes.find(attr => attr.Name === 'name')?.Value,
          emailVerified: userData.UserAttributes.find(attr => attr.Name === 'email_verified')?.Value === 'true',
          username: userData.Username
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error logging in',
      error: error.code
    });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  const params = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
      SECRET_HASH: generateSecretHash('') // Username is not always available; Cognito accepts empty string
    }
  };

  try {
    const data = await cognito.initiateAuth(params).promise();
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: data.AuthenticationResult.AccessToken,
        idToken: data.AuthenticationResult.IdToken,
        expiresIn: data.AuthenticationResult.ExpiresIn
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error refreshing token',
      error: error.code
    });
  }
});

// Protected route example
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const userData = await cognito.getUser({
      AccessToken: token
    }).promise();

    const user = {
      username: userData.Username,
      attributes: {}
    };

    userData.UserAttributes.forEach(attr => {
      user.attributes[attr.Name] = attr.Value;
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.code
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({
      success: false,
      message: 'Access token is required'
    });
  }

  const params = {
    AccessToken: accessToken
  };

  try {
    await cognito.globalSignOut(params).promise();
    res.status(200).json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error logging out',
      error: error.code
    });
  }
});

module.exports = router;
