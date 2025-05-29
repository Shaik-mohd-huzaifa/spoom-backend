const { v4: uuidv4 } = require('uuid');
const { getUserById } = require('../services/userService');

/**
 * Generate a random 6-digit alphanumeric invite code
 * @returns {string} - A 6-character alphanumeric string
 */
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// In-memory storage for workspaces (would be in database in production)
const workspaces = [
  {
    id: 'ws-' + uuidv4(),
    name: 'Product Development',
    slug: 'product-development',
    description: 'Team workspace for all product development discussions and documentation',
    logoUrl: null,
    ownerId: 'user-1',
    isPersonal: false,
    inviteCode: generateInviteCode(),
    members: 4,
    industry: 'Technology',
    location: 'Global',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ws-' + uuidv4(),
    name: 'Marketing',
    slug: 'marketing',
    description: 'Coordinate marketing campaigns and brand strategy',
    logoUrl: null,
    ownerId: 'user-1',
    isPersonal: false,
    inviteCode: generateInviteCode(),
    members: 3,
    industry: 'Marketing',
    location: 'San Francisco',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ws-' + uuidv4(),
    name: 'Personal Workspace',
    slug: 'personal',
    description: 'Your personal workspace for notes and drafts',
    logoUrl: null,
    ownerId: 'user-1',
    isPersonal: true,
    inviteCode: generateInviteCode(),
    members: 1,
    industry: 'Personal',
    location: 'Private',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

/**
 * Get all workspaces for a user
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getUserWorkspaces = async (req, res) => {
  try {
    // In a real implementation, we would filter workspaces by user ID
    // from the authenticated user in req.user
    const userId = req.user ? req.user.id : 'user-1'; // Fallback for testing
    
    // Filter workspaces where user is owner or member
    // For now, just return all workspaces in our mock data
    
    return res.status(200).json({
      success: true,
      data: workspaces
    });
  } catch (error) {
    console.error('Error getting user workspaces:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve workspaces'
    });
  }
};

/**
 * Get a single workspace by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getWorkspaceById = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = workspaces.find(w => w.id === workspaceId);
    
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Error getting workspace:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve workspace'
    });
  }
};

/**
 * Create a new workspace
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const createWorkspace = async (req, res) => {
  try {
    const { name, description, isPersonal } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Workspace name is required'
      });
    }
    
    // In a real implementation, we would get the user ID from req.user
    const userId = req.user ? req.user.id : 'user-1'; // Fallback for testing
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Generate a unique invite code for the workspace
    const inviteCode = generateInviteCode();
    
    const newWorkspace = {
      id: 'ws-' + uuidv4(),
      name,
      slug,
      description: description || '',
      logoUrl: null,
      ownerId: userId,
      isPersonal: Boolean(isPersonal),
      inviteCode,
      members: 1, // Owner is the first member
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // In a real implementation, we would save to database
    workspaces.push(newWorkspace);
    
    return res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: newWorkspace
    });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create workspace'
    });
  }
};

/**
 * Update a workspace
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description } = req.body;
    
    const workspaceIndex = workspaces.findIndex(w => w.id === workspaceId);
    
    if (workspaceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    const workspace = workspaces[workspaceIndex];
    
    // Update fields if provided
    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    workspace.updatedAt = new Date().toISOString();
    
    // In a real implementation, we would update in database
    workspaces[workspaceIndex] = workspace;
    
    return res.status(200).json({
      success: true,
      message: 'Workspace updated successfully',
      data: workspace
    });
  } catch (error) {
    console.error('Error updating workspace:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update workspace'
    });
  }
};

/**
 * Delete a workspace
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspaceIndex = workspaces.findIndex(w => w.id === workspaceId);
    
    if (workspaceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }
    
    // In a real implementation, we would delete from database
    workspaces.splice(workspaceIndex, 1);
    
    return res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete workspace'
    });
  }
};

module.exports = {
  getUserWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace
};
