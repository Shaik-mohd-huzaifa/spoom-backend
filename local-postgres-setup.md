# Local PostgreSQL Setup for Development

## Installation

### Windows
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the setup wizard
3. Install PostgreSQL with the default options
4. Set a password for the `postgres` user
5. Keep the default port (5432)
6. Launch Stack Builder if prompted (optional)

## Configuration

1. Create a local database for development:
   ```sql
   CREATE DATABASE spoom;
   ```

2. Update your environment variables for local development:
   ```
   # Local PostgreSQL Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=spoom
   DB_USER=postgres
   DB_PASSWORD=your_local_password
   ```

3. Import your schema:
   ```bash
   psql -U postgres -d spoom -f schema.sql
   ```

## Switching Between Local and AWS

Create a `.env.local` and `.env.production` to easily switch between environments:

### .env.local
```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spoom
DB_USER=postgres
DB_PASSWORD=your_local_password

# AWS Cognito Configuration 
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_sJQUViq5n
COGNITO_CLIENT_ID=6ovjl9c0onc5g24rh92i25uvtf
COGNITO_CLIENT_SECRET=n936593j42elpu64fj76971lp6c2gi1jhqodk2fh2tbjqu05rjk
```

### .env.production
```
# Database Configuration
DB_HOST=spoom.c5um0awogh52.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=spoom
DB_USER=postgres
DB_PASSWORD=your_secure_password

# AWS Cognito Configuration
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_sJQUViq5n
COGNITO_CLIENT_ID=6ovjl9c0onc5g24rh92i25uvtf
COGNITO_CLIENT_SECRET=n936593j42elpu64fj76971lp6c2gi1jhqodk2fh2tbjqu05rjk
```

Then, to switch environments, copy the appropriate file to `.env`:
```bash
# For local development
copy .env.local .env

# For production
copy .env.production .env
```

## Tools for PostgreSQL Management

- **pgAdmin**: GUI for PostgreSQL management
- **DBeaver**: Universal database tool (supports PostgreSQL)
- **TablePlus**: Modern, native database management GUI

## Testing the Connection

```javascript
// Update database.js to automatically detect if using localhost and disable SSL
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

// Only use SSL for non-local connections
if (process.env.DB_HOST !== 'localhost' && !process.env.DB_HOST.includes('127.0.0.1')) {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}
```
