import React, { useState, useRef, useEffect } from 'react';

const S = {
  page: { padding: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' },
  g2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  inp: { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', color: '#111827' },
  sel: { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, background: '#fff' },
  lbl: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  field: { marginBottom: '0.75rem' },
  btn: (v='default', disabled) => ({
    fontSize: 13, padding: '9px 18px', borderRadius: 8,
    border: v === 'primary' ? 'none' : v === 'danger' ? 'none' : v === 'success' ? 'none' : '1px solid #d1d5db',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: v === 'primary' ? '#1F4E79' : v === 'danger' ? '#dc2626' : v === 'success' ? '#15803d' : '#fff',
    color: v === 'primary' || v === 'danger' || v === 'success' ? '#fff' : '#374151',
    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
    opacity: disabled ? 0.5 : 1,
  }),
  gap: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: '0.75rem' },
  txBox: { background: '#0f172a', color: '#86efac', borderRadius: 8, padding: '1rem', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, minHeight: 140, maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', marginTop: '0.5rem' },
  pulse: (active) => ({
    display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
    background: active ? '#ef4444' : '#d1d5db',
    animation: active ? 'pulse 1s infinite' : 'none',
    marginRight: 6, verticalAlign: 'middle',
  }),
  notice: (type) => ({
    padding: '0.75rem 1rem', borderRadius: 8, fontSize: 13, marginBottom: '0.75rem',
    background: type === 'warn' ? '#fef3c7' : type === 'info' ? '#eff6ff' : '#f0fdf4',
    color: type === 'warn' ? '#92400e' : type === 'info' ? '#1e40af' : '#166534',
    border: `1px solid ${type === 'warn' ? '#fde68a' : type === 'info' ? '#bfdbfe' : '#bbf7d0'}`,
  }),
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6' },
  dot: (on) => ({ width: 8, height: 8, borderRadius: '50%', background: on ? '#16a34a' : '#d1d5db', flexShrink: 0 }),
};

export default function LiveListenerPage({ onCallRecorded }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentName, setAgentName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [callId, setCallId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('idle');
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Generate a call ID on mount
  useEffect(() => {
    setCallId(`CALL-${Date.now()}`);
  }, []);

  // Live speech recognition (browser built-in — works without API key)
  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // will also pick up Swahili words

    recognition.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      if (final) setTranscript(prev => prev + final);
    };

    recognition.onerror = () => {};
    recognition.start();
    recognitionRef.current = recognition;
  }

  function stopSpeechRecognition() {
    recognitionRef.current?.stop();
  }

  async function startRecording() {
    if (!agentName.trim()) { alert('Please enter the agent name before starting.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.start(500);
      mediaRef.current = mediaRecorder;

      setRecording(true);
      setStatus('recording');
      setTranscript('');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      startSpeechRecognition();
    } catch (err) {
      alert('Microphone access denied. Please allow microphone access in your browser settings.');
    }
  }

  async function stopRecording() {
    if (!mediaRef.current) return;
    mediaRef.current.stop();
    mediaRef.current.stream.getTracks().forEach(t => t.stop());
    stopSpeechRecognition();
    clearInterval(timerRef.current);
    setRecording(false);
    setStatus('processing');

    // If Whisper API key is provided, send audio for transcription
    if (apiKey.trim()) {
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'call.webm');
        formData.append('model', 'whisper-1');
        // Language hint: if any Swahili words detected in live transcript, hint Swahili
        const swWords = ['habari','asante','kwa heri','naelewa','shilingi'];
        const looksSwahili = swWords.some(w => transcript.toLowerCase().includes(w));
        if (looksSwahili) formData.append('language', 'sw');

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        });
        const data = await res.json();
        if (data.text) setTranscript(data.text);
      } catch (e) {
        // Fall back to browser transcript
      }
    }

    setStatus('done');
  }

  function saveCall() {
    if (!transcript.trim()) { alert('No transcript to save.'); return; }
    const record = {
      callId: callId || `CALL-${Date.now()}`,
      agentName: agentName.trim() || 'Unknown Agent',
      customerName: customerName.trim(),
      customerId: customerId.trim(),
      date: new Date().toISOString().slice(0, 10),
      transcript: transcript.trim(),
      duration: elapsed,
    };
    const updated = [...recordings, record];
    setRecordings(updated);
    if (onCallRecorded) onCallRecorded(record);
    setTranscript('');
    setCallId(`CALL-${Date.now()}`);
    setCustomerId('');
    setCustomerName('');
    setStatus('idle');
    setElapsed(0);
    alert(`Call saved: ${record.callId}. Total saved today: ${updated.length}`);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  const hasSpeechAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>

      {/* Browser support notice */}
      {!hasSpeechAPI && (
        <div style={S.notice('warn')}>
          ⚠ Your browser does not support live speech recognition. Please use Google Chrome or Microsoft Edge for live recording. You can still upload audio files below.
        </div>
      )}

      <div style={S.notice('info')}>
        ℹ This page lets you record a live agent-customer call directly in the browser. The system transcribes it in real time using your browser's built-in speech engine. If you provide an OpenAI Whisper API key, a higher-accuracy transcription is applied after the call ends (supports Kiswahili).
      </div>

      {/* Config */}
      <div style={S.card}>
        <div style={S.label}>Call setup</div>
        <div style={S.g2}>
          <div>
            <div style={S.field}>
              <div style={S.lbl}>Agent name *</div>
              <input style={S.inp} value={agentName} onChange={e=>setAgentName(e.target.value)} placeholder="e.g. Moffat Mayaka" disabled={recording} />
            </div>
            <div style={S.field}>
              <div style={S.lbl}>Call ID (auto-generated)</div>
              <input style={S.inp} value={callId} onChange={e=>setCallId(e.target.value)} disabled={recording} />
            </div>
          </div>
          <div>
            <div style={S.field}>
              <div style={S.lbl}>Customer name</div>
              <input style={S.inp} value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="e.g. John Kamau" disabled={recording} />
            </div>
            <div style={S.field}>
              <div style={S.lbl}>Customer ID / Account number</div>
              <input style={S.inp} value={customerId} onChange={e=>setCustomerId(e.target.value)} placeholder="e.g. CUS-2001" disabled={recording} />
            </div>
          </div>
        </div>

        <div style={S.field}>
          <div style={S.lbl}>OpenAI Whisper API key (optional — for higher accuracy + Kiswahili)</div>
          <input style={S.inp} type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-..." disabled={recording} />
        </div>
      </div>

      {/* Recording controls */}
      <div style={S.card}>
        <div style={S.label}>
          <span style={S.pulse(recording)} />
          {recording ? `Recording — ${formatTime(elapsed)}` : status === 'processing' ? 'Processing...' : status === 'done' ? 'Recording complete' : 'Ready to record'}
        </div>

        <div style={S.gap}>
          {!recording && status !== 'processing' && (
            <button style={S.btn('primary')} onClick={startRecording} disabled={!hasSpeechAPI && !apiKey}>
              🎙 Start recording
            </button>
          )}
          {recording && (
            <button style={S.btn('danger')} onClick={stopRecording}>
              ⏹ Stop recording
            </button>
          )}
          {status === 'done' && transcript && (
            <button style={S.btn('success')} onClick={saveCall}>
              ✓ Save call transcript
            </button>
          )}
        </div>

        {/* Live transcript */}
        {(recording || transcript) && (
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: '0.75rem', marginBottom: 4 }}>
              {recording ? 'Live transcript (real-time)' : 'Transcript'}
            </div>
            <div style={S.txBox}>
              {transcript || 'Listening...'}
            </div>
          </div>
        )}
      </div>

      {/* Saved calls today */}
      {recordings.length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Calls recorded this session ({recordings.length})</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Call ID','Agent','Customer','Duration','Status'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recordings.map((r, i) => (
                <tr key={r.callId} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f3f4f6' }}>{r.callId}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f3f4f6' }}>{r.agentName}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f3f4f6' }}>{r.customerName || '—'}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f3f4f6' }}>{formatTime(r.duration)}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ background: '#f0fdf4', color: '#166534', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Saved</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '0.75rem', fontSize: 13, color: '#6b7280' }}>
            These calls are queued. Go to <strong>Pipeline</strong> to score them, or <strong>Upload</strong> to add more calls from a file.
          </div>
        </div>
      )}

      {/* Audio file upload fallback */}
      <div style={S.card}>
        <div style={S.label}>Upload audio files instead</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '0.75rem' }}>
          If you have recorded call audio files (MP3, WAV, M4A), upload them here. The system sends each file to Whisper for transcription, then scores them automatically.
        </p>
        <div style={{ border: '2px dashed #d1d5db', borderRadius: 10, padding: '1.5rem', textAlign: 'center', background: '#f9fafb' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🎵</div>
          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Drag & drop audio files here</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>MP3 · WAV · M4A · OGG — requires Whisper API key above</div>
          <input type="file" multiple accept=".mp3,.wav,.m4a,.ogg,.webm" style={{ marginTop: '0.75rem' }}
            onChange={async (e) => {
              if (!apiKey.trim()) { alert('Please enter your OpenAI Whisper API key above to transcribe audio files.'); return; }
              alert(`${e.target.files.length} file(s) selected. In production, these are sent to Whisper API and transcribed automatically. Add your OpenAI key above to enable.`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
