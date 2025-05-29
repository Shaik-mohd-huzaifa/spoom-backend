const { 
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommand,
  GlobalSignOutCommand
} = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');
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
 * Calculate the SECRET_HASH required for Cognito client with secret
 * @param {string} username - The username (email) for the user
 * @returns {string} - The calculated secret hash
 */
const calculateSecretHash = (username) => {
  const message = username + config.aws.cognitoClientId;
  const hmac = crypto.createHmac('sha256', config.aws.cognitoClientSecret);
  hmac.update(message);
  return hmac.digest('base64');
};

/**
 * Handle user sign-in with Cognito
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - Auth result with tokens
 */
const signIn = async (email, password) => {
  try {
    const params = {
      ClientId: config.aws.cognitoClientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: calculateSecretHash(email)
      }
    };

    const command = new InitiateAuthCommand(params);
    const result = await cognitoClient.send(command);

    return {
      success: true,
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn
    };
  } catch (error) {
    console.error('Cognito sign-in error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed'
    };
  }
};

/**
 * Register a new user with Cognito
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User's full name
 * @returns {Promise<object>} - Registration result
 */
const signUp = async (email, password, name) => {
  try {
    const params = {
      ClientId: config.aws.cognitoClientId,
      Username: email,
      Password: password,
      SecretHash: calculateSecretHash(email),
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

    const command = new SignUpCommand(params);
    const result = await cognitoClient.send(command);

    return {
      success: true,
      userSub: result.UserSub,
      isConfirmed: result.UserConfirmed
    };
  } catch (error) {
    console.error('Cognito sign-up error:', error);
    return {
      success: false,
      error: error.message || 'Registration failed'
    };
  }
};

/**
 * Confirm a user signup with verification code
 * @param {string} email - User email
 * @param {string} code - Verification code
 * @returns {Promise<object>} - Confirmation result
 */
const confirmSignUp = async (email, code) => {
  try {
    const params = {
      ClientId: config.aws.cognitoClientId,
      Username: email,
      ConfirmationCode: code,
      SecretHash: calculateSecretHash(email)
    };

    const command = new ConfirmSignUpCommand(params);
    await cognitoClient.send(command);

    return {
      success: true
    };
  } catch (error) {
    console.error('Cognito confirm sign-up error:', error);
    return {
      success: false,
      error: error.message || 'Confirmation failed'
    };
  }
};

/**
 * Initiate a password reset
 * @param {string} email - User email
 * @returns {Promise<object>} - Reset result
 */
const forgotPassword = async (email) => {
  try {
    const params = {
      ClientId: config.aws.cognitoClientId,
      Username: email,
      SecretHash: calculateSecretHash(email)
    };

    const command = new ForgotPasswordCommand(params);
    await cognitoClient.send(command);

    return {
      success: true
    };
  } catch (error) {
    console.error('Cognito forgot password error:', error);
    return {
      success: false,
      error: error.message || 'Password reset request failed'
    };
  }
};

/**
 * Confirm password reset with code and new password
 * @param {string} email - User email
 * @param {string} code - Verification code
 * @param {string} newPassword - New password
 * @returns {Promise<object>} - Reset confirmation result
 */
const confirmForgotPassword = async (email, code, newPassword) => {
  try {
    const params = {
      ClientId: config.aws.cognitoClientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
      SecretHash: calculateSecretHash(email)
    };

    const command = new ConfirmForgotPasswordCommand(params);
    await cognitoClient.send(command);

    return {
      success: true
    };
  } catch (error) {
    console.error('Cognito confirm forgot password error:', error);
    return {
      success: false,
      error: error.message || 'Password reset confirmation failed'
    };
  }
};

/**
 * Get user information with access token
 * @param {string} accessToken - User's access token
 * @returns {Promise<object>} - User information
 */
const getUserInfo = async (accessToken) => {
  try {
    const params = {
      AccessToken: accessToken
    };

    const command = new GetUserCommand(params);
    const result = await cognitoClient.send(command);
    
    // Transform attributes array into a more usable object
    const userAttributes = {};
    result.UserAttributes.forEach(attr => {
      userAttributes[attr.Name] = attr.Value;
    });

    return {
      success: true,
      username: result.Username,
      attributes: userAttributes
    };
  } catch (error) {
    console.error('Cognito get user info error:', error);
    return {
      success: false,
      error: error.message || 'Failed to retrieve user information'
    };
  }
};

/**
 * Sign out a user (global sign out)
 * @param {string} accessToken - User's access token
 * @returns {Promise<object>} - Sign out result
 */
const signOut = async (accessToken) => {
  try {
    const params = {
      AccessToken: accessToken
    };

    const command = new GlobalSignOutCommand(params);
    await cognitoClient.send(command);

    return {
      success: true
    };
  } catch (error) {
    console.error('Cognito sign out error:', error);
    return {
      success: false,
      error: error.message || 'Sign out failed'
    };
  }
};

module.exports = {
  signIn,
  signUp,
  confirmSignUp,
  forgotPassword,
  confirmForgotPassword,
  getUserInfo,
  signOut
};
