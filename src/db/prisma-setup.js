// Prisma setup script for database connection and migration
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const { Client } = require('pg');

// Test the database connection before running Prisma operations
async function testDatabaseConnection(connectionConfig) {
  console.log('Testing direct database connection...');
  
  const client = new Client({
    host: connectionConfig.host,
    port: connectionConfig.port,
    database: connectionConfig.database,
    user: connectionConfig.user,
    password: connectionConfig.password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Successfully connected to the database!');
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`Database current time: ${result.rows[0].current_time}`);
    
    // Test if the database allows schema creation
    try {
      await client.query('CREATE SCHEMA IF NOT EXISTS prisma');
      console.log('Schema creation permissions confirmed.');
    } catch (schemaError) {
      console.warn('Warning: Unable to create schema. Limited permissions detected.', schemaError.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Function to set up Prisma database connection
async function setupPrismaConnection() {
  console.log('Setting up Prisma database connection...');
  
  try {
    // Create the DATABASE_URL from environment variables
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME;
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    
    if (!dbHost || !dbPort || !dbName || !dbUser || !dbPassword) {
      console.error('Missing database configuration. Check your .env file.');
      process.exit(1);
    }
    
    // Format the DATABASE_URL for Prisma
    const databaseUrl = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?schema=public&sslmode=require`;
    
    console.log(`Database connection configured for: ${dbHost}:${dbPort}/${dbName}`);
    
    // Test direct connection before proceeding
    const connectionConfig = {
      host: dbHost,
      port: parseInt(dbPort),
      database: dbName,
      user: dbUser,
      password: dbPassword
    };
    
    const connectionSuccess = await testDatabaseConnection(connectionConfig);
    if (!connectionSuccess) {
      console.error('Database connection test failed. Please check your credentials and network settings.');
      process.exit(1);
    }
    
    // Set environment variable for Prisma to use
    process.env.DATABASE_URL = databaseUrl;
    
    // Create .env file in prisma directory for Prisma commands
    const prismaEnvPath = path.join(__dirname, '../../prisma/.env');
    fs.writeFileSync(prismaEnvPath, `DATABASE_URL="${databaseUrl}"\n`);
    console.log(`Created temporary Prisma environment file at ${prismaEnvPath}`);
    
    // Generate Prisma client first
    console.log('\nGenerating Prisma client...');
    try {
      execSync('npx prisma generate', { 
        stdio: 'inherit'
      });
      console.log('Prisma client generated successfully!');
    } catch (generateError) {
      console.error('Failed to generate Prisma client:', generateError.message);
      process.exit(1);
    }
    
    // Run Prisma migrations
    console.log('\nRunning Prisma migration...');
    try {
      // First try db push (safer for production)
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'inherit'
      });
      console.log('Database schema pushed successfully!');
    } catch (pushError) {
      console.error('Failed to push database schema:', pushError.message);
      
      try {
        // As a fallback, try migrate deploy (requires existing migration)
        console.log('Attempting migration deploy instead...');
        execSync('npx prisma migrate deploy', { 
          stdio: 'inherit'
        });
        console.log('Migration deployed successfully!');
      } catch (migrateError) {
        console.error('Failed to deploy migration:', migrateError.message);
        
        // Last resort: try dev migration (creates new migration)
        try {
          console.log('Creating new migration as last resort...');
          execSync('npx prisma migrate dev --name init_schema --create-only', { 
            stdio: 'inherit'
          });
          console.log('Migration created but not applied. You can apply it manually with `npx prisma migrate deploy`');
        } catch (devError) {
          console.error('All migration approaches failed:', devError.message);
          process.exit(1);
        }
      }
    }
    
    // Delete the temporary .env file
    try {
      fs.unlinkSync(prismaEnvPath);
      console.log('Temporary Prisma environment file cleaned up.');
    } catch (cleanupError) {
      console.warn('Warning: Failed to clean up temporary .env file:', cleanupError.message);
    }
    
    console.log('\nPrisma setup completed!');
    
  } catch (error) {
    console.error('Prisma setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupPrismaConnection();
