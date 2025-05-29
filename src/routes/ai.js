/**
 * AI Routes
 * 
 * Handles all AI-related endpoints
 */

const express = require('express');
const router = express.Router();
const { 
  generateAIResponse, 
  generateWithLangChain, 
  updateResponseFeedback, 
  getUserAIUsage 
} = require('../services/ai/aiService');

/**
 * Generate an AI response
 * POST /api/ai/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, options, messageId, channelId, workspaceId } = req.body;
    
    // Get user ID from authentication middleware
    const userId = req.user?.id;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const result = await generateAIResponse(
      prompt, 
      options, 
      userId, 
      messageId, 
      channelId, 
      workspaceId
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error in AI generate endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate an AI response using LangChain
 * POST /api/ai/generate/langchain
 */
router.post('/generate/langchain', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    const userId = req.user?.id;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const result = await generateWithLangChain(prompt, options, userId);
    res.json(result);
  } catch (error) {
    console.error('Error in LangChain generate endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update feedback for an AI response
 * POST /api/ai/feedback/:id
 */
router.post('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, rating } = req.body;
    
    if (!feedback) {
      return res.status(400).json({ error: 'Feedback is required' });
    }
    
    await updateResponseFeedback(id, feedback, rating);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating AI feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get AI usage for the current user
 * GET /api/ai/usage
 */
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Default to last 30 days
    let endDate = new Date();
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Allow custom date range
    const { from, to } = req.query;
    if (from) startDate = new Date(from);
    if (to) endDate = new Date(to);
    
    const usage = await getUserAIUsage(userId, startDate, endDate);
    res.json(usage);
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
