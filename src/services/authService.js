const AWS = require('aws-sdk');
const cognitoConfig = require('../config/aws-cognito.config');
const db = require('../config/database');

// Initialize AWS Cognito Identity Service Provider
const cognitoProvider = new AWS.CognitoIdentityServiceProvider({
  region: cognitoConfig.region,
  accessKeyId: cognitoConfig.accessKeyId,
  secretAccessKey: cognitoConfig.secretAccessKey
});

/**
 * Sign up a new user with Cognito
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User name
 * @returns {Promise} - User creation result
 */
const signUp = async (email, password, name) => {
  const params = {
    ClientId: cognitoConfig.clientId,
    Password: password,
    Username: email,
    UserAttributes: [
      {
        Name: 'name',
        Value: name
      },
      {
        Name: 'email',
        Value: email
      }
    ]
  };

  try {
    const signUpResult = await cognitoProvider.signUp(params).promise();
    
    // Store user in our database after successful signup
    await createUserInDatabase(signUpResult.UserSub, email, name);
    
    return {
      success: true,
      userId: signUpResult.UserSub,
      message: 'User registration successful. Please check your email for verification.'
    };
  } catch (error) {
    console.error('Cognito signup error:', error);
    return {
      success: false,
      message: error.message || 'Failed to register user'
    };
  }
};

/**
 * Sign in an existing user with Cognito
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Authentication result with tokens
 */
const signIn = async (email, password) => {
  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: cognitoConfig.clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  };

  try {
    const authResult = await cognitoProvider.initiateAuth(params).promise();
    
    // Get user details from token
    const userInfo = await getUserInfo(authResult.AuthenticationResult.AccessToken);
    
    // Check if user exists in our database, create if not
    await ensureUserInDatabase(userInfo.sub, email, userInfo.name);
    
    return {
      success: true,
      idToken: authResult.AuthenticationResult.IdToken,
      accessToken: authResult.AuthenticationResult.AccessToken,
      refreshToken: authResult.AuthenticationResult.RefreshToken,
      userId: userInfo.sub,
      expiresIn: authResult.AuthenticationResult.ExpiresIn,
      user: userInfo
    };
  } catch (error) {
    console.error('Cognito signin error:', error);
    return {
      success: false,
      message: error.message || 'Failed to authenticate user'
    };
  }
};

/**
 * Get user information from Cognito token
 * @param {string} accessToken - User access token
 * @returns {Promise} - User information
 */
const getUserInfo = async (accessToken) => {
  try {
    const params = {
      AccessToken: accessToken
    };

    const userData = await cognitoProvider.getUser(params).promise();
    
    // Convert Cognito attributes to user object
    const user = {
      sub: null,
      email: null,
      name: null,
      email_verified: false
    };
    
    userData.UserAttributes.forEach(attr => {
      user[attr.Name] = attr.Value;
    });
    
    return user;
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
};

/**
 * Create a user record in our database after successful signup
 * @param {string} id - User ID from Cognito
 * @param {string} email - User email
 * @param {string} name - User name
 * @returns {Promise} - Database insertion result
 */
const createUserInDatabase = async (id, email, name) => {
  try {
    // Start a transaction
    return await db.transaction(async (client) => {
      // Get the default user role
      const roleResult = await client.query('SELECT id FROM roles WHERE name = $1 LIMIT 1', ['user']);
      const roleId = roleResult.rows[0]?.id;
      
      if (!roleId) {
        throw new Error('Default role not found');
      }
      
      // Insert the user
      const userResult = await client.query(
        'INSERT INTO users (id, email, name, role_id) VALUES ($1, $2, $3, $4) RETURNING id', 
        [id, email, name, roleId]
      );
      
      // Create user settings
      await client.query(
        'INSERT INTO user_settings (id, user_id, theme, notifications_enabled, language) VALUES ($1, $2, $3, $4, $5)',
        [crypto.randomUUID(), id, 'light', true, 'en']
      );
      
      return userResult.rows[0];
    });
  } catch (error) {
    console.error('Error creating user in database:', error);
    throw error;
  }
};

/**
 * Ensure user exists in our database, create if not
 * @param {string} id - User ID from Cognito
 * @param {string} email - User email
 * @param {string} name - User name
 * @returns {Promise} - User record
 */
const ensureUserInDatabase = async (id, email, name) => {
  try {
    // Check if user exists
    const userResult = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      // User doesn't exist, create them
      return await createUserInDatabase(id, email, name);
    }
    
    return userResult.rows[0];
  } catch (error) {
    console.error('Error ensuring user in database:', error);
    throw error;
  }
};

/**
 * Refresh the user's tokens
 * @param {string} refreshToken - User refresh token
 * @returns {Promise} - New tokens
 */
const refreshTokens = async (refreshToken) => {
  const params = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: cognitoConfig.clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken
    }
  };

  try {
    const authResult = await cognitoProvider.initiateAuth(params).promise();
    
    return {
      success: true,
      idToken: authResult.AuthenticationResult.IdToken,
      accessToken: authResult.AuthenticationResult.AccessToken,
      expiresIn: authResult.AuthenticationResult.ExpiresIn
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      message: error.message || 'Failed to refresh token'
    };
  }
};

/**
 * Sign out a user
 * @param {string} accessToken - User access token
 * @returns {Promise} - Signout result
 */
const signOut = async (accessToken) => {
  const params = {
    AccessToken: accessToken
  };

  try {
    await cognitoProvider.globalSignOut(params).promise();
    return {
      success: true,
      message: 'Signed out successfully'
    };
  } catch (error) {
    console.error('Signout error:', error);
    return {
      success: false,
      message: error.message || 'Failed to sign out'
    };
  }
};

module.exports = {
  signUp,
  signIn,
  signOut,
  refreshTokens,
  getUserInfo,
  ensureUserInDatabase
};
