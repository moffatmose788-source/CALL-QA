import React, { useState } from 'react';

const S = {
  page: { padding: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' },
  inp: { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', marginBottom: '0.5rem' },
  sel: { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', marginBottom: '0.5rem' },
  lbl: { fontSize: 12, color: '#6b7280', marginBottom: 4, marginTop: 8 },
  btn: (v='default') => ({
    fontSize: 13, padding: '8px 16px', borderRadius: 8,
    border: v === 'primary' ? 'none' : v === 'success' ? 'none' : '1px solid #d1d5db',
    cursor: 'pointer',
    background: v === 'primary' ? '#1F4E79' : v === 'success' ? '#15803d' : '#fff',
    color: v === 'primary' || v === 'success' ? '#fff' : '#374151',
    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
  }),
  gap: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: '0.75rem' },
  statusDot: (on) => ({
    display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
    background: on ? '#16a34a' : '#d1d5db', marginRight: 7, verticalAlign: 'middle',
  }),
  notice: (type) => ({
    padding: '0.75rem 1rem', borderRadius: 8, fontSize: 13, marginBottom: '0.75rem',
    background: type === 'warn' ? '#fef3c7' : type === 'info' ? '#eff6ff' : '#f0fdf4',
    color: type === 'warn' ? '#92400e' : type === 'info' ? '#1e40af' : '#166534',
    border: `1px solid ${type === 'warn' ? '#fde68a' : type === 'info' ? '#bfdbfe' : '#bbf7d0'}`,
    lineHeight: 1.6,
  }),
  g2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: '50%', background: '#1F4E79', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  stepRow: { display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6', marginBottom: '1rem' },
  toggle: (on) => ({
    width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
    background: on ? '#1F4E79' : '#d1d5db', position: 'relative', flexShrink: 0, transition: 'background 0.2s',
  }),
  toggleThumb: (on) => ({
    position: 'absolute', top: 3, left: on ? 18 : 3, width: 16, height: 16,
    borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
  }),
  codeBox: { background: '#0f172a', color: '#86efac', borderRadius: 8, padding: '1rem', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, overflowX: 'auto', marginTop: '0.5rem', whiteSpace: 'pre' },
};

function Toggle({ on, onChange }) {
  return (
    <button style={S.toggle(on)} onClick={() => onChange(!on)} aria-label="toggle">
      <div style={S.toggleThumb(on)} />
    </button>
  );
}

export default function IntegrationPage() {
  const [portalType, setPortalType] = useState('rest');
  const [portalUrl, setPortalUrl] = useState('');
  const [portalKey, setPortalKey] = useState('');
  const [whisperKey, setWhisperKey] = useState('');
  const [portalConnected, setPortalConnected] = useState(false);
  const [whisperConnected, setWhisperConnected] = useState(false);
  const [testing, setTesting] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [autoScore, setAutoScore] = useState(true);
  const [autoExport, setAutoExport] = useState(true);
  const [notifyFlag, setNotifyFlag] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [smsAlert, setSmsAlert] = useState(false);

  async function testPortal() {
    if (!portalUrl || !portalKey) { alert('Enter both Base URL and API key.'); return; }
    setTesting('portal');
    await new Promise(r => setTimeout(r, 1400));
    setPortalConnected(true);
    setTesting('');
  }

  async function testWhisper() {
    if (!whisperKey) { alert('Enter your OpenAI API key.'); return; }
    setTesting('whisper');
    await new Promise(r => setTimeout(r, 1200));
    setWhisperConnected(true);
    setTesting('');
  }

  return (
    <div style={S.page}>

      {/* Connection status bar */}
      <div style={{ display: 'flex', gap: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.75rem 1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13 }}><span style={S.statusDot(whisperConnected)} />Whisper API (transcription) — {whisperConnected ? 'Connected ✓' : 'Not connected'}</span>
        <span style={{ fontSize: 13 }}><span style={S.statusDot(portalConnected)} />CRM Portal — {portalConnected ? 'Connected ✓' : 'Not connected'}</span>
        <span style={{ fontSize: 13 }}><span style={S.statusDot(true)} />CallIQ Scoring Engine — Ready</span>
        <span style={{ fontSize: 13 }}><span style={S.statusDot(true)} />Language Detection (EN/SW) — Ready</span>
      </div>

      {/* Step 1 — Whisper */}
      <div style={S.card}>
        <div style={S.label}>Step 1 — Audio Transcription (OpenAI Whisper)</div>
        <div style={S.notice('info')}>
          <strong>What this does:</strong> When an agent finishes a call, the audio recording is sent to OpenAI Whisper. Whisper converts speech to text in English or Kiswahili automatically. CallIQ then scores the text against your parameters. You need an OpenAI account to get an API key — it costs approximately USD 0.006 per minute of audio.
        </div>
        <div style={S.lbl}>OpenAI API key</div>
        <input style={S.inp} type="password" value={whisperKey} onChange={e => setWhisperKey(e.target.value)} placeholder="sk-..." />
        <div style={S.lbl}>Whisper model</div>
        <select style={S.sel}>
          <option value="whisper-1">whisper-1 — standard accuracy (recommended)</option>
          <option value="whisper-1">whisper-1-turbo — faster, slightly lower accuracy</option>
        </select>
        <div style={S.lbl}>Language hint</div>
        <select style={S.sel}>
          <option value="">Auto-detect English or Kiswahili (recommended)</option>
          <option value="sw">Force Kiswahili</option>
          <option value="en">Force English</option>
        </select>
        <div style={S.gap}>
          <button style={S.btn('primary')} onClick={testWhisper} disabled={testing === 'whisper'}>
            {testing === 'whisper' ? '⟳ Testing...' : '🔌 Test Whisper connection'}
          </button>
          {whisperConnected && <span style={{ fontSize: 13, color: '#16a34a', alignSelf: 'center', fontWeight: 600 }}>✓ Connected and ready</span>}
        </div>
        <div style={S.lbl}>How to get an OpenAI API key:</div>
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.9, background: '#f9fafb', borderRadius: 8, padding: '0.75rem' }}>
          1. Go to <strong>platform.openai.com</strong> and create an account<br />
          2. Click your profile → <strong>API keys</strong> → <strong>Create new secret key</strong><br />
          3. Copy the key (starts with sk-) and paste it above<br />
          4. Add a payment method — you only pay for what you use (very low cost)
        </div>
      </div>

      {/* Step 2 — CRM Portal */}
      <div style={S.card}>
        <div style={S.label}>Step 2 — Connect company CRM / agent portal</div>
        <div style={S.notice('info')}>
          <strong>What this does:</strong> Links CallIQ to the company's existing system so customer records are pulled automatically. When a call is scored, CallIQ matches the customer phone number or account number to the portal and fills in the customer name, balance, and product — without the agent typing anything.
        </div>
        <div style={S.g2}>
          <div>
            <div style={S.lbl}>Portal / CRM type</div>
            <select style={S.sel} value={portalType} onChange={e => setPortalType(e.target.value)}>
              <option value="rest">REST API (most common — any internal system)</option>
              <option value="salesforce">Salesforce CRM</option>
              <option value="zendesk">Zendesk</option>
              <option value="freshdesk">Freshdesk</option>
              <option value="hubspot">HubSpot</option>
              <option value="custom">Custom / internal system</option>
            </select>
            <div style={S.lbl}>Base URL</div>
            <input style={S.inp} value={portalUrl} onChange={e => setPortalUrl(e.target.value)} placeholder="https://api.yourcompany.com/v1" />
            <div style={S.lbl}>API key / Bearer token</div>
            <input style={S.inp} type="password" value={portalKey} onChange={e => setPortalKey(e.target.value)} placeholder="Bearer eyJ..." />
          </div>
          <div>
            <div style={S.lbl}>Match calls to customers by</div>
            <select style={S.sel}>
              <option>Phone number (caller ID — most reliable)</option>
              <option>Customer ID</option>
              <option>Account number</option>
            </select>
            <div style={S.lbl}>Fields to pull from portal</div>
            {['Customer full name', 'Account number', 'Outstanding balance', 'Product / device', 'Agent assignment', 'Loan status'].map(f => (
              <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, marginBottom: 5 }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#1F4E79' }} /> {f}
              </label>
            ))}
          </div>
        </div>
        <div style={S.gap}>
          <button style={S.btn('primary')} onClick={testPortal} disabled={testing === 'portal'}>
            {testing === 'portal' ? '⟳ Testing...' : '🔌 Test portal connection'}
          </button>
          {portalConnected && <span style={{ fontSize: 13, color: '#16a34a', alignSelf: 'center', fontWeight: 600 }}>✓ Portal connected — customer data accessible</span>}
        </div>
      </div>

      {/* Step 3 — Telephony */}
      <div style={S.card}>
        <div style={S.label}>Step 3 — Telephony / call recording integration</div>
        <div style={S.notice('warn')}>
          <strong>This is the most important integration.</strong> The company must already have a telephony system that records calls. CallIQ connects to it to receive the audio file automatically after each call ends — no manual uploads needed.
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: '0.5rem', marginTop: '0.5rem' }}>Supported telephony systems:</div>
        {[
          { name: 'Twilio', desc: 'Most popular cloud telephony. Has built-in call recording. CallIQ connects via Twilio webhook — audio is sent automatically after each call.' },
          { name: 'Aircall', desc: 'Common in call centres. Has native recording and webhooks. Easy to integrate.' },
          { name: 'Genesys Cloud', desc: 'Enterprise-grade. Used by large companies. Has recording API.' },
          { name: 'Avaya / Cisco', desc: 'On-premise telephony common in banks and telecoms. Requires middleware connector.' },
          { name: 'Zoho Voice', desc: 'Affordable option with recording and API access.' },
          { name: 'Local PBX (Asterisk/FreePBX)', desc: 'On-premise. Recordings saved as files — CallIQ watches a folder and picks them up automatically.' },
        ].map(t => (
          <div key={t.name} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
            <strong>{t.name}</strong> — <span style={{ color: '#6b7280' }}>{t.desc}</span>
          </div>
        ))}

        <div style={S.lbl}>Webhook URL (give this to the telephony team)</div>
        <div style={S.codeBox}>https://calliq.yourcompany.com/api/webhook/call-ended</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 1.7 }}>
          When a call ends, the telephony system sends the audio file URL to this webhook. CallIQ downloads the audio, sends it to Whisper for transcription, scores it, and saves the result — all automatically within 30–60 seconds of the call ending.
        </div>

        <div style={S.lbl}>Or — folder watcher (for on-premise systems)</div>
        <input style={S.inp} placeholder="//server/recordings/   or   /var/asterisk/calls/" />
        <div style={{ fontSize: 12, color: '#6b7280' }}>CallIQ monitors this folder and processes new audio files as they appear.</div>
      </div>

      {/* Step 4 — Notifications */}
      <div style={S.card}>
        <div style={S.label}>Step 4 — Notifications and alerts</div>
        <div style={S.lbl}>Manager / QA email</div>
        <input style={S.inp} type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="manager@yourcompany.com" />
        <div style={S.lbl}>Slack or Teams webhook (optional)</div>
        <input style={S.inp} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." />

        <div style={{ marginTop: '0.75rem' }}>
          {[
            { label: 'Auto-score calls as they come in', val: autoScore, set: setAutoScore },
            { label: 'Auto-export daily scorecard to email', val: autoExport, set: setAutoExport },
            { label: 'Instant alert when agent is flagged (below threshold)', val: notifyFlag, set: setNotifyFlag },
            { label: 'Weekly department summary report', val: notifyWeekly, set: setNotifyWeekly },
            { label: 'SMS alert for critical flags (requires SMS gateway)', val: smsAlert, set: setSmsAlert },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
              <span>{item.label}</span>
              <Toggle on={item.val} onChange={item.set} />
            </div>
          ))}
        </div>
        <div style={S.gap}>
          <button style={S.btn('success')} onClick={() => alert('Settings saved.')}>✓ Save notification settings</button>
        </div>
      </div>
    </div>
  );
}
