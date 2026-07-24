/**
 * CallIQ — Production Server
 * Entry point: starts the Express API and mounts all routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Ensure required directories exist ──
['./uploads', './reports'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — prevents abuse on transcription endpoint (costs money per call)
const transcribeLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute window
  max: 50,                  // max 50 transcription requests per minute
  message: { error: 'Too many transcription requests. Please wait a moment.' }
});

// ── Routes ──
const transcribeRouter = require('../src/api/transcribe');

app.use('/api/transcribe', transcribeLimiter, transcribeRouter);

// Serve the front-end (if serving from same origin)
app.use(express.static(path.join(__dirname, '../public')));

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      whisper: !!process.env.OPENAI_API_KEY,
      crm:     !!process.env.CRM_BASE_URL
    }
  });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('[CallIQ Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code:  err.code || 'UNKNOWN'
  });
});

app.listen(PORT, () => {
  console.log(`\n  CallIQ Production Server`);
  console.log(`  ─────────────────────────`);
  console.log(`  Running on  http://localhost:${PORT}`);
  console.log(`  Health      http://localhost:${PORT}/health`);
  console.log(`  Department  ${process.env.DEPARTMENT || 'Recovery'}`);
  console.log(`  Sample size ${process.env.SAMPLE_SIZE || 5} calls per agent`);
  console.log(`  Pass mark   ${process.env.PASS_THRESHOLD || 70}%\n`);
});

module.exports = app;
