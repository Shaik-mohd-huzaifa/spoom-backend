// Direct database connection test bypassing the database.js module
require('dotenv').config();
const { Client } = require('pg');

// Log all relevant environment variables
console.log('=== Environment Variables ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('Has DB_PASSWORD:', !!process.env.DB_PASSWORD);

// Connect directly using the pg Client
async function testDirectConnection() {
  console.log('\n=== Attempting Direct Connection ===');
  
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres', // Use 'postgres' as fallback
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 10000, // 10 seconds
    // Only use SSL for non-local connections
    ...(process.env.DB_HOST && 
        !process.env.DB_HOST.includes('localhost') && 
        !process.env.DB_HOST.includes('127.0.0.1') 
      ? { 
          ssl: { 
            rejectUnauthorized: false 
          } 
        } 
      : {})
  });

  try {
    console.log('Connecting to:', process.env.DB_HOST);
    console.log('Timeout set to: 10 seconds');
    
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Try a simple query
    const result = await client.query('SELECT current_database() as db_name, current_user as user_name');
    console.log('\nDatabase info:');
    console.log('- Connected to database:', result.rows[0].db_name);
    console.log('- Connected as user:', result.rows[0].user_name);
    
    // Check if we can access information_schema
    try {
      console.log('\nChecking database tables...');
      const tablesResult = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      
      console.log(`Found ${tablesResult.rowCount} tables:`);
      if (tablesResult.rowCount === 0) {
        console.log('No tables found in the public schema.');
      } else {
        tablesResult.rows.forEach((row, i) => {
          console.log(`${i+1}. ${row.table_name}`);
        });
      }
    } catch (tableError) {
      console.error('Error checking tables:', tableError.message);
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    // Additional diagnostic information
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('\n=== Connection Troubleshooting ===');
      console.log('1. Check that your RDS instance is set to "Publicly accessible: Yes"');
      console.log('2. Verify your IP (106.195.75.146) is allowed in the security group');
      console.log('3. Make sure the database "spoom" exists in your RDS instance');
      console.log('4. Check if your AWS RDS instance is in an available state');
    }
  } finally {
    // Close the client
    try {
      await client.end();
      console.log('\nConnection closed.');
    } catch (e) {
      // Ignore errors when closing
    }
  }
}

// Run the test
testDirectConnection();
