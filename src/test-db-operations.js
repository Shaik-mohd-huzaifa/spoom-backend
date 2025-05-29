// Test script to verify database operations (create, insert, select, delete)
const db = require('./config/database');

async function testDatabaseOperations() {
  console.log('Testing database operations...');
  
  try {
    // 1. Create a test table
    console.log('Step 1: Creating test table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Test table created successfully!');
    
    // 2. Insert data into the test table
    console.log('\nStep 2: Inserting test data...');
    const insertResult = await db.query(`
      INSERT INTO test_table (name) 
      VALUES ($1), ($2), ($3)
      RETURNING id, name, created_at
    `, ['Test Item 1', 'Test Item 2', 'Test Item 3']);
    
    console.log(`✅ Inserted ${insertResult.rowCount} rows successfully!`);
    console.log('Inserted data:', insertResult.rows);
    
    // 3. Query the data
    console.log('\nStep 3: Querying test data...');
    const selectResult = await db.query('SELECT * FROM test_table');
    console.log(`✅ Retrieved ${selectResult.rowCount} rows:`);
    console.table(selectResult.rows);
    
    // 4. Update data
    console.log('\nStep 4: Updating test data...');
    const updateResult = await db.query(`
      UPDATE test_table 
      SET name = $1 
      WHERE id = $2
      RETURNING id, name, created_at
    `, ['Updated Item', selectResult.rows[0].id]);
    
    console.log(`✅ Updated ${updateResult.rowCount} row successfully!`);
    console.log('Updated data:', updateResult.rows[0]);
    
    // 5. Transaction test
    console.log('\nStep 5: Testing transactions...');
    await db.transaction(async (client) => {
      // In transaction
      await client.query(`
        INSERT INTO test_table (name) 
        VALUES ($1)
      `, ['Transaction Test Item']);
      
      // Query inside transaction
      const txResult = await client.query('SELECT COUNT(*) FROM test_table');
      console.log(`✅ Transaction successful! Current row count: ${txResult.rows[0].count}`);
    });
    
    // 6. Clean up - drop the test table
    console.log('\nStep 6: Cleaning up - dropping test table...');
    await db.query('DROP TABLE test_table');
    console.log('✅ Test table dropped successfully!');
    
    console.log('\n🎉 All database operations completed successfully!');
    console.log('Database connection and operations are working properly.');
    
  } catch (error) {
    console.error('❌ Database operation failed:');
    console.error(error);
    
    // Try to clean up if possible
    try {
      console.log('\nAttempting to clean up test table...');
      await db.query('DROP TABLE IF EXISTS test_table');
      console.log('Test table dropped.');
    } catch (cleanupError) {
      console.error('Failed to clean up test table:', cleanupError.message);
    }
  } finally {
    // Close the connection pool
    await db.pool.end();
    console.log('\nConnection pool closed.');
  }
}

// Run the test
testDatabaseOperations();
