// Workspace management routes
const express = require('express');
const router = express.Router();

// Try to use real database, fall back to mock for development
let workspaces, messages;
try {
  const db = require('../db/database');
  workspaces = db.workspaces;
  messages = db.messages;
  console.log('Using real database for workspaces');
} catch (error) {
  console.log('Using mock database for workspaces');
  const { mockWorkspaces, mockMessages } = require('../db/mock-database');
  workspaces = mockWorkspaces;
  messages = mockMessages;
}

const auth = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

// Get all workspaces for the authenticated user
router.get('/', auth.authenticateToken, async (req, res) => {
  try {
    const userWorkspaces = await workspaces.getUserWorkspaces(req.user.id);
    
    res.status(200).json({
      success: true,
      data: userWorkspaces
    });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workspaces',
      error: error.message
    });
  }
});

// Create a new workspace
router.post('/', auth.authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name is required'
      });
    }
    
    // Generate a slug from the name
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Create the workspace
    const newWorkspace = await workspaces.createWorkspace(
      name,
      `${slug}-${Date.now().toString(36)}`, // Ensure slug uniqueness
      description || '',
      req.user.id,
      false // Not a personal workspace
    );
    
    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: newWorkspace
    });
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating workspace',
      error: error.message
    });
  }
});

// Get a specific workspace by ID
router.get('/:id', auth.authenticateToken, async (req, res) => {
  try {
    const workspace = await workspaces.getWorkspaceById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workspace',
      error: error.message
    });
  }
});

// Get channels for a workspace
router.get('/:id/channels', auth.authenticateToken, async (req, res) => {
  try {
    const channels = await workspaces.getWorkspaceChannels(req.params.id);
    
    res.status(200).json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Error fetching workspace channels:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workspace channels',
      error: error.message
    });
  }
});

// Get messages for a channel
router.get('/:workspaceId/channels/:channelId/messages', auth.authenticateToken, async (req, res) => {
  try {
    const { workspaceId, channelId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Verify workspace exists
    const workspace = await workspaces.getWorkspaceById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }
    
    // Get channel messages
    const channelMessages = await messages.getChannelMessages(channelId, parseInt(limit), parseInt(offset));
    
    res.status(200).json({
      success: true,
      data: channelMessages
    });
  } catch (error) {
    console.error('Error fetching channel messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching channel messages',
      error: error.message
    });
  }
});

// Create a message in a channel
router.post('/:workspaceId/channels/:channelId/messages', auth.authenticateToken, async (req, res) => {
  try {
    const { workspaceId, channelId } = req.params;
    const { content, parentId } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    // Create message
    const newMessage = await messages.createMessage(
      channelId,
      req.user.id,
      content,
      parentId || null
    );
    
    res.status(201).json({
      success: true,
      message: 'Message created successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating message',
      error: error.message
    });
  }
});

module.exports = router;
