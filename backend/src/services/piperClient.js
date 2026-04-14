const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PIPER_HOST = process.env.PIPER_HOST || 'piper';
const PIPER_PORT = process.env.PIPER_PORT || 10200;
const STORAGE_PATH = process.env.STORAGE_PATH || '/storage/tts-output';

/**
 * Connect to Piper Wyoming server and synthesize text
 * Falls back to direct HTTP API if WebSocket fails
 */
class PiperClient {
  constructor() {
    this.ws = null;
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`ws://${PIPER_HOST}:${PIPER_PORT}`);

        this.ws.on('open', () => {
          console.log('Connected to Piper TTS server');
          this.connected = true;
          resolve();
        });

        this.ws.on('error', (err) => {
          console.error('Piper WebSocket error:', err.message);
          this.connected = false;
          reject(err);
        });

        this.ws.on('close', () => {
          this.connected = false;
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Synthesize text to audio
   * @param {string} text - Text to synthesize
   * @param {string} voice - Voice ID (e.g., 'de-thorsten-medium')
   * @param {number} speed - Speed multiplier (0.5 - 2.0)
   * @returns {Promise<Buffer>} - WAV audio data
   */
  async synthesize(text, voice = 'de-thorsten-medium', speed = 1.0) {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const audioChunks = [];
      let textInfo = null;

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'audio-start') {
            // Audio transmission starting
          } else if (message.type === 'audio-chunk') {
            // Handle base64 encoded audio data
            if (message.data) {
              audioChunks.push(Buffer.from(message.data, 'base64'));
            }
          } else if (message.type === 'audio-stop') {
            // Audio transmission complete
            const audioBuffer = Buffer.concat(audioChunks);
            resolve(audioBuffer);
          } else if (message.type === 'error') {
            reject(new Error(`Piper error: ${message.data}`));
          }
        } catch (err) {
          // Binary audio data directly
          if (Buffer.isBuffer(data)) {
            audioChunks.push(data);
          }
        }
      });

      this.ws.on('error', reject);

      // Send synthesis request
      this.ws.send(JSON.stringify({
        type: 'synthesize',
        data: {
          text: text,
          voice: voice,
          speed: speed
        }
      }));
    });
  }

  /**
   * Alternative: Use HTTP API directly (simpler, no streaming)
   * POST /api/tts with text in body, returns WAV
   */
  async synthesizeViaHTTP(text, voice = 'de-thorsten-medium', speed = 1.0) {
    const axios = require('axios');

    try {
      const response = await axios.post(
        `http://${PIPER_HOST}:${PIPER_PORT}/api/tts`,
        { text, voice, speed },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data);
    } catch (err) {
      throw new Error(`HTTP synthesis failed: ${err.message}`);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
    }
  }
}

/**
 * Convert WAV buffer to MP3 using ffmpeg
 * @param {Buffer} wavBuffer - WAV audio data
 * @param {string} outputPath - Where to save MP3
 * @returns {Promise<string>} - Path to MP3 file
 */
async function convertWavToMp3(wavBuffer, outputPath) {
  return new Promise((resolve, reject) => {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',           // Input from stdin (WAV)
      '-acodec', 'libmp3lame',   // MP3 codec
      '-ab', '192k',             // Bitrate
      '-ar', '22050',            // Sample rate
      '-ac', '1',                // Mono (Piper output is mono)
      '-f', 'mp3',               // Output format
      outputPath
    ]);

    let stderr = '';

    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg failed (code ${code}): ${stderr}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Process multiple chunks and combine into single MP3
 * This uses ffmpeg concat demuxer for gapless joining
 */
async function combineChunksToMp3(chunks, outputPath) {
  // Process each chunk individually first
  const tempFiles = [];

  for (let i = 0; i < chunks.length; i++) {
    const tempWav = path.join(STORAGE_PATH, `temp_${i}.wav`);
    fs.writeFileSync(tempWav, chunks[i]);
    tempFiles.push(tempWav);
  }

  // Create concat file list
  const listFile = path.join(STORAGE_PATH, 'concat_list.txt');
  const listContent = tempFiles.map(f => `file '${f}'`).join('\n');
  fs.writeFileSync(listFile, listContent);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-acodec', 'libmp3lame',
      '-ab', '192k',
      '-ar', '22050',
      '-ac', '1',
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      // Cleanup temp files
      tempFiles.forEach(f => {
        try { fs.unlinkSync(f); } catch (e) {}
      });
      try { fs.unlinkSync(listFile); } catch (e) {}

      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg concat failed with code ${code}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

module.exports = {
  PiperClient,
  convertWavToMp3,
  combineChunksToMp3,
  STORAGE_PATH
};
