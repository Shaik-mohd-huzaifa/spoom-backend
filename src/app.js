const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const exampleRoutes = require('./routes/example.routes');
const authRoutes = require('./routes/auth.routes'); // AWS Cognito auth routes
const supabaseAuthRoutes = require('./routes/supabase-auth.routes'); // Supabase auth routes

// Import middleware
const { verifyToken } = require('./middleware/auth.middleware'); // AWS Cognito middleware
const { verifyToken: verifySupabaseToken } = require('./middleware/supabase-auth.middleware'); // Supabase middleware

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/auth/cognito', authRoutes); // Use Cognito at /api/auth/cognito
app.use('/api/auth', supabaseAuthRoutes); // Use Supabase as default auth provider at /api/auth
app.use('/api/examples', verifySupabaseToken, exampleRoutes); // Protect example routes with Supabase JWT

// Base route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Spoom AI Backend API',
    documentation: 'API documentation will be available at /api-docs',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
