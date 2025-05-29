const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import simplified routes
const simpleAuthRoutes = require('./routes/simple-auth.routes');
const userSettingsRoutes = require('./routes/userSettings.routes');
const workspaceSettingsRoutes = require('./routes/workspaceSettings.routes');
const workspaceRoutes = require('./routes/workspace.routes');

const app = express();

// More permissive CORS configuration for development
const corsOptions = {
  // Allow all origins in development
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    // as well as any origin in development
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie-parser middleware

// Basic logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Simple API Routes
app.use('/api/auth', simpleAuthRoutes);
app.use('/api/user-settings', userSettingsRoutes);
app.use('/api/workspace-settings', workspaceSettingsRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend API is running',
    time: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

module.exports = app;
