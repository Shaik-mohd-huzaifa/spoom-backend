// AWS Cognito Service - Integration with PostgreSQL database
require('dotenv').config();
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { users } = require('../db/database');
const cognitoConfig = require('../config/aws-cognito.config');

// Configure AWS SDK
AWS.config.update({
  region: cognitoConfig.region,
  accessKeyId: cognitoConfig.accessKeyId,
  secretAccessKey: cognitoConfig.secretAccessKey
});

// Initialize Cognito Identity Service Provider
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

class CognitoService {
  constructor() {
    this.userPoolId = cognitoConfig.userPoolId;
    this.clientId = cognitoConfig.clientId;
    this.clientSecret = cognitoConfig.clientSecret;
  }

  /**
   * Sign up a new user with Cognito and create a corresponding user in the database
   * @param {Object} userData User data including email, password, and name
   * @returns {Object} Created user object
   */
  async signUp(userData) {
    try {
      // Register user with Cognito
      const params = {
        ClientId: this.clientId,
        Password: userData.password,
        Username: userData.email,
        UserAttributes: [
          {
            Name: 'email',
            Value: userData.email
          },
          {
            Name: 'name',
            Value: userData.name
          }
        ]
      };

      const cognitoResponse = await cognitoIdentityServiceProvider.signUp(params).promise();
      console.log('Cognito signup response:', cognitoResponse);

      // Assign a UUID for the user
      const cognitoId = uuidv4();

      // Create the user in our database
      const dbUser = await users.createUser(
        cognitoId,
        userData.email,
        userData.name,
        userData.avatarUrl
      );

      return {
        user: dbUser,
        cognitoUser: cognitoResponse.User
      };
    } catch (error) {
      console.error('Error signing up user:', error);
      throw error;
    }
  }

  /**
   * Sign in a user with Cognito and update last login in the database
   * @param {string} email User email
   * @param {string} password User password
   * @returns {Object} Authentication result and user data
   */
  async signIn(email, password) {
    try {
      // Authenticate with Cognito
      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      };

      const authResult = await cognitoIdentityServiceProvider.initiateAuth(params).promise();
      console.log('Auth result:', authResult);

      // Get user from our database
      let dbUser = await users.findByEmail(email);

      if (!dbUser) {
        // If the user exists in Cognito but not in our DB (possible during migration)
        // Get user details from Cognito
        const userParams = {
          AccessToken: authResult.AuthenticationResult.AccessToken
        };
        
        const cognitoUser = await cognitoIdentityServiceProvider.getUser(userParams).promise();
        
        // Create user in our database
        const name = cognitoUser.UserAttributes.find(attr => attr.Name === 'name')?.Value || email.split('@')[0];
        const cognitoId = cognitoUser.Username;
        
        dbUser = await users.createUser(cognitoId, email, name);
      }

      // Update last login timestamp
      await users.updateLastLogin(dbUser.id);

      // Get fresh user data with updated timestamp
      dbUser = await users.findByEmail(email);

      return {
        tokens: {
          accessToken: authResult.AuthenticationResult.AccessToken,
          idToken: authResult.AuthenticationResult.IdToken,
          refreshToken: authResult.AuthenticationResult.RefreshToken,
          expiresIn: authResult.AuthenticationResult.ExpiresIn
        },
        user: dbUser
      };
    } catch (error) {
      console.error('Error signing in user:', error);
      throw error;
    }
  }

  /**
   * Get current user from access token
   * @param {string} accessToken Cognito access token
   * @returns {Object} User data
   */
  async getCurrentUser(accessToken) {
    try {
      const params = {
        AccessToken: accessToken
      };

      const cognitoUser = await cognitoIdentityServiceProvider.getUser(params).promise();
      
      // Find user in our database
      const email = cognitoUser.UserAttributes.find(attr => attr.Name === 'email')?.Value;
      if (!email) {
        throw new Error('User email not found in token');
      }

      const dbUser = await users.findByEmail(email);
      if (!dbUser) {
        throw new Error('User not found in database');
      }

      return dbUser;
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  /**
   * Refresh tokens using refresh token
   * @param {string} refreshToken Refresh token
   * @returns {Object} New tokens
   */
  async refreshTokens(refreshToken) {
    try {
      const params = {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken
        }
      };

      const authResult = await cognitoIdentityServiceProvider.initiateAuth(params).promise();
      
      return {
        accessToken: authResult.AuthenticationResult.AccessToken,
        idToken: authResult.AuthenticationResult.IdToken,
        expiresIn: authResult.AuthenticationResult.ExpiresIn,
        // Note: New refresh token is not returned, continue using the existing one
        refreshToken
      };
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      throw error;
    }
  }

  /**
   * Sign out a user
   * @param {string} accessToken User's access token
   */
  async signOut(accessToken) {
    try {
      const params = {
        AccessToken: accessToken
      };

      await cognitoIdentityServiceProvider.globalSignOut(params).promise();
      return { success: true };
    } catch (error) {
      console.error('Error signing out user:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} accessToken User's access token
   * @param {string} oldPassword Old password
   * @param {string} newPassword New password
   */
  async changePassword(accessToken, oldPassword, newPassword) {
    try {
      const params = {
        AccessToken: accessToken,
        PreviousPassword: oldPassword,
        ProposedPassword: newPassword
      };

      await cognitoIdentityServiceProvider.changePassword(params).promise();
      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Initiate forgot password flow
   * @param {string} email User email
   */
  async forgotPassword(email) {
    try {
      const params = {
        ClientId: this.clientId,
        Username: email
      };

      await cognitoIdentityServiceProvider.forgotPassword(params).promise();
      return { success: true };
    } catch (error) {
      console.error('Error initiating forgot password:', error);
      throw error;
    }
  }

  /**
   * Confirm new password after reset
   * @param {string} email User email
   * @param {string} code Verification code
   * @param {string} newPassword New password
   */
  async confirmForgotPassword(email, code, newPassword) {
    try {
      const params = {
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword
      };

      await cognitoIdentityServiceProvider.confirmForgotPassword(params).promise();
      return { success: true };
    } catch (error) {
      console.error('Error confirming new password:', error);
      throw error;
    }
  }

  /**
   * Update user attributes
   * @param {string} accessToken User's access token
   * @param {Object} attributes User attributes to update
   */
  async updateUserAttributes(accessToken, attributes) {
    try {
      const userAttributes = Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value
      }));

      const params = {
        AccessToken: accessToken,
        UserAttributes: userAttributes
      };

      await cognitoIdentityServiceProvider.updateUserAttributes(params).promise();
      
      // Also update in our database
      const cognitoUser = await this.getCurrentUser(accessToken);
      
      if (attributes.name) {
        await users.updateProfile(cognitoUser.id, {
          name: attributes.name,
          avatarUrl: cognitoUser.avatar_url
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user attributes:', error);
      throw error;
    }
  }
}

module.exports = new CognitoService();
