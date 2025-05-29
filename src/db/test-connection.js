// Test connection to AWS PostgreSQL database
require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  console.log('Testing connection to AWS PostgreSQL database...');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`User: ${process.env.DB_USER}`);
  
  // Try different SSL options
  const sslOptions = [
    { rejectUnauthorized: false },
    { rejectUnauthorized: true },
    null
  ];
  
  for (let i = 0; i < sslOptions.length; i++) {
    const sslOption = sslOptions[i];
    console.log(`\nAttempting connection with SSL option: ${JSON.stringify(sslOption)}`);
    
    const client = new Client({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: sslOption,
      connectionTimeoutMillis: 10000 // 10 seconds timeout
    });
    
    try {
      await client.connect();
      console.log('Connection successful!');
      const result = await client.query('SELECT NOW() as now');
      console.log(`Current database time: ${result.rows[0].now}`);
      
      // Check for existing tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('\nExisting tables:');
      if (tablesResult.rows.length === 0) {
        console.log('No tables found');
      } else {
        tablesResult.rows.forEach(row => {
          console.log(`- ${row.table_name}`);
        });
      }
      
      await client.end();
      return; // Exit after successful connection
    } catch (error) {
      console.error(`Connection failed: ${error.message}`);
      try {
        await client.end();
      } catch (e) {
        // Ignore errors during disconnection
      }
    }
  }
  
  console.log('\nAll connection attempts failed. Please check your database configuration and network settings.');
}

testConnection().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
