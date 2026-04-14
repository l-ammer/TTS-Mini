const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || '/data/vibe-voice.db';

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    text_content TEXT,
    voice TEXT DEFAULT 'de-thorsten-medium',
    speed REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    output_path TEXT,
    error_message TEXT,
    total_chars INTEGER DEFAULT 0,
    processed_chars INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_created ON jobs(created_at);
`);

module.exports = {
  db,

  // Job operations
  createJob: (job) => {
    const stmt = db.prepare(`
      INSERT INTO jobs (id, filename, status, text_content, voice, speed, total_chars)
      VALUES (@id, @filename, @status, @text_content, @voice, @speed, @total_chars)
    `);
    return stmt.run(job);
  },

  getJob: (id) => {
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  },

  getAllJobs: () => {
    return db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
  },

  getPendingJobs: () => {
    return db.prepare("SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC").all();
  },

  updateJobStatus: (id, status, updates = {}) => {
    const setClause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    const sql = setClause
      ? `UPDATE jobs SET status = @status, ${setClause} WHERE id = @id`
      : `UPDATE jobs SET status = @status WHERE id = @id`;

    const stmt = db.prepare(sql);
    return stmt.run({ id, status, ...updates });
  },

  updateJobProgress: (id, processedChars) => {
    const stmt = db.prepare('UPDATE jobs SET processed_chars = ? WHERE id = ?');
    return stmt.run(processedChars, id);
  },

  completeJob: (id, outputPath) => {
    const stmt = db.prepare(`
      UPDATE jobs
      SET status = 'completed', output_path = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(outputPath, id);
  },

  failJob: (id, errorMessage) => {
    const stmt = db.prepare(`
      UPDATE jobs
      SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(errorMessage, id);
  },

  deleteOldJobs: (days = 30) => {
    const stmt = db.prepare(`
      DELETE FROM jobs
      WHERE created_at < datetime('now', '-${days} days')
      AND status IN ('completed', 'failed')
    `);
    return stmt.run();
  }
};
