// Database configuration using Knex
const knex = require('knex');
require('dotenv').config();

/**
 * Creates and returns a configured Knex client for database operations
 * @param {Object} options - Additional options to override defaults
 * @returns {Object} Knex client instance
 */
function createKnexClient(options = {}) {
  const config = {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: 2,
      max: 10
    },
    ...options
  };

  return knex(config);
}

module.exports = { createKnexClient };
