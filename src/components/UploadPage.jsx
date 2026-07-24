import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { generateDemoCSVData } from '../utils/demoData';
import {
  detectLanguage, scoreTranscript, generateFeedback,
  getStatus, randomSample, groupBy, DEFAULT_PARAMS
} from '../utils/scoring';
import { resolveAgentName } from '../utils/agentMap';

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: { padding: '1.5rem', maxWidth: 900, margin: '0 auto' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' },
  dz: (active) => ({
    border: `2px dashed ${active ? '#1F4E79' : '#d1d5db'}`,
    borderRadius: 10, padding: '2.5rem 1rem', textAlign: 'center',
    cursor: 'pointer', background: active ? '#EBF5FB' : '#f9fafb',
    transition: 'all 0.2s',
  }),
  dzIcon: { fontSize: 36, marginBottom: 10, display: 'block' },
  dzTitle: { fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 },
  dzHint: { fontSize: 13, color: '#9ca3af' },
  fileCard: { display: 'flex', alignItems: 'center', gap: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.85rem 1rem', marginTop: '0.75rem' },
  fileName: { flex: 1, fontSize: 13, fontWeight: 600, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileMeta: { fontSize: 12, color: '#6b7280' },
  runBtn: (disabled) => ({
    width: '100%', padding: '14px', borderRadius: 10, border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#9ca3af' : '#1F4E79',
    color: '#fff', fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: '1rem', transition: 'opacity 0.2s',
    opacity: disabled ? 0.6 : 1,
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(31,78,121,0.3)',
  }),
  demoBtn: {
    width: '100%', padding: '11px', borderRadius: 10,
    border: '1.5px dashed #d1d5db', cursor: 'pointer',
    background: '#fff', color: '#6b7280', fontSize: 14, fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: '0.75rem',
  },
  notice: (type) => ({
    padding: '0.85rem 1rem', borderRadius: 8, fontSize: 13, lineHeight: 1.7, marginTop: '0.75rem',
    background: type === 'info' ? '#eff6ff' : type === 'success' ? '#f0fdf4' : type === 'warn' ? '#fef3c7' : '#fef2f2',
    color: type === 'info' ? '#1e40af' : type === 'success' ? '#166534' : type === 'warn' ? '#92400e' : '#991b1b',
    border: `1px solid ${type === 'info' ? '#bfdbfe' : type === 'success' ? '#bbf7d0' : type === 'warn' ? '#fde68a' : '#fecaca'}`,
  }),
  // Pipeline stages
  stagesBox: { marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' },
  stage: (state) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
    fontSize: 13, color: state === 'done' ? '#16a34a' : state === 'active' ? '#1F4E79' : '#9ca3af',
    fontWeight: state === 'active' ? 600 : 400,
    borderBottom: '1px solid #f9fafb',
  }),
  stageIcon: (state) => ({
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
    background: state === 'done' ? '#16a34a' : state === 'active' ? '#1F4E79' : '#e5e7eb',
    color: state === 'done' || state === 'active' ? '#fff' : '#9ca3af',
    fontWeight: 700,
  }),
  pbWrap: { margin: '0.85rem 0' },
  pbLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 },
  pbTrack: { height: 8, borderRadius: 4, background: '#e5e7eb' },
  pbFill: (pct, done) => ({
    height: '100%', borderRadius: 4,
    width: `${pct}%`,
    background: done ? '#16a34a' : '#1F4E79',
    transition: 'width 0.35s ease',
  }),
  liveBox: { background: '#0f172a', borderRadius: 8, padding: '0.75rem', marginTop: '0.5rem' },
  liveTx: { color: '#86efac', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8, maxHeight: 100, overflowY: 'auto', whiteSpace: 'pre-wrap' },
  // Column mapping
  colGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: '0.75rem' },
  colItem: { display: 'flex', flexDirection: 'column', gap: 3 },
  colLabel: (required) => ({ fontSize: 12, fontWeight: required ? 600 : 400, color: required ? '#1F4E79' : '#6b7280' }),
  sel: { padding: '7px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, background: '#fff' },
  // Stats row
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '0.75rem 0' },
  statBox: (color) => ({ background: '#f9fafb', borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '0.65rem 0.9rem' }),
  statVal: { fontSize: 18, fontWeight: 700, color: '#111827' },
  statLbl: { fontSize: 11, color: '#6b7280', marginTop: 1 },
};

const STAGES = [
  { id: 1, label: 'Reading file and detecting agents' },
  { id: 2, label: 'Grouping calls by agent' },
  { id: 3, label: 'Random unbiased sampling — 5 calls per agent' },
  { id: 4, label: 'Detecting language per call (English / Kiswahili)' },
  { id: 5, label: 'Scoring each call against parameters' },
  { id: 6, label: 'Generating AI coaching feedback' },
  { id: 7, label: 'Building scorecards and report' },
];

const REQUIRED_COLS = ['Agent Name', 'Call ID', 'Transcript'];
const OPTIONAL_COLS = ['Customer Name', 'Customer ID', 'Date', 'Balance'];

export default function UploadPage({ onResults, params = DEFAULT_PARAMS, sampleSize = 5, passThresh = 70, coachThresh = 55 }) {
  const [dragging, setDragging] = useState(false);
  const [uploadMode, setUploadMode] = useState('csv'); // csv or audio
  const [fileLoaded, setFileLoaded] = useState(null);   // { name, rows, headers, mode }
  const [colMap, setColMap] = useState({});
  const [notice, setNotice] = useState(null);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [pct, setPct] = useState(0);
  const [pbLabel, setPbLabel] = useState('');
  const [live, setLive] = useState(null);
  const [done, setDone] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [zipJobId, setZipJobId] = useState(null);
  const [transcribeStatus, setTranscribeStatus] = useState(null);
  const [skippedFiles, setSkippedFiles] = useState([]);
  const [jobErrors, setJobErrors] = useState([]);
  const fileRef = useRef();
  const pollTimer = useRef(null);

  // ── File parsing ────────────────────────────────────────────────────────────
  function clearPoller() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function pollTranscribeJob(jobId, fileName) {
    try {
      const res = await fetch(`/api/transcribe/transcribe-status/${jobId}`);
      if (!res.ok) throw new Error('Unable to retrieve transcription status');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error('Server returned non-JSON status response. Is the backend running?');
      }
      const status = await res.json();
      setTranscribeStatus(status);

      if (status.status === 'completed' || status.status === 'failed') {
        clearPoller();
        setTranscribing(false);
        setJobErrors(status.errors || []);
        setSkippedFiles(status.skips || []);

        const successfulRows = (status.results || []).filter(r => r.status === 'ok');
        const mappedRows = successfulRows.map(r => ({
          callId: r.callId || `CALL-${r.filename}`,
          agentName: resolveAgentName(r.agentExtension),
          customerName: '',
          customerId: '',
          date: r.date,
          transcript: r.transcript,
          balance: '',
          filename: r.filename,
          agentExtension: r.agentExtension,
          detectedLanguage: r.detectedLanguage,
        }));

        setFileLoaded({
          name: fileName,
          rows: mappedRows,
          headers: [],
          agentCount: [...new Set(mappedRows.map(r => r.agentName))].length,
          mode: 'audio',
        });

        if (!mappedRows.length) {
          setNotice({ type: 'error', msg: status.errors?.length
            ? `Transcription failed: ${status.errors.map(e => e.error).join('; ')}`
            : 'No audio rows could be transcribed successfully.'
          });
        } else {
          const summary = `${mappedRows.length} calls ready from ${[...new Set(mappedRows.map(r => r.agentName))].length} agent(s).`;
          setNotice({ type: 'success', msg: `✓ Audio upload complete — ${summary}` });
        }
      }
    } catch (err) {
      clearPoller();
      setTranscribing(false);
      setNotice({ type: 'error', msg: `Transcription job failed: ${err.message}` });
    }
  }

  async function uploadZip(file) {
    setNotice(null);
    setTranscribing(true);
    setZipJobId(null);
    setTranscribeStatus(null);
    setJobErrors([]);
    setSkippedFiles([]);

    const form = new FormData();
    form.append('zip', file);

    try {
      const response = await fetch('/api/transcribe/transcribe-batch', {
        method: 'POST', body: form,
      });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        let errorMessage = `Upload failed (${response.status})`;
        if (contentType.includes('application/json')) {
          const body = await response.json();
          errorMessage = body.error || errorMessage;
        } else {
          const text = await response.text();
          errorMessage = `Server returned non-JSON response. Is the backend running?`;
          console.error('Unexpected upload response:', text.slice(0, 120));
        }
        throw new Error(errorMessage);
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error('Server returned non-JSON response. Is the backend running?');
      }

      const body = await response.json();
      setZipJobId(body.jobId);
      pollTimer.current = setInterval(() => pollTranscribeJob(body.jobId, file.name), 1200);
    } catch (err) {
      setTranscribing(false);
      setNotice({ type: 'error', msg: err.message });
    }
  }

  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (uploadMode === 'audio') {
      if (ext !== 'zip') {
        setNotice({ type: 'error', msg: 'Please upload a ZIP file containing raw .wav recordings.' });
        return;
      }
      uploadZip(file);
      return;
    }

    if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        processRows(data, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => processRows(res.data, file.name),
      });
    }
  }

  function processRows(data, fileName) {
    if (!data.length) { setNotice({ type: 'error', msg: 'File is empty or could not be read.' }); return; }
    const headers = Object.keys(data[0]);

    // Auto-map columns
    const map = {};
    [...REQUIRED_COLS, ...OPTIONAL_COLS].forEach(field => {
      const match = headers.find(h =>
        h.toLowerCase().replace(/[\s_\-]/g, '') === field.toLowerCase().replace(/[\s_\-]/g, '')
      );
      if (match) map[field] = match;
    });
    setColMap(map);

    const agents = [...new Set(data.map(r => r[map['Agent Name']] || r['Agent Name'] || '').filter(Boolean))];
    setFileLoaded({ name: fileName, rows: data, headers, agentCount: agents.length, mode: 'csv' });
    setNotice({ type: 'success', msg: `✓ File loaded — ${data.length.toLocaleString()} call records, ${agents.length} agent(s) detected.` });
    setStage(0); setPct(0); setDone(false); setLive(null);
  }

  // ── Demo loader ─────────────────────────────────────────────────────────────
  function loadDemo() {
    const data = generateDemoCSVData(5, 350);
    processRows(data, 'demo_recovery_350calls_5agents.csv');
  }

  // ── THE RUN BUTTON ──────────────────────────────────────────────────────────
  async function runPipeline() {
    if (running || !fileLoaded) return;
    if (fileLoaded.mode === 'csv' && (!colMap['Agent Name'] || !colMap['Transcript'])) {
      setNotice({ type: 'warn', msg: 'Please map the "Agent Name" and "Transcript" columns before running.' });
      return;
    }

    setRunning(true); setDone(false); setStage(0); setPct(0); setLive(null);

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    function setS(n) { setStage(n); }
    function setP(p, lbl) { setPct(p); if (lbl) setPbLabel(lbl); }

    // Stage 1 — read + map
    setS(1); setP(5, 'Reading file and identifying agents...');
    await sleep(400);

    let mapped = [];
    if (fileLoaded.mode === 'csv') {
      const get = (row, field) => row[colMap[field]] || row[field] || '';
      mapped = fileLoaded.rows.map((row, i) => ({
        callId: get(row, 'Call ID') || `CALL-${i + 1}`,
        agentName: get(row, 'Agent Name') || 'Unknown',
        customerName: get(row, 'Customer Name'),
        customerId: get(row, 'Customer ID'),
        date: get(row, 'Date'),
        transcript: get(row, 'Transcript'),
        balance: get(row, 'Balance'),
        filename: row.filename || '',
        agentExtension: row.agentExtension || '',
        detectedLanguage: row.detectedLanguage || null,
      })).filter(r => r.agentName !== 'Unknown' && r.transcript);
    } else {
      mapped = fileLoaded.rows.map((row) => ({
        callId: row.callId || `CALL-${row.filename}`,
        agentName: row.agentName || 'Unknown',
        customerName: row.customerName || '',
        customerId: row.customerId || '',
        date: row.date || '',
        transcript: row.transcript || '',
        balance: row.balance || '',
        filename: row.filename || '',
        agentExtension: row.agentExtension || '',
        detectedLanguage: row.detectedLanguage || null,
      })).filter(r => r.agentName !== 'Unknown' && r.transcript);
    }

    if (!mapped.length) {
      setNotice({ type: 'error', msg: 'No valid rows found. Make sure the Transcript column contains call text.' });
      setRunning(false); return;
    }

    // Stage 2 — group
    setS(2); setP(15, 'Grouping calls by agent...');
    await sleep(350);
    const groups = groupBy(mapped, 'agentName');
    const agentNames = Object.keys(groups);

    // Stage 3 — sample
    setS(3); setP(25, `Randomly sampling ${sampleSize} calls per agent (Fisher-Yates shuffle)...`);
    await sleep(450);
    const sampled = [];
    agentNames.forEach(name => {
      const agentCalls = groups[name];
      if (agentCalls.length <= sampleSize) {
        sampled.push(...agentCalls);
      } else {
        sampled.push(...randomSample(agentCalls, sampleSize));
      }
    });

    // Stage 4+5 — language + score
    setS(4); setP(35, 'Detecting language and scoring calls...');
    const scored = [];
    for (let i = 0; i < sampled.length; i++) {
      const call = sampled[i];
      const lang = detectLanguage(call.transcript, call.detectedLanguage);
      const { total, totalPoints, breakdown } = scoreTranscript(call.transcript, lang, params);
      setLive({ agent: call.agentName, callId: call.callId, lang, tx: call.transcript.slice(0, 280) });
      setP(35 + Math.round(((i + 1) / sampled.length) * 45), `Scoring call ${i + 1} of ${sampled.length} — ${call.agentName} [${lang}]`);
      scored.push({ ...call, language: lang, score: total, totalPoints, breakdown });
      await sleep(60);
    }

    // Stage 6 — feedback
    setS(6); setP(85, 'Generating coaching feedback...');
    await sleep(400);
    const withFeedback = scored.map(c => ({
      ...c,
      feedback: generateFeedback(c.agentName.split(' ')[0], c.score, c.breakdown),
      status: getStatus(c.score, passThresh, coachThresh),
    }));

    // Stage 7 — compile
    setS(7); setP(97, 'Building scorecards...');
    await sleep(400);

    setP(100, '✓ Complete — scorecards ready');
    setStage(8);
    setDone(true);
    setRunning(false);
    setNotice({ type: 'success', msg: `✓ Done! ${withFeedback.length} calls scored across ${agentNames.length} agent(s). Click "View scorecards" to see results.` });
    onResults(withFeedback);
  }

  // ── Drag/drop ───────────────────────────────────────────────────────────────
  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }
  function onDrop(e) { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }

  const canRun = !!fileLoaded && !running && !transcribing;

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.2}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Upload mode selector */}
      <div style={{ ...S.card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {['csv', 'audio'].map(mode => (
          <button
            key={mode}
            onClick={() => setUploadMode(mode)}
            style={{
              padding: '10px 16px', borderRadius: 10, border: uploadMode === mode ? '2px solid #1F4E79' : '1px solid #d1d5db',
              background: uploadMode === mode ? '#e0efff' : '#fff', color: '#111827', cursor: 'pointer', fontWeight: uploadMode === mode ? 700 : 500,
            }}
          >
            {mode === 'csv' ? 'Upload CSV / Excel' : 'Upload call recordings (.zip)'}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div style={S.card}>
        <div
          style={S.dz(dragging)}
          onClick={() => !running && !transcribing && fileRef.current.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <span style={S.dzIcon}>📂</span>
          <div style={S.dzTitle}>
            {fileLoaded ? 'File loaded — click to replace' : uploadMode === 'audio' ? 'Drop your ZIP file here' : 'Drop your CSV or Excel file here'}
          </div>
          <div style={S.dzHint}>
            {uploadMode === 'audio'
              ? 'Upload a ZIP containing raw .wav recordings named with Asterisk/PBX pattern. CallIQ will transcribe them via Whisper and score automatically.'
              : 'Required columns: Agent Name · Call ID · Transcript — optional: Customer Name, Customer ID, Date, Balance'
            }
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={uploadMode === 'audio' ? '.zip' : '.csv,.xlsx,.xls'}
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />

        {/* Loaded file info */}
        {fileLoaded && (
          <div style={S.fileCard}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.fileName}>{fileLoaded.name}</div>
              <div style={S.fileMeta}>{fileLoaded.rows.length.toLocaleString()} rows · {fileLoaded.agentCount} agent(s) detected</div>
            </div>
            {!running && !transcribing && (
              <button
                onClick={() => { setFileLoaded(null); setStage(0); setPct(0); setDone(false); setNotice(null); setTranscribeStatus(null); setJobErrors([]); setSkippedFiles([]); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, padding: '2px 6px' }}
              >✕</button>
            )}
          </div>
        )}

        {notice && <div style={S.notice(notice.type)}>{notice.msg}</div>}

        {uploadMode === 'audio' && transcribing && (
          <div style={S.notice('info')}>
            Transcribing audio... {transcribeStatus?.done || 0}/{transcribeStatus?.total || 0} files completed.
            {transcribeStatus?.currentFile && <div style={{ marginTop: 6 }}>Current file: {transcribeStatus.currentFile}</div>}
          </div>
        )}

        {uploadMode === 'audio' && zipJobId && !transcribing && (skippedFiles.length > 0 || jobErrors.length > 0) && (
          <div style={S.notice('warn')}>
            {skippedFiles.length > 0 && <div>{skippedFiles.length} file(s) were skipped due to invalid filenames.</div>}
            {jobErrors.length > 0 && <div>{jobErrors.length} transcription error(s) occurred.</div>}
          </div>
        )}

        {/* Demo loader */}
        {!fileLoaded && uploadMode === 'csv' && (
          <button style={S.demoBtn} onClick={loadDemo}>
            🎲 Load demo dataset instead — 5 agents × 350 calls each
          </button>
        )}
      </div>

      {/* Column mapping — only show if file loaded and columns need checking */}
      {fileLoaded && fileLoaded.headers.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Column mapping — confirm your file's columns match below
          </div>
          <div style={S.colGrid}>
            {[...REQUIRED_COLS, ...OPTIONAL_COLS].map(field => (
              <div key={field} style={S.colItem}>
                <label style={S.colLabel(REQUIRED_COLS.includes(field))}>
                  {field}{REQUIRED_COLS.includes(field) ? ' *' : ''}
                </label>
                <select
                  style={S.sel}
                  value={colMap[field] || ''}
                  onChange={e => setColMap(m => ({ ...m, [field]: e.target.value }))}
                  disabled={running}
                >
                  <option value="">— not mapped —</option>
                  {fileLoaded.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── THE BIG RUN BUTTON ── */}
      {fileLoaded && (
        <div style={S.card}>
          <button style={S.runBtn(!canRun)} onClick={runPipeline} disabled={!canRun}>
            {running
              ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Running pipeline...</>
              : done
                ? '✓ Run again'
                : '▶  Run — Sample, Score & Generate Scorecards'
            }
          </button>

          {/* Progress */}
          {(running || done) && (
            <>
              <div style={S.pbWrap}>
                <div style={S.pbLabel}><span>{pbLabel}</span><span style={{ fontWeight: 600 }}>{pct}%</span></div>
                <div style={S.pbTrack}><div style={S.pbFill(pct, done)} /></div>
              </div>

              <div style={S.stagesBox}>
                {STAGES.map((s, i) => {
                  const state = stage > s.id ? 'done' : stage === s.id ? 'active' : 'idle';
                  return (
                    <div key={s.id} style={{ ...S.stage(state), borderBottom: i === STAGES.length - 1 ? 'none' : undefined }}>
                      <div style={S.stageIcon(state)}>
                        {state === 'done' ? '✓' : state === 'active' ? '⟳' : s.id}
                      </div>
                      {s.label}
                    </div>
                  );
                })}
              </div>

              {/* Live call preview */}
              {live && (
                <div style={S.liveBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                      {live.agent} — {live.callId}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600, background: live.lang === 'SW' ? '#064e3b' : '#1e3a5f', color: live.lang === 'SW' ? '#6ee7b7' : '#93c5fd' }}>
                      {live.lang === 'SW' ? 'Kiswahili' : 'English'}
                    </span>
                  </div>
                  <div style={S.liveTx}>{live.tx}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
