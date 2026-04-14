const pdfParse = require('pdf-parse');

/**
 * Extract text from PDF buffer
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<{text: string, numPages: number, info: object}>}
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);

    return {
      text: cleanText(data.text),
      numPages: data.numpages,
      info: data.info
    };
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text) {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page numbers (common patterns)
    .replace(/\n?\s*\d+\s*\n/g, '\n')
    // Fix German quotes
    .replace(/''/g, '"')
    .replace(/'/g, "'")
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove control characters
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    // Trim
    .trim();
}

/**
 * Split long text into chunks for TTS processing
 * Piper works best with chunks of 500-1000 characters
 * @param {string} text - The full text
 * @param {number} maxChunkSize - Maximum characters per chunk (default: 800)
 * @returns {string[]}
 */
function splitIntoChunks(text, maxChunkSize = 800) {
  const chunks = [];
  let currentChunk = '';

  // Split by sentences (rough approximation)
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    // If sentence alone exceeds chunk size, split it
    if (sentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Split long sentence into word chunks
      const words = sentence.split(' ');
      let wordChunk = '';

      for (const word of words) {
        if ((wordChunk + ' ' + word).length > maxChunkSize) {
          chunks.push(wordChunk.trim());
          wordChunk = word;
        } else {
          wordChunk += (wordChunk ? ' ' : '') + word;
        }
      }

      if (wordChunk) {
        currentChunk = wordChunk;
      }
    } else if ((currentChunk + ' ' + sentence).length > maxChunkSize) {
      // Start new chunk
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      // Add to current chunk
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Estimate audio duration in seconds (approximate)
 * German: ~130 words per minute, average 5 chars per word = ~10 chars/sec
 */
function estimateDuration(textLength) {
  return Math.ceil(textLength / 10);
}

module.exports = {
  extractTextFromPDF,
  splitIntoChunks,
  estimateDuration
};
