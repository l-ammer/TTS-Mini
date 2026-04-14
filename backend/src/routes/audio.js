const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../database/sqlite');

const router = express.Router();

/**
 * GET /api/audio/:id
 * Stream or download generated MP3
 * Query params:
 *   - download=true (force download with filename)
 *   - stream=true (stream for audio player)
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { download, stream } = req.query;

    const job = db.getJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    if (job.status !== 'completed' || !job.output_path) {
      return res.status(400).json({
        error: 'Audio not ready',
        status: job.status,
        progress: job.total_chars > 0
          ? Math.min(100, Math.round((job.processed_chars / job.total_chars) * 100))
          : 0
      });
    }

    if (!fs.existsSync(job.output_path)) {
      return res.status(404).json({
        error: 'Audio file not found on disk'
      });
    }

    const stat = fs.statSync(job.output_path);
    const fileSize = stat.size;
    const filename = path.basename(job.filename, path.extname(job.filename)) + '.mp3';

    // Handle range requests (for streaming)
    if (req.headers.range || stream) {
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        const file = fs.createReadStream(job.output_path, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg'
        };

        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // Full file streaming
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        fs.createReadStream(job.output_path).pipe(res);
      }
    } else {
      // Download mode
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      fs.createReadStream(job.output_path).pipe(res);
    }

  } catch (error) {
    console.error('Audio download error:', error);
    res.status(500).json({
      error: 'Failed to serve audio',
      message: error.message
    });
  }
});

/**
 * GET /api/audio/:id/info
 * Get audio file metadata without downloading
 */
router.get('/:id/info', (req, res) => {
  try {
    const { id } = req.params;
    const job = db.getJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    if (job.status !== 'completed' || !job.output_path) {
      return res.json({
        ready: false,
        status: job.status,
        progress: job.total_chars > 0
          ? Math.min(100, Math.round((job.processed_chars / job.total_chars) * 100))
          : 0
      });
    }

    if (!fs.existsSync(job.output_path)) {
      return res.status(404).json({
        error: 'Audio file not found'
      });
    }

    const stat = fs.statSync(job.output_path);
    const filename = path.basename(job.filename, path.extname(job.filename)) + '.mp3';

    res.json({
      ready: true,
      filename,
      size: stat.size,
      size_mb: (stat.size / 1024 / 1024).toFixed(2),
      created_at: stat.birthtime,
      download_url: `/api/audio/${id}?download=true`,
      stream_url: `/api/audio/${id}?stream=true`
    });

  } catch (error) {
    console.error('Audio info error:', error);
    res.status(500).json({
      error: 'Failed to get audio info',
      message: error.message
    });
  }
});

module.exports = router;
