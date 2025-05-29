// Make sure to load environment variables first
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// AWS PostgreSQL configuration with IAM authentication
const { Pool } = require('pg');
const AWS = require('aws-sdk');
const path = require('path');

// Debugging - log the environment variables (without sensitive data)
console.log('Database configuration:');
console.log('  DB_HOST:', process.env.DB_HOST);
console.log('  DB_PORT:', process.env.DB_PORT || '5432');
console.log('  DB_NAME:', process.env.DB_NAME);
console.log('  DB_USER:', process.env.DB_USER);
console.log('  Using password:', !!process.env.DB_PASSWORD);

// Configure AWS if credentials are available
if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
  console.log('  AWS Region:', process.env.AWS_REGION);
} else {
  console.log('  AWS credentials not fully configured');
}

// Prepare connection config with fallbacks
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  // For IAM authentication, we don't need a password as we'll use IAM token
  // If DB_PASSWORD is provided, it will be used; otherwise, IAM auth will be attempted
  password: process.env.DB_PASSWORD || undefined,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection not established
};

// Only add SSL if we're not connecting to localhost
if (process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && !process.env.DB_HOST.includes('127.0.0.1')) {
  dbConfig.ssl = {
    rejectUnauthorized: false // For development, set to true in production
  };
  console.log('  SSL: Enabled');
} else {
  console.log('  SSL: Disabled (local connection)');
}

// Create the connection pool
const pool = new Pool(dbConfig);

// Event handlers for pool connections
pool.on('connect', () => {
  console.log('Connected to Aurora PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Export query function for easy database interaction
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  
  // Transaction helper function
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Pass the client to the callback function to use the same client for all queries
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};
