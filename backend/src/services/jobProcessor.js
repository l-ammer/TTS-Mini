const { extractTextFromPDF, splitIntoChunks } = require('./pdfExtractor');
const { PiperClient, convertWavToMp3, combineChunksToMp3, STORAGE_PATH } = require('./piperClient');
const db = require('../database/sqlite');
const fs = require('fs');
const path = require('path');

// Configuration
const CONCURRENT_JOBS = parseInt(process.env.CONCURRENT_JOBS) || 1;
const MAX_CHUNK_SIZE = 800; // Characters per TTS chunk

let isProcessing = false;
let activeJobs = 0;

/**
 * Start the job processor loop
 * Called when server starts
 */
function startJobProcessor() {
  console.log(`Starting job processor (max concurrent: ${CONCURRENT_JOBS})`);

  // Process immediately and then every 5 seconds
  processJobs();
  setInterval(processJobs, 5000);
}

/**
 * Check for pending jobs and process them
 */
async function processJobs() {
  if (isProcessing || activeJobs >= CONCURRENT_JOBS) {
    return;
  }

  const pendingJobs = db.getPendingJobs();

  if (pendingJobs.length === 0) {
    return;
  }

  isProcessing = true;

  for (const job of pendingJobs.slice(0, CONCURRENT_JOBS - activeJobs)) {
    activeJobs++;

    // Process in background (don't await here)
    processJob(job).catch(err => {
      console.error(`Job ${job.id} failed:`, err);
    }).finally(() => {
      activeJobs--;
    });
  }

  isProcessing = false;
}

/**
 * Process a single job
 */
async function processJob(job) {
  console.log(`Processing job ${job.id}: ${job.filename}`);

  const piper = new PiperClient();

  try {
    // Update status to processing
    db.updateJobStatus(job.id, 'processing');

    // Get the PDF file path
    const pdfPath = path.join(STORAGE_PATH, 'uploads', `${job.id}.pdf`);

    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF file not found');
    }

    // Extract text from PDF
    console.log(`  Extracting text from ${job.filename}...`);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const { text, numPages } = await extractTextFromPDF(pdfBuffer);

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in PDF (may be scanned images)');
    }

    console.log(`  Extracted ${text.length} characters from ${numPages} pages`);

    // Update job with extracted text
    db.updateJobStatus(job.id, 'processing', {
      text_content: text.substring(0, 1000), // Store preview
      total_chars: text.length
    });

    // Split into chunks
    const chunks = splitIntoChunks(text, MAX_CHUNK_SIZE);
    console.log(`  Split into ${chunks.length} chunks`);

    // Process each chunk
    const audioChunks = [];
    let processedChars = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`  Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      try {
        // Synthesize this chunk
        const wavBuffer = await piper.synthesizeViaHTTP(
          chunk,
          job.voice,
          parseFloat(job.speed) || 1.0
        );

        audioChunks.push(wavBuffer);

        // Update progress
        processedChars += chunk.length;
        db.updateJobProgress(job.id, processedChars);

      } catch (err) {
        console.error(`    Chunk ${i + 1} failed:`, err.message);
        // Continue with other chunks, mark partial failure
        if (i === 0) {
          throw new Error(`TTS synthesis failed: ${err.message}`);
        }
      }

      // Small delay to prevent overwhelming the TTS service
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    if (audioChunks.length === 0) {
      throw new Error('All TTS chunks failed');
    }

    // Combine audio chunks into final MP3
    const outputFile = `${job.id}.mp3`;
    const outputPath = path.join(STORAGE_PATH, outputFile);

    console.log(`  Combining ${audioChunks.length} audio chunks...`);

    if (audioChunks.length === 1) {
      // Single chunk - direct conversion
      await convertWavToMp3(audioChunks[0], outputPath);
    } else {
      // Multiple chunks - concat
      await combineChunksToMp3(audioChunks, outputPath);
    }

    // Verify output
    if (!fs.existsSync(outputPath)) {
      throw new Error('MP3 file was not created');
    }

    const stats = fs.statSync(outputPath);
    console.log(`  Created MP3: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Mark job as completed
    db.completeJob(job.id, outputPath);

    console.log(`  Job ${job.id} completed successfully`);

  } catch (error) {
    console.error(`  Job ${job.id} failed:`, error.message);
    db.failJob(job.id, error.message);

  } finally {
    piper.disconnect();

    // Cleanup uploaded PDF (keep for debugging if needed)
    try {
      const pdfPath = path.join(STORAGE_PATH, 'uploads', `${job.id}.pdf`);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get job status with progress info
 */
function getJobStatus(jobId) {
  const job = db.getJob(jobId);

  if (!job) {
    return null;
  }

  // Calculate progress percentage
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
    error_message: job.error_message
  };
}

module.exports = {
  startJobProcessor,
  processJobs,
  processJob,
  getJobStatus,
  CONCURRENT_JOBS
};
