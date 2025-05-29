// Mock database for development and testing
const { v4: uuidv4 } = require('uuid');

// Mock in-memory database
const mockDB = {
  workspaces: [
    {
      id: 'ws-' + uuidv4().substring(0, 8),
      name: 'Product Development',
      slug: 'product-development',
      description: 'Team workspace for all product development discussions and documentation',
      logoUrl: null,
      ownerId: 'user-1',
      isPersonal: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ws-' + uuidv4().substring(0, 8),
      name: 'Marketing',
      slug: 'marketing',
      description: 'Coordinate marketing campaigns and brand strategy',
      logoUrl: null,
      ownerId: 'user-1',
      isPersonal: false,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ws-' + uuidv4().substring(0, 8),
      name: 'Personal Workspace',
      slug: 'personal',
      description: 'Your personal workspace for notes and drafts',
      logoUrl: null,
      ownerId: 'user-1',
      isPersonal: true,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  channels: {},
  messages: {}
};

// Mock workspaces operations
const mockWorkspaces = {
  // Get all workspaces for a user
  getUserWorkspaces: async (userId) => {
    // In a real implementation, we would filter by userId
    return mockDB.workspaces;
  },
  
  // Get workspace by ID
  getWorkspaceById: async (workspaceId) => {
    return mockDB.workspaces.find(w => w.id === workspaceId) || null;
  },
  
  // Create a new workspace
  createWorkspace: async (name, slug, description, ownerId, isPersonal = false) => {
    const newWorkspace = {
      id: 'ws-' + uuidv4().substring(0, 8),
      name,
      slug,
      description: description || '',
      logoUrl: null,
      ownerId,
      isPersonal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockDB.workspaces.push(newWorkspace);
    return newWorkspace;
  },
  
  // Get workspace channels
  getWorkspaceChannels: async (workspaceId) => {
    return mockDB.channels[workspaceId] || [];
  }
};

// Mock messages operations
const mockMessages = {
  // Create a new message in a channel
  createMessage: async (channelId, userId, content, parentId = null) => {
    const newMessage = {
      id: 'msg-' + uuidv4().substring(0, 8),
      channelId,
      userId,
      content,
      isEdited: false,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user_name: 'Mock User',
      avatar_url: null
    };
    
    if (!mockDB.messages[channelId]) {
      mockDB.messages[channelId] = [];
    }
    
    mockDB.messages[channelId].push(newMessage);
    return newMessage;
  },
  
  // Get channel messages
  getChannelMessages: async (channelId, limit = 50, offset = 0) => {
    const messages = mockDB.messages[channelId] || [];
    return messages
      .filter(m => !m.parentId) // Only return top-level messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by date, newest first
      .slice(offset, offset + limit);
  }
};

module.exports = {
  mockWorkspaces,
  mockMessages
};
