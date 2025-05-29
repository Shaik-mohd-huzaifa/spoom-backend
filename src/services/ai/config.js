/**
 * AI Service Configuration
 * 
 * This file sets up the OpenAI and LangChain configurations
 */

const { OpenAI } = require('openai');
const { ChatOpenAI } = require('langchain/chat_models/openai');
require('dotenv').config();

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. AI functionality will not work correctly.');
}

// OpenAI client initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION_ID, // Optional
});

// LangChain model initialization
const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  modelName: 'gpt-4', // Can be configured based on needs and environment
  maxTokens: 2000,
});

// Configure default parameters for different types of AI requests
const defaultParams = {
  chat: {
    model: 'gpt-4-turbo',
    temperature: 0.7,
    max_tokens: 1000,
  },
  completion: {
    model: 'gpt-3.5-turbo-instruct',
    temperature: 0.5,
    max_tokens: 500,
  },
  embedding: {
    model: 'text-embedding-ada-002',
  },
};

const RATE_LIMITS = {
  FREE_TIER: {
    requests_per_day: 20,
    tokens_per_request: 1000,
  },
  BASIC_TIER: {
    requests_per_day: 100,
    tokens_per_request: 2000,
  },
  PRO_TIER: {
    requests_per_day: 500,
    tokens_per_request: 4000,
  },
  ENTERPRISE_TIER: {
    requests_per_day: 2000,
    tokens_per_request: 8000,
  },
};

module.exports = {
  openai,
  chatModel,
  defaultParams,
  RATE_LIMITS
};
