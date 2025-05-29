// Database migration script using Knex.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createKnexClient } = require('../config/db.config');

async function runMigration() {
  console.log('Starting database migration...');
  console.log(`Using database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
  
  try {
    // Create Knex client
    const db = createKnexClient();
    
    // First check if connection works
    console.log('Testing database connection...');
    await db.raw('SELECT NOW()');
    console.log('Database connection successful!');
    
    // Create schema from the schema.sql file
    console.log('Running schema migration...');
    const schemaPath = path.join(__dirname, '../../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon to execute each statement separately
    const statements = schemaSql.split(';').filter(statement => statement.trim() !== '');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await db.raw(`${statement};`);
        process.stdout.write('.');
        
        // Add a new line every 10 statements for readability
        if ((i + 1) % 10 === 0) {
          process.stdout.write('\n');
        }
      } catch (error) {
        console.error(`\nError executing statement ${i + 1}:\n${statement}\n\nError: ${error.message}`);
        // Continue with next statement despite errors
      }
    }
    
    console.log('\nSchema creation completed.');
    
    // Run knex migrations
    console.log('Running Knex migrations...');
    await db.migrate.latest();
    const [batchNo, log] = await db.migrate.status();
    
    if (log.length === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`Batch ${batchNo} run: ${log.length} migrations`);
      log.forEach(item => console.log(`- ${item.name}`));
    }
    
    console.log('Migration completed successfully!');
    
    // Check tables
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\nAvailable tables:');
    if (tables.rows.length === 0) {
      console.log('No tables found.');
    } else {
      tables.rows.forEach(row => console.log(`- ${row.table_name}`));
    }
    
    await db.destroy();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
