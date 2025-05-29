/**
 * AI Service Implementation
 * 
 * This service handles interactions with AI models and stores results in the database
 */

const { openai, chatModel, defaultParams } = require('./config');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'spoom',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

/**
 * Generate a response using OpenAI API
 * @param {string} prompt User prompt
 * @param {object} options Configuration options
 * @param {string} userId User ID (optional)
 * @param {string} messageId Related message ID (optional)
 * @param {string} channelId Channel ID (optional)
 * @param {string} workspaceId Workspace ID (optional)
 * @returns {Promise<object>} AI response and metadata
 */
async function generateAIResponse(prompt, options = {}, userId = null, messageId = null, channelId = null, workspaceId = null) {
  try {
    // Start timing for performance tracking
    const startTime = Date.now();
    
    // Set up request parameters with defaults
    const params = {
      ...defaultParams.chat,
      ...options,
      messages: [
        { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ]
    };
    
    // Make the API call
    const completion = await openai.chat.completions.create(params);
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Extract response
    const responseText = completion.choices[0].message.content;
    const tokensUsed = completion.usage.total_tokens;
    const model = completion.model;
    
    // Calculate approximate cost (simplified)
    const cost = calculateCost(tokensUsed, model);
    
    // Save to database
    const id = await saveResponseToDatabase(
      prompt, 
      responseText, 
      model, 
      tokensUsed, 
      duration, 
      cost, 
      userId, 
      messageId, 
      channelId, 
      workspaceId
    );
    
    // Return the response with metadata
    return {
      id,
      response: responseText,
      model,
      tokensUsed,
      duration,
      cost
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
}

/**
 * Generate an AI response using LangChain
 * @param {string} prompt User prompt
 * @param {object} options Configuration options
 * @param {string} userId User ID (optional)
 * @returns {Promise<object>} AI response and metadata
 */
async function generateWithLangChain(prompt, options = {}, userId = null) {
  try {
    const startTime = Date.now();
    
    // Prepare the messages array for LangChain
    const { HumanMessage, SystemMessage } = require('langchain/schema');
    
    const messages = [
      new SystemMessage(options.systemPrompt || 'You are a helpful assistant.'),
      new HumanMessage(prompt)
    ];
    
    // Send to the model
    const result = await chatModel.call(messages);
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Extract response
    const responseText = result.content;
    
    // Since LangChain doesn't provide token counts directly, estimate it
    const tokensUsed = estimateTokens(prompt + responseText);
    const model = chatModel.modelName;
    const cost = calculateCost(tokensUsed, model);
    
    // Save to database
    const id = await saveResponseToDatabase(
      prompt, 
      responseText, 
      model, 
      tokensUsed, 
      duration, 
      cost, 
      userId
    );
    
    return {
      id,
      response: responseText,
      model,
      tokensUsed,
      duration,
      cost
    };
  } catch (error) {
    console.error('Error generating AI response with LangChain:', error);
    throw new Error(`Failed to generate AI response with LangChain: ${error.message}`);
  }
}

/**
 * Save AI response to the database
 * @param {string} prompt User prompt
 * @param {string} response AI response
 * @param {string} model Model name
 * @param {number} tokensUsed Tokens used
 * @param {number} duration Response time in ms
 * @param {number} cost Estimated cost
 * @param {string} userId User ID (optional)
 * @param {string} messageId Message ID (optional)
 * @param {string} channelId Channel ID (optional)
 * @param {string} workspaceId Workspace ID (optional)
 * @returns {Promise<string>} ID of the saved record
 */
async function saveResponseToDatabase(
  prompt, 
  response, 
  model, 
  tokensUsed, 
  duration, 
  cost, 
  userId = null, 
  messageId = null, 
  channelId = null, 
  workspaceId = null
) {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO ai_generated_responses (
        id, user_id, message_id, channel_id, workspace_id, 
        prompt, response, model, tokens_used, duration_ms, cost
      ) 
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING id
    `;
    
    const values = [
      userId, messageId, channelId, workspaceId,
      prompt, response, model, tokensUsed, duration, cost
    ];
    
    const result = await client.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error saving AI response to database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update AI response feedback
 * @param {string} responseId Response ID
 * @param {string} feedback Feedback (good, bad, neutral)
 * @param {number} rating Rating (1-5)
 * @returns {Promise<boolean>} Success status
 */
async function updateResponseFeedback(responseId, feedback, rating = null) {
  const client = await pool.connect();
  
  try {
    const query = `
      UPDATE ai_generated_responses 
      SET feedback = $1, rating = $2, updated_at = NOW() 
      WHERE id = $3
    `;
    
    await client.query(query, [feedback, rating, responseId]);
    return true;
  } catch (error) {
    console.error('Error updating AI response feedback:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get AI usage statistics for a user
 * @param {string} userId User ID
 * @param {Date} startDate Start date for range
 * @param {Date} endDate End date for range
 * @returns {Promise<object>} Usage statistics
 */
async function getUserAIUsage(userId, startDate, endDate) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        COUNT(*) as total_requests,
        SUM(tokens_used) as total_tokens,
        SUM(cost) as total_cost,
        AVG(tokens_used) as avg_tokens_per_request,
        AVG(duration_ms) as avg_response_time
      FROM ai_generated_responses
      WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
    `;
    
    const result = await client.query(query, [userId, startDate, endDate]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user AI usage:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculate the approximate cost of an AI request
 * @param {number} tokens Number of tokens used
 * @param {string} model Model name
 * @returns {number} Cost in USD
 */
function calculateCost(tokens, model) {
  // These rates should be kept up to date with OpenAI's pricing
  const rates = {
    'gpt-4': 0.03 / 1000, // $0.03 per 1K tokens
    'gpt-4-turbo': 0.01 / 1000, // $0.01 per 1K tokens
    'gpt-3.5-turbo': 0.002 / 1000, // $0.002 per 1K tokens
    'text-embedding-ada-002': 0.0001 / 1000 // $0.0001 per 1K tokens
  };
  
  // Default to GPT-3.5 rate if model not found
  const rate = rates[model] || rates['gpt-3.5-turbo'];
  
  return tokens * rate;
}

/**
 * Estimate the number of tokens in a text
 * @param {string} text Input text
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  // Simple estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

module.exports = {
  generateAIResponse,
  generateWithLangChain,
  updateResponseFeedback,
  getUserAIUsage
};
