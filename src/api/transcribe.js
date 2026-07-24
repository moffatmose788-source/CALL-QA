const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');
const { transcribeFile } = require('../pipeline/transcriber');
const { parseAudioFilename } = require('../utils/audioFilename');

const router = express.Router();
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 250 * 1024 * 1024 } });

const jobs = new Map();

function createJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function walkDirectory(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkDirectory(abs));
    } else {
      results.push(abs);
    }
  }
  return results;
}

async function cleanupPath(targetPath) {
  try {
    await fs.promises.rm(targetPath, { recursive: true, force: true });
  } catch (err) {
    console.warn('[Transcribe] cleanup failed', err.message);
  }
}

router.post('/transcribe-batch', upload.single('zip'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing ZIP upload. Please attach a .zip file containing .wav recordings.' });
  }

  const allowed = ['.zip'];
  if (!allowed.includes(path.extname(req.file.originalname).toLowerCase())) {
    await cleanupPath(req.file.path);
    return res.status(400).json({ error: 'Only .zip uploads are supported for raw call recordings.' });
  }

  const jobId = createJobId();
  const jobDir = path.join(UPLOAD_DIR, jobId);
  await fs.promises.mkdir(jobDir, { recursive: true });

  const job = {
    id: jobId,
    status: 'running',
    total: 0,
    done: 0,
    currentFile: null,
    results: [],
    errors: [],
    skips: [],
  };
  jobs.set(jobId, job);

  res.status(202).json({ jobId, message: 'Transcription job started.', totalFiles: 0 });

  try {
    await fs.createReadStream(req.file.path).pipe(unzipper.Extract({ path: jobDir })).promise();

    const allFiles = await walkDirectory(jobDir);
    const wavFiles = allFiles.filter((filePath) => path.extname(filePath).toLowerCase() === '.wav');

    if (!wavFiles.length) {
      job.status = 'failed';
      job.errors.push({ error: 'No .wav files were found inside the uploaded ZIP.' });
      job.done = 0;
      jobs.set(jobId, job);
      return;
    }

    const validFiles = [];
    wavFiles.forEach((filePath) => {
      const filename = path.basename(filePath);
      const parsed = parseAudioFilename(filename);
      if (parsed.error) {
        job.skips.push({ filename, reason: parsed.error });
      } else {
        validFiles.push({ ...parsed, filename, path: filePath });
      }
    });

    if (!validFiles.length) {
      job.status = 'failed';
      job.errors.push({ error: 'All WAV files were skipped because filenames did not match the expected pattern.' });
      job.done = 0;
      jobs.set(jobId, job);
      return;
    }

    job.total = validFiles.length;
    jobs.set(jobId, job);

    const languageHint = process.env.WHISPER_LANGUAGE || null;

    for (const file of validFiles) {
      job.currentFile = file.filename;
      jobs.set(jobId, { ...job });

      try {
        const transcript = await transcribeFile(file.path, { language: languageHint });
        job.results.push({
          filename: file.filename,
          callId: file.callId,
          agentExtension: file.agentExtension,
          customerPhone: file.customerPhone,
          date: file.date,
          time: file.time,
          unixTs: file.unixTs,
          transcript: transcript.text,
          detectedLanguage: transcript.language ? transcript.language.toUpperCase() : 'unknown',
          durationSec: transcript.duration || null,
          status: 'ok',
        });
      } catch (err) {
        job.errors.push({ filename: file.filename, error: err.message });
        job.results.push({
          filename: file.filename,
          callId: file.callId,
          agentExtension: file.agentExtension,
          customerPhone: file.customerPhone,
          date: file.date,
          time: file.time,
          unixTs: file.unixTs,
          transcript: null,
          detectedLanguage: null,
          durationSec: null,
          status: 'error',
          error: err.message,
        });
      }

      job.done += 1;
      jobs.set(jobId, { ...job });
    }

    job.status = 'completed';
    job.currentFile = null;
    jobs.set(jobId, { ...job });
  } catch (err) {
    job.status = 'failed';
    job.errors.push({ error: err.message });
    jobs.set(jobId, job);
  } finally {
    cleanupPath(req.file.path);
    setTimeout(() => {
      cleanupPath(jobDir);
    }, 30 * 1000);
  }
});

router.get('/transcribe-status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Transcription job not found.' });
  }
  return res.json(job);
});

module.exports = router;
