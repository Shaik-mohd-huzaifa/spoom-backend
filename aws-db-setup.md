# AWS Aurora PostgreSQL Setup

## Environment Variables
Create a `.env` file in the backend directory with the following variables:

```
# Database Configuration
DB_HOST=your-aurora-cluster-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=spoom
DB_USER=postgres
DB_PASSWORD=your-secure-password

# AWS Cognito (for authentication)
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id
COGNITO_REGION=your-region

# App Configuration
PORT=8000
NODE_ENV=development
JWT_SECRET=your-jwt-secret
```

## Aurora PostgreSQL Setup Steps

1. **Create an Aurora PostgreSQL Cluster**:
   - Go to AWS RDS Console
   - Click "Create database"
   - Select "Standard create" and "Amazon Aurora"
   - Choose "PostgreSQL-Compatible"
   - Select appropriate settings for your workload
   - Set master username and password (save these for your .env file)
   - Configure remaining settings and create database

2. **Configure Security Group**:
   - Ensure your security group allows inbound connections on port 5432
   - For development, you might need to allow connections from your IP address

3. **Create the Database Schema**:
   - Connect to your Aurora instance using a PostgreSQL client
   - Run the schema.sql file to create the tables
   - Example command: `psql -h your-aurora-endpoint -U postgres -d spoom -f schema.sql`

4. **Update Application Configuration**:
   - Add Aurora endpoint to your .env file
   - Ensure connection pooling is configured correctly in database.js
