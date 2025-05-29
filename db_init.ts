/**
 * Database Initialization Script for Spoom AI
 * 
 * This file handles the initialization of the database schema
 * Run with: npx ts-node db_init.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection config
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'spoom',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
};

// Create a new pool
const pool = new Pool(dbConfig);

// Get SQL schema from file
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database initialization...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Execute the schema SQL
    await client.query(schema);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
    await pool.end();
  }
}

// Run the initialization
initializeDatabase().catch(console.error);

// Export for use in other scripts if needed
export { initializeDatabase };
