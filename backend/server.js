const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// Import routes
const uploadRoutes = require('./src/routes/upload');
const jobsRoutes = require('./src/routes/jobs');
const audioRoutes = require('./src/routes/audio');

// Import job processor
const { startJobProcessor } = require('./src/services/jobProcessor');

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_PATH = process.env.STORAGE_PATH || '/storage/tts-output';

// Middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://*.dein-domain.de', 'http://localhost:5173']
    : '*',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting - skip for GET requests (polling), apply to writes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window for general API
  message: { error: 'Too many requests, please try again later' },
  skip: (req) => req.method === 'GET' // Skip limit for polling requests
});
app.use('/api/', apiLimiter);

// Stricter limit for POST/DELETE operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 write operations per 15 min
  message: { error: 'Too many requests, please try again later' }
});

// Stricter rate limit for uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: { error: 'Upload limit exceeded, please try again later' }
});
app.use('/api/upload', uploadLimiter);

// Ensure storage directories exist
const dirs = [
  STORAGE_PATH,
  path.join(STORAGE_PATH, 'uploads'),
  path.join(STORAGE_PATH, 'tts-output')
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'vibe-voice-backend',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/audio', audioRoutes);

// List available voices endpoint
app.get('/api/voices', (req, res) => {
  res.json({
    voices: [
      {
        id: 'de-thorsten-low',
        name: 'Thorsten (Low Quality)',
        description: 'Fastest, smallest file size, lower quality',
        sampleRate: 16000
      },
      {
        id: 'de-thorsten-medium',
        name: 'Thorsten (Medium Quality)',
        description: 'Good balance of quality and speed',
        sampleRate: 22050,
        recommended: true
      },
      {
        id: 'de-thorsten-high',
        name: 'Thorsten (High Quality)',
        description: 'Best quality, slightly slower',
        sampleRate: 22050
      }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Maximum file size is 50MB'
      });
    }
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🎙️  Vibe Voice TTS Backend');
  console.log('='.repeat(50));
  console.log(`Port: ${PORT}`);
  console.log(`Storage: ${STORAGE_PATH}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));

  // Start job processor
  startJobProcessor();
  console.log('Job processor started');
});

module.exports = app;
