const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { validateWorkspaceSettings } = require('../validators/workspaceSettingsValidator');

/**
 * @route GET /api/workspace-settings/:workspaceId
 * @description Get settings for a specific workspace
 * @access Private (members only)
 */
router.get('/:workspaceId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    
    // Check if user is a member of the workspace
    const isMember = await db.isWorkspaceMember(workspaceId, userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You are not a member of this workspace'
      });
    }
    
    // Get workspace settings
    const settings = await db.getWorkspaceSettings(workspaceId);
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Workspace settings not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting workspace settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving workspace settings',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/workspace-settings/:workspaceId
 * @description Update workspace settings
 * @access Private (admin/owner only)
 */
router.put('/:workspaceId', authenticateToken, validateWorkspaceSettings, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    
    // Check if user is an admin or owner of the workspace
    const memberRole = await db.getWorkspaceMemberRole(workspaceId, userId);
    if (!memberRole || !['admin', 'owner'].includes(memberRole)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin or owner privileges required'
      });
    }
    
    const {
      notificationsEnabled,
      privacyLevel,
      allowGuestAccess,
      domainRestrictions,
      defaultUserRole
    } = req.body;
    
    // Update workspace settings
    const updatedSettings = await db.updateWorkspaceSettings(
      workspaceId,
      {
        notificationsEnabled,
        privacyLevel,
        allowGuestAccess,
        domainRestrictions,
        defaultUserRole
      }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Workspace settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating workspace settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating workspace settings',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/workspace-settings/:workspaceId/workspace
 * @description Delete a workspace
 * @access Private (owner only)
 */
router.delete('/:workspaceId/workspace', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    
    // Get the workspace to check ownership
    const workspace = await db.getWorkspace(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }
    
    // Check if user is the owner
    if (workspace.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only the workspace owner can delete the workspace'
      });
    }
    
    // Check if this is a personal workspace
    if (workspace.is_personal) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a personal workspace'
      });
    }
    
    // Delete the workspace
    await db.deleteWorkspace(workspaceId);
    
    return res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting workspace',
      error: error.message
    });
  }
});

/**
 * @route PATCH /api/workspace-settings/:workspaceId/notifications
 * @description Update workspace notification settings
 * @access Private (admin/owner only)
 */
router.patch('/:workspaceId/notifications', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    
    // Check if user is an admin or owner of the workspace
    const memberRole = await db.getWorkspaceMemberRole(workspaceId, userId);
    if (!memberRole || !['admin', 'owner'].includes(memberRole)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin or owner privileges required'
      });
    }
    
    const { notificationsEnabled } = req.body;
    
    if (notificationsEnabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Notifications enabled setting is required'
      });
    }
    
    // Update just the notifications setting
    const updatedSettings = await db.updateWorkspaceSettings(
      workspaceId,
      { notificationsEnabled }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Workspace notification settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating workspace notification settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating workspace notification settings',
      error: error.message
    });
  }
});

/**
 * @route PATCH /api/workspace-settings/:workspaceId/privacy
 * @description Update workspace privacy settings
 * @access Private (admin/owner only)
 */
router.patch('/:workspaceId/privacy', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    
    // Check if user is an admin or owner of the workspace
    const memberRole = await db.getWorkspaceMemberRole(workspaceId, userId);
    if (!memberRole || !['admin', 'owner'].includes(memberRole)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin or owner privileges required'
      });
    }
    
    const { privacyLevel, allowGuestAccess, domainRestrictions } = req.body;
    
    // Update privacy settings
    const updatedSettings = await db.updateWorkspaceSettings(
      workspaceId,
      {
        privacyLevel,
        allowGuestAccess,
        domainRestrictions
      }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Workspace privacy settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating workspace privacy settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating workspace privacy settings',
      error: error.message
    });
  }
});

/**
 * @route PATCH /api/workspace-settings/:workspaceId/roles
 * @description Update default user role for the workspace
 * @access Private (admin/owner only)
 */
router.patch('/:workspaceId/roles', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    
    // Check if user is an admin or owner of the workspace
    const memberRole = await db.getWorkspaceMemberRole(workspaceId, userId);
    if (!memberRole || !['admin', 'owner'].includes(memberRole)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin or owner privileges required'
      });
    }
    
    const { defaultUserRole } = req.body;
    
    if (!defaultUserRole) {
      return res.status(400).json({
        success: false,
        message: 'Default user role is required'
      });
    }
    
    // Update default user role
    const updatedSettings = await db.updateWorkspaceSettings(
      workspaceId,
      { defaultUserRole }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Default user role updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating default user role:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating default user role',
      error: error.message
    });
  }
});

module.exports = router;
