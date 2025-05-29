// Deploy database schema to AWS PostgreSQL
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { exec } = require('child_process');

async function deploySchema() {
  console.log('Deploying schema to AWS PostgreSQL database...');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`User: ${process.env.DB_USER}`);
  
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000 // 15 seconds timeout
  });
  
  try {
    await client.connect();
    console.log('Connection successful!');
    
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, 'db-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into statements (simple approach)
    const statements = schemaSql.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await client.query(`${statement};`);
        process.stdout.write('.');
        successCount++;
        
        // Add newline every 10 statements for readability
        if ((i + 1) % 10 === 0) {
          process.stdout.write('\n');
        }
      } catch (error) {
        process.stdout.write('x');
        errorCount++;
        console.error(`\nError executing statement ${i + 1}: ${error.message}`);
        // Continue despite errors
      }
    }
    
    console.log(`\n\nExecution completed with ${successCount} successful and ${errorCount} failed statements.`);
    
    // Check for existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nDatabase tables:');
    if (tablesResult.rows.length === 0) {
      console.log('No tables found');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
  } catch (error) {
    console.error(`Database deployment failed: ${error.message}`);
  } finally {
    await client.end();
  }
}

// Execute the deployment
deploySchema().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
