/**
 * CallIQ — Audio Transcription Module
 *
 * Sends audio files to OpenAI Whisper for speech-to-text.
 * Handles:
 *   - Single file transcription
 *   - Batch transcription with concurrency control
 *   - Language hint (auto / en / sw)
 *   - Retry logic on transient failures
 */

const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Kiswahili locale code recognised by Whisper
const LANG_MAP = { en: 'en', sw: 'sw', auto: null };

// ─────────────────────────────────────────
//  Transcribe a single audio file
//  audioPath: absolute path to the file on disk
//  Returns: { text, duration, language }
// ─────────────────────────────────────────
async function transcribeFile(audioPath, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it to your .env file.');
  }

  const client  = new OpenAI({ apiKey });
  const model   = process.env.WHISPER_MODEL || 'whisper-1';
  const langHint = options.language || process.env.WHISPER_LANGUAGE || null;
  const whisperLang = langHint ? LANG_MAP[langHint] : null;

  const params = {
    model,
    file:            fs.createReadStream(audioPath),
    response_format: 'verbose_json',   // includes duration + detected_language
    temperature:     0
  };

  if (whisperLang) params.language = whisperLang;

  // Retry up to 3 times on network/rate errors
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await client.audio.transcriptions.create(params);
      return {
        text:     result.text,
        duration: result.duration || null,
        language: result.language || langHint || 'unknown'
      };
    } catch (err) {
      const isRetryable = err.status === 429 || err.status >= 500;
      if (isRetryable && attempt < 3) {
        const wait = attempt * 2000;
        console.warn(`[Whisper] Attempt ${attempt} failed (${err.status}). Retrying in ${wait}ms...`);
        await sleep(wait);
      } else {
        throw new Error(`Whisper transcription failed: ${err.message}`);
      }
    }
  }
}

// ─────────────────────────────────────────
//  Batch transcription
//  files: array of { path, callId, agentName }
//  concurrency: how many parallel Whisper requests (default 5)
//  onProgress: callback({ done, total, callId, transcript })
// ─────────────────────────────────────────
async function transcribeBatch(files, options = {}) {
  const { concurrency = 5, onProgress, languageHint } = options;
  const results = [];
  let done = 0;

  // Process in chunks to respect concurrency limit
  for (let i = 0; i < files.length; i += concurrency) {
    const chunk = files.slice(i, i + concurrency);

    const chunkResults = await Promise.allSettled(
      chunk.map(async (file) => {
        try {
          const tx = await transcribeFile(file.path, { language: languageHint });
          done++;
          if (onProgress) onProgress({ done, total: files.length, callId: file.callId, transcript: tx.text });
          return { ...file, ...tx, status: 'ok' };
        } catch (err) {
          done++;
          console.error(`[Whisper] Failed for ${file.callId}: ${err.message}`);
          if (onProgress) onProgress({ done, total: files.length, callId: file.callId, error: err.message });
          return { ...file, transcript: null, status: 'error', error: err.message };
        }
      })
    );

    chunkResults.forEach(r => {
      if (r.status === 'fulfilled') results.push(r.value);
    });
  }

  return results;
}

// ─────────────────────────────────────────
//  Validate that a file is a supported audio format
// ─────────────────────────────────────────
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac', '.mp4'];
const MAX_FILE_SIZE_MB   = 25;

function validateAudioFile(filePath, sizeBytes) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, reason: `Unsupported format: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }
  if (sizeBytes > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { valid: false, reason: `File too large (${(sizeBytes / 1024 / 1024).toFixed(1)}MB). Max: ${MAX_FILE_SIZE_MB}MB` };
  }
  return { valid: true };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { transcribeFile, transcribeBatch, validateAudioFile };
