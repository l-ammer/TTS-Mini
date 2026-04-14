const express = require('express');
const db = require('../database/sqlite');
const { getJobStatus } = require('../services/jobProcessor');

const router = express.Router();

/**
 * GET /api/jobs
 * List all jobs with status
 */
router.get('/', (req, res) => {
  try {
    const jobs = db.getAllJobs();

    // Enrich with progress info
    const enrichedJobs = jobs.map(job => {
      let progress = 0;
      if (job.total_chars > 0) {
        progress = Math.min(100, Math.round((job.processed_chars / job.total_chars) * 100));
      }

      return {
        id: job.id,
        filename: job.filename,
        status: job.status,
        voice: job.voice,
        speed: job.speed,
        created_at: job.created_at,
        completed_at: job.completed_at,
        progress,
        total_chars: job.total_chars,
        error_message: job.status === 'failed' ? job.error_message : undefined
      };
    });

    res.json({
      success: true,
      jobs: enrichedJobs
    });

  } catch (error) {
    console.error('List jobs error:', error);
    res.status(500).json({
      error: 'Failed to retrieve jobs',
      message: error.message
    });
  }
});

/**
 * GET /api/jobs/:id
 * Get specific job status
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const job = getJobStatus(id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      job
    });

  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      error: 'Failed to retrieve job',
      message: error.message
    });
  }
});

/**
 * DELETE /api/jobs/:id
 * Delete a job and its associated files
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const job = db.getJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    // Delete output file if exists
    if (job.output_path) {
      const fs = require('fs');
      if (fs.existsSync(job.output_path)) {
        fs.unlinkSync(job.output_path);
      }
    }

    // Delete from database
    const deleteStmt = db.db.prepare('DELETE FROM jobs WHERE id = ?');
    deleteStmt.run(id);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      error: 'Failed to delete job',
      message: error.message
    });
  }
});

module.exports = router;
