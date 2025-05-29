// Database access layer for Spoom AI application
require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool for PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000 // How long to wait for a connection to become available
});

// Log connection pool events
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute SQL queries
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
}

// User database operations
const users = {
  // Create a new user in the database
  async createUser(cognitoId, email, name, avatarUrl = null) {
    const result = await query(
      'INSERT INTO users (id, email, name, avatar_url, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cognitoId, email, name, avatarUrl, true]
    );
    return result.rows[0];
  },

  // Find user by Cognito ID (UUID)
  async findByCognitoId(cognitoId) {
    const result = await query('SELECT * FROM users WHERE id = $1', [cognitoId]);
    return result.rows[0] || null;
  },

  // Find user by email
  async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  // Update user login timestamp
  async updateLastLogin(userId) {
    await query(
      'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [userId]
    );
  },

  // Update user profile
  async updateProfile(userId, { name, avatarUrl }) {
    const result = await query(
      'UPDATE users SET name = $2, avatar_url = $3, updated_at = NOW() WHERE id = $1 RETURNING *',
      [userId, name, avatarUrl]
    );
    return result.rows[0];
  },
  
  // Get user settings
  async getUserSettings(userId) {
    const result = await query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  },
  
  // Create or update user settings
  async upsertUserSettings(userId, settings) {
    // Check if settings exist
    const existingSettings = await this.getUserSettings(userId);
    
    if (existingSettings) {
      // Update existing settings
      const result = await query(
        `UPDATE user_settings SET 
         theme = $2, 
         language = $3, 
         notifications_enabled = $4, 
         email_notifications = $5,
         push_notifications = $6,
         desktop_notifications = $7,
         privacy_settings = $8,
         updated_at = NOW() 
         WHERE user_id = $1 RETURNING *`,
        [
          userId, 
          settings.theme || existingSettings.theme, 
          settings.language || existingSettings.language,
          settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : existingSettings.notifications_enabled,
          settings.emailNotifications !== undefined ? settings.emailNotifications : existingSettings.email_notifications,
          settings.pushNotifications !== undefined ? settings.pushNotifications : existingSettings.push_notifications,
          settings.desktopNotifications !== undefined ? settings.desktopNotifications : existingSettings.desktop_notifications,
          settings.privacySettings ? JSON.stringify(settings.privacySettings) : existingSettings.privacy_settings
        ]
      );
      return result.rows[0];
    } else {
      // Create new settings
      const result = await query(
        `INSERT INTO user_settings 
         (id, user_id, theme, language, notifications_enabled, email_notifications, push_notifications, desktop_notifications, privacy_settings) 
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          userId,
          settings.theme || 'light',
          settings.language || 'en',
          settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : true,
          settings.emailNotifications !== undefined ? settings.emailNotifications : true,
          settings.pushNotifications !== undefined ? settings.pushNotifications : true,
          settings.desktopNotifications !== undefined ? settings.desktopNotifications : true,
          settings.privacySettings ? JSON.stringify(settings.privacySettings) : JSON.stringify({
            shareStatus: false,
            showOnlineStatus: true,
            allowDataCollection: true
          }),
          settings.emailNotifications !== undefined ? settings.emailNotifications : true
        ]
      );
      return result.rows[0];
    }
  }
};

// Workspace database operations
const workspaces = {
  // Create a new workspace
  async createWorkspace(name, slug, description, ownerId, isPersonal = false) {
    const result = await query(
      `INSERT INTO workspaces 
       (id, name, slug, description, owner_id, is_personal) 
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5) RETURNING *`,
      [name, slug, description, ownerId, isPersonal]
    );
    
    // Create default workspace settings
    await query(
      `INSERT INTO workspace_settings 
       (id, workspace_id) 
       VALUES (uuid_generate_v4(), $1)`,
      [result.rows[0].id]
    );
    
    // Add owner as member with admin role
    await query(
      `INSERT INTO workspace_members 
       (id, workspace_id, user_id, role) 
       VALUES (uuid_generate_v4(), $1, $2, $3)`,
      [result.rows[0].id, ownerId, 'admin']
    );
    
    // Create default general channel
    await query(
      `INSERT INTO channels 
       (id, workspace_id, name, description) 
       VALUES (uuid_generate_v4(), $1, $2, $3)`,
      [result.rows[0].id, 'general', 'General discussion channel']
    );
    
    return result.rows[0];
  },
  
  // Get user's workspaces (both owned and member of)
  async getUserWorkspaces(userId) {
    const result = await query(
      `SELECT w.* 
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.owner_id = $1 OR wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return result.rows;
  },
  
  // Get workspace by ID
  async getWorkspaceById(workspaceId) {
    const result = await query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
    return result.rows[0] || null;
  },
  
  // Get workspace channels
  async getWorkspaceChannels(workspaceId) {
    const result = await query(
      'SELECT * FROM channels WHERE workspace_id = $1 ORDER BY name ASC',
      [workspaceId]
    );
    return result.rows;
  },
  
  // Get workspace by ID
  async getWorkspace(workspaceId) {
    const result = await query(
      'SELECT * FROM workspaces WHERE id = $1',
      [workspaceId]
    );
    return result.rows[0] || null;
  },
  
  // Get workspace settings
  async getWorkspaceSettings(workspaceId) {
    const result = await query(
      'SELECT * FROM workspace_settings WHERE workspace_id = $1',
      [workspaceId]
    );
    return result.rows[0] || null;
  },
  
  // Update workspace settings
  async updateWorkspaceSettings(workspaceId, settings) {
    // Check if settings exist
    const existingSettings = await this.getWorkspaceSettings(workspaceId);
    
    if (existingSettings) {
      // Update existing settings
      const updateFields = [];
      const values = [workspaceId];
      let paramCounter = 2;
      
      // Build dynamic update query based on provided settings
      if (settings.notificationsEnabled !== undefined) {
        updateFields.push(`notifications_enabled = $${paramCounter++}`);
        values.push(settings.notificationsEnabled);
      }
      
      if (settings.privacyLevel !== undefined) {
        updateFields.push(`privacy_level = $${paramCounter++}`);
        values.push(settings.privacyLevel);
      }
      
      if (settings.allowGuestAccess !== undefined) {
        updateFields.push(`allow_guest_access = $${paramCounter++}`);
        values.push(settings.allowGuestAccess);
      }
      
      if (settings.domainRestrictions !== undefined) {
        updateFields.push(`domain_restriction = $${paramCounter++}`);
        values.push(settings.domainRestrictions);
      }
      
      if (settings.defaultUserRole !== undefined) {
        updateFields.push(`default_user_role = $${paramCounter++}`);
        values.push(settings.defaultUserRole);
      }
      
      // Only update if there are fields to update
      if (updateFields.length === 0) {
        return existingSettings; // No changes to make
      }
      
      updateFields.push('updated_at = NOW()');
      
      const result = await query(
        `UPDATE workspace_settings SET ${updateFields.join(', ')} WHERE workspace_id = $1 RETURNING *`,
        values
      );
      
      return result.rows[0];
    } else {
      throw new Error(`No settings found for workspace with ID: ${workspaceId}`);
    }
  },
  
  // Check if user is a member of workspace
  async isWorkspaceMember(workspaceId, userId) {
    const result = await query(
      'SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
    return parseInt(result.rows[0].count) > 0;
  },
  
  // Get workspace member role
  async getWorkspaceMemberRole(workspaceId, userId) {
    const result = await query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
    return result.rows[0]?.role || null;
  },
  
  // Delete workspace
  async deleteWorkspace(workspaceId) {
    // Delete the workspace (cascades to workspace_settings, workspace_members, channels, etc.)
    await query(
      'DELETE FROM workspaces WHERE id = $1',
      [workspaceId]
    );
    return true;
  }
};

// Message database operations
const messages = {
  // Create a new message in a channel
  async createMessage(channelId, userId, content, parentId = null) {
    const result = await query(
      `INSERT INTO messages 
       (id, channel_id, user_id, content, parent_id) 
       VALUES (uuid_generate_v4(), $1, $2, $3, $4) RETURNING *`,
      [channelId, userId, content, parentId]
    );
    return result.rows[0];
  },
  
  // Get channel messages
  async getChannelMessages(channelId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT m.*, u.name as user_name, u.avatar_url 
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.channel_id = $1 AND m.parent_id IS NULL
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [channelId, limit, offset]
    );
    return result.rows;
  },
  
  // Get message replies
  async getMessageReplies(messageId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT m.*, u.name as user_name, u.avatar_url 
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.parent_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [messageId, limit, offset]
    );
    return result.rows;
  }
};

// AI response database operations
const aiResponses = {
  // Record an AI-generated response
  async recordResponse(userId, messageId, prompt, response, model, tokensUsed) {
    const result = await query(
      `INSERT INTO ai_generated_responses 
       (id, user_id, message_id, prompt, response, model, tokens_used) 
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, messageId, prompt, response, model, tokensUsed]
    );
    return result.rows[0];
  },
  
  // Get user's AI interactions history
  async getUserHistory(userId, limit = 20, offset = 0) {
    const result = await query(
      `SELECT * FROM ai_generated_responses 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }
};

// Credit system database operations
const credits = {
  // Get user's credit balance
  async getUserCredits(userId) {
    const result = await query(
      'SELECT * FROM credits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return result.rows[0] || null;
  },
  
  // Add credits to user's account
  async addCredits(userId, amount) {
    // Check if user has existing credits
    const existingCredits = await this.getUserCredits(userId);
    
    if (existingCredits) {
      // Update existing credits
      const newBalance = parseFloat(existingCredits.balance) + parseFloat(amount);
      const result = await query(
        `UPDATE credits 
         SET amount = $2, balance = $3, updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [existingCredits.id, amount, newBalance]
      );
      return result.rows[0];
    } else {
      // Create new credits entry
      const result = await query(
        `INSERT INTO credits 
         (id, user_id, amount, balance) 
         VALUES (uuid_generate_v4(), $1, $2, $2) RETURNING *`,
        [userId, amount]
      );
      return result.rows[0];
    }
  },
  
  // Deduct credits from user's account
  async deductCredits(userId, amount) {
    const existingCredits = await this.getUserCredits(userId);
    
    if (!existingCredits || parseFloat(existingCredits.balance) < parseFloat(amount)) {
      throw new Error('Insufficient credits');
    }
    
    const newBalance = parseFloat(existingCredits.balance) - parseFloat(amount);
    const result = await query(
      `UPDATE credits 
       SET balance = $2, updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [existingCredits.id, newBalance]
    );
    return result.rows[0];
  }
};

module.exports = {
  query,
  pool,
  users,
  workspaces,
  messages,
  aiResponses,
  credits
};
