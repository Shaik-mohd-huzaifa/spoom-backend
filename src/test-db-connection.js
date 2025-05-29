// Test script to verify database connection
// Load environment variables directly
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('./config/database');

async function testConnection() {
  console.log('Testing database connection...');
  
  try {
    // Simple query to test connection
    const result = await db.query('SELECT NOW() as current_time');
    console.log('Database connection successful!');
    console.log('Current database time:', result.rows[0].current_time);
    
    // Check if we can access our tables
    try {
      const tablesResult = await db.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      
      console.log('\nAvailable tables:');
      if (tablesResult.rows.length === 0) {
        console.log('No tables found. You may need to run the schema migration.');
      } else {
        tablesResult.rows.forEach(row => {
          console.log(`- ${row.table_name}`);
        });
      }
    } catch (tableError) {
      console.error('Error checking tables:', tableError.message);
    }
  } catch (error) {
    console.error('Database connection failed!');
    console.error('Error:', error.message);
    
    // Additional error information
    if (error.code === 'ENOTFOUND') {
      console.error('Host not found. Check your DB_HOST value.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Check if the database is running and accessible.');
    } else if (error.code === '28000' || error.code === '28P01') {
      console.error('Authentication failed. Check your credentials.');
    } else if (error.code === '3D000') {
      console.error('Database does not exist. Check your DB_NAME value.');
    }
    
    // Log connection parameters (without password)
    console.log('\nConnection parameters:');
    console.log('Host:', process.env.DB_HOST);
    console.log('Port:', process.env.DB_PORT || 5432);
    console.log('Database:', process.env.DB_NAME);
    console.log('User:', process.env.DB_USER);
    console.log('Using IAM auth:', !process.env.DB_PASSWORD);
  } finally {
    // Close the pool to end the process
    await db.pool.end();
  }
}

// Run the test
testConnection();
