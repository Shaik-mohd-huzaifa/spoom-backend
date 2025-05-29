const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import routes
const exampleRoutes = require('./routes/example.routes');
const simpleAuthRoutes = require('./routes/simple-auth.routes');
const debugRoutes = require('./routes/debug.routes'); // Simplified auth routes that handle SECRET_HASH

// Import middleware
const auth = require('./middleware/authMiddleware'); // AWS Cognito middleware

const app = express();

// Get config for CORS origins
const config = require('./config/config');

// CORS settings
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Refresh-Token'],
  maxAge: 86400,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie-parser for session persistence

// Allow pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('Request headers:', req.headers);
  next();
});

// Set security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// API Routes
app.use('/api/auth', simpleAuthRoutes); // Use the simplified auth routes
app.use('/api/examples', exampleRoutes); // Example routes without auth middleware for now
app.use('/api/debug', debugRoutes); // Debug routes for troubleshooting

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
