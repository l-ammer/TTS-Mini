const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const db = require('../database/sqlite');
const { STORAGE_PATH } = require('../services/piperClient');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(STORAGE_PATH, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Use job ID as filename (will be set after DB insert)
    const tempName = `temp_${Date.now()}_${path.extname(file.originalname)}`;
    cb(null, tempName);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only PDFs
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

/**
 * POST /api/upload
 * Upload PDF and create TTS job
 */
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const jobId = uuidv4();
    const filename = req.file.originalname;
    const voice = req.body.voice || 'de-thorsten-medium';
    const speed = parseFloat(req.body.speed) || 1.0;

    // Validate voice
    const validVoices = ['de-thorsten-low', 'de-thorsten-medium', 'de-thorsten-high'];
    if (!validVoices.includes(voice)) {
      return res.status(400).json({ error: 'Invalid voice selection' });
    }

    // Validate speed
    if (speed < 0.5 || speed > 2.0) {
      return res.status(400).json({ error: 'Speed must be between 0.5 and 2.0' });
    }

    // Rename uploaded file to job ID
    const oldPath = req.file.path;
    const newPath = path.join(uploadsDir, `${jobId}.pdf`);
    fs.renameSync(oldPath, newPath);

    // Create database record
    db.createJob({
      id: jobId,
      filename,
      status: 'pending',
      text_content: null,
      voice,
      speed,
      total_chars: 0
    });

    console.log(`Upload received: ${filename} (Job: ${jobId})`);

    res.status(201).json({
      success: true,
      job: {
        id: jobId,
        filename,
        status: 'pending',
        voice,
        speed,
        message: 'File uploaded successfully. Processing will begin shortly.'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);

    // Cleanup if file was uploaded
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

module.exports = router;
