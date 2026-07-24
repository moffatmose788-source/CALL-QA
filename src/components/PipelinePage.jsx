import React, { useState, useRef } from 'react';
import {
  detectLanguage, scoreTranscript, generateFeedback,
  getStatus, randomSample, groupBy, DEFAULT_PARAMS, MIN_CALLS_REQUIRED
} from '../utils/scoring';

const S = {
  page: { padding: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' },
  g4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '0.75rem' },
  met: { background: '#f9fafb', borderRadius: 8, padding: '0.75rem 1rem' },
  mv: { fontSize: 20, fontWeight: 600, color: '#111827' },
  ml: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  notice: (type) => ({
    padding: '0.75rem 1rem', borderRadius: 8, fontSize: 13, marginBottom: '0.75rem', lineHeight: 1.7,
    background: type === 'warn' ? '#fef3c7' : type === 'info' ? '#eff6ff' : '#f0fdf4',
    color: type === 'warn' ? '#92400e' : type === 'info' ? '#1e40af' : '#166534',
    border: `1px solid ${type === 'warn' ? '#fde68a' : type === 'info' ? '#bfdbfe' : '#bbf7d0'}`,
  }),
  pbWrap: { margin: '0.75rem 0' },
  pbLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 5 },
  pbTrack: { height: 7, borderRadius: 4, background: '#e5e7eb' },
  pbFill: (pct, done) => ({
    height: '100%', borderRadius: 4, width: `${pct}%`,
    background: done ? '#16a34a' : '#1F4E79',
    transition: 'width 0.3s ease',
  }),
  stage: (state) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
    borderBottom: '1px solid #f3f4f6', fontSize: 13,
    color: state === 'done' ? '#16a34a' : state === 'active' ? '#111827' : '#9ca3af',
    fontWeight: state === 'active' ? 600 : 400,
  }),
  liveCard: { background: '#0f172a', borderRadius: 10, padding: '0.85rem', marginTop: '0.75rem' },
  liveHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' },
  pulse: { width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite', flexShrink: 0 },
  tx: { color: '#86efac', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, maxHeight: 130, overflowY: 'auto', whiteSpace: 'pre-wrap' },
  btn: (v = 'default', disabled) => ({
    fontSize: 13, padding: '9px 18px', borderRadius: 8,
    border: v === 'primary' ? 'none' : '1px solid #d1d5db',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: v === 'primary' ? '#1F4E79' : '#fff',
    color: v === 'primary' ? '#fff' : '#374151',
    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
    opacity: disabled ? 0.5 : 1,
  }),
  gap: { display: 'flex', gap: 8, marginTop: '0.75rem' },
  sel: { padding: '7px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, background: '#fff' },
  settingsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: '0.75rem' },
  agentStatus: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, marginBottom: 5, fontSize: 12 },
  dot: (ok) => ({ width: 8, height: 8, borderRadius: '50%', background: ok ? '#16a34a' : '#d97706', flexShrink: 0 }),
};

const STAGES = [
  { id: 1, label: 'Verifying all agents have reached the minimum call threshold' },
  { id: 2, label: 'Grouping all calls by agent into separate pools' },
  { id: 3, label: 'Applying Fisher-Yates unbiased shuffle to each agent\'s pool' },
  { id: 4, label: 'Selecting 5 random calls from each eligible agent' },
  { id: 5, label: 'Detecting language per call — English or Kiswahili' },
  { id: 6, label: 'Scoring each call against all parameters' },
  { id: 7, label: 'Generating AI coaching feedback per call' },
  { id: 8, label: 'Compiling agent scorecards and department report' },
];

export default function PipelinePage({ allCalls, params = DEFAULT_PARAMS, minCallsOverride, onResults }) {
  const [sampleSize, setSampleSize] = useState(5);
  const [passThresh, setPassThresh] = useState(70);
  const [coachThresh, setCoachThresh] = useState(55);
  const [minCalls] = useState(minCallsOverride || MIN_CALLS_REQUIRED);
  const [stage, setStage] = useState(0);
  const [pct, setPct] = useState(0);
  const [pbLabel, setPbLabel] = useState('Ready — press Start pipeline to begin');
  const [live, setLive] = useState(null);
  const [doneCount, setDoneCount] = useState(0);
  const [totalSampled, setTotalSampled] = useState(0);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [agentReport, setAgentReport] = useState([]);

  const groups = groupBy(allCalls, 'agentName');
  const agentCount = Object.keys(groups).length;

  // Check eligibility per agent
  const agentEligibility = Object.entries(groups).map(([name, calls]) => ({
    name,
    count: calls.length,
    eligible: calls.length >= minCalls,
  }));
  const eligibleCount = agentEligibility.filter(a => a.eligible).length;
  const ineligibleAgents = agentEligibility.filter(a => !a.eligible);

  function stageState(id) {
    if (id < stage) return 'done';
    if (id === stage) return 'active';
    return 'idle';
  }
  function stageIcon(id) {
    if (id < stage) return '✓';
    if (id === stage) return '⟳';
    return '○';
  }

  async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function runPipeline() {
    if (running || eligibleCount === 0) return;
    setRunning(true); setComplete(false); setDoneCount(0); setAgentReport([]);

    // Stage 1 — verify eligibility
    setStage(1); setPct(5); setPbLabel('Verifying agent call counts...');
    await sleep(600);

    // Stage 2 — group
    setStage(2); setPct(12); setPbLabel('Grouping calls by agent...');
    await sleep(400);

    // Stage 3 — shuffle (Fisher-Yates)
    setStage(3); setPct(20); setPbLabel('Applying unbiased shuffle to each agent\'s call pool...');
    await sleep(500);

    // Stage 4 — sample
    setStage(4); setPct(28); setPbLabel('Selecting 5 random calls per eligible agent...');
    const sampled = [];
    agentEligibility
      .filter(a => a.eligible)
      .forEach(({ name }) => {
        const agentCalls = groups[name];
        const picked = randomSample(agentCalls, sampleSize); // Fisher-Yates inside
        sampled.push(...picked);
      });
    setTotalSampled(sampled.length);
    await sleep(400);

    // Stage 5+6 — detect language + score
    setStage(5); setPbLabel('Detecting language and scoring transcripts...');
    const scored = [];
    for (let i = 0; i < sampled.length; i++) {
      const call = sampled[i];
      const lang = detectLanguage(call.transcript);
      const { total, totalPoints, breakdown } = scoreTranscript(call.transcript, lang, params);

      setLive({
        agent: call.agentName,
        callId: call.callId,
        customer: call.customerName,
        lang,
        callNum: i + 1,
        totalCalls: sampled.length,
        tx: call.transcript.slice(0, 320) + (call.transcript.length > 320 ? '...' : ''),
      });
      setDoneCount(i + 1);
      setPct(28 + Math.round(((i + 1) / sampled.length) * 55));
      setPbLabel(`Scoring call ${i + 1} of ${sampled.length} — ${call.agentName} [${lang}]`);

      scored.push({ ...call, language: lang, score: total, totalPoints, breakdown });
      await sleep(70);
    }

    // Stage 7 — feedback
    setStage(7); setPct(88); setPbLabel('Generating AI coaching feedback...');
    await sleep(500);
    const withFeedback = scored.map(c => ({
      ...c,
      feedback: generateFeedback(c.agentName.split(' ')[0], c.score, c.breakdown),
      status: getStatus(c.score, passThresh, coachThresh),
    }));

    // Stage 8 — compile
    setStage(8); setPct(96); setPbLabel('Compiling scorecards...');
    // Build per-agent summary for display
    const agentGroups2 = groupBy(withFeedback, 'agentName');
    const report = Object.entries(agentGroups2).map(([name, calls]) => ({
      name,
      callCount: groups[name]?.length || 0,
      sampledCount: calls.length,
      avg: Math.round(calls.reduce((s, c) => s + c.score, 0) / calls.length),
      status: '',
    }));
    report.forEach(r => { r.status = r.avg >= passThresh ? 'Pass' : r.avg >= coachThresh ? 'Coaching' : 'Flagged'; });
    setAgentReport(report);
    await sleep(500);

    setPct(100); setPbLabel('✓ All scorecards ready');
    setStage(9); setRunning(false); setComplete(true);
    onResults(withFeedback, { passThresh, coachThresh, sampleSize, minCalls });
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>

      {/* Eligibility check */}
      {ineligibleAgents.length > 0 && (
        <div style={S.notice('warn')}>
          <strong>⚠ {ineligibleAgents.length} agent(s) below minimum ({minCalls} calls):</strong>{' '}
          {ineligibleAgents.map(a => `${a.name} (${a.count} calls)`).join(' · ')}.
          {' '}These agents will be skipped. Only agents with {minCalls}+ calls will be sampled and scored.
        </div>
      )}

      {eligibleCount === 0 && (
        <div style={S.notice('warn')}>
          ⛔ No agents have reached {minCalls} calls yet. The pipeline cannot run until at least one agent has {minCalls}+ calls. Go to the <strong>Call Tracker</strong> tab to monitor progress.
        </div>
      )}

      {eligibleCount > 0 && (
        <div style={S.notice('success')}>
          ✓ <strong>{eligibleCount} agent(s) are eligible</strong> — each has {minCalls}+ calls accumulated. The system will randomly sample {sampleSize} calls from each agent's full pool.
        </div>
      )}

      {/* Settings */}
      <div style={S.card}>
        <div style={S.label}>Pipeline settings</div>
        <div style={S.settingsGrid}>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Calls sampled per agent</div>
            <select style={S.sel} value={sampleSize} onChange={e => setSampleSize(+e.target.value)} disabled={running}>
              <option value={3}>3 calls</option>
              <option value={5}>5 calls</option>
              <option value={10}>10 calls</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Pass threshold</div>
            <select style={S.sel} value={passThresh} onChange={e => setPassThresh(+e.target.value)} disabled={running}>
              <option value={60}>60%</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Coaching threshold</div>
            <select style={S.sel} value={coachThresh} onChange={e => setCoachThresh(+e.target.value)} disabled={running}>
              <option value={40}>40%</option>
              <option value={55}>55%</option>
              <option value={60}>60%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agent eligibility summary */}
      <div style={S.card}>
        <div style={S.label}>Agent eligibility — minimum {minCalls} calls required</div>
        {agentEligibility.map(a => (
          <div key={a.name} style={{ ...S.agentStatus, background: a.eligible ? '#f0fdf4' : '#fef3c7' }}>
            <div style={S.dot(a.eligible)} />
            <span style={{ fontWeight: 600, flex: 1 }}>{a.name}</span>
            <span style={{ color: '#6b7280' }}>{a.count.toLocaleString()} calls</span>
            <span style={{ fontWeight: 600, color: a.eligible ? '#16a34a' : '#d97706', minWidth: 120, textAlign: 'right' }}>
              {a.eligible ? '✓ Will be sampled' : `${minCalls - a.count} more needed`}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={S.g4}>
        <div style={S.met}><div style={S.mv}>{allCalls.length.toLocaleString()}</div><div style={S.ml}>Total calls loaded</div></div>
        <div style={S.met}><div style={S.mv}>{eligibleCount} / {agentCount}</div><div style={S.ml}>Agents eligible</div></div>
        <div style={S.met}><div style={S.mv}>{eligibleCount * sampleSize}</div><div style={S.ml}>Calls to be scored</div></div>
        <div style={S.met}><div style={S.mv}>{doneCount} / {totalSampled || eligibleCount * sampleSize}</div><div style={S.ml}>Scored so far</div></div>
      </div>

      {/* Pipeline stages */}
      <div style={S.card}>
        <div style={S.label}>Pipeline stages</div>
        <div style={S.pbWrap}>
          <div style={S.pbLabel}><span>{pbLabel}</span><span style={{ fontWeight: 600 }}>{pct}%</span></div>
          <div style={S.pbTrack}><div style={S.pbFill(pct, complete)} /></div>
        </div>
        <div>
          {STAGES.map((s, i) => (
            <div key={s.id} style={{ ...S.stage(stageState(s.id)), borderBottom: i === STAGES.length - 1 ? 'none' : undefined }}>
              <span style={{ width: 18, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{stageIcon(s.id)}</span>
              {s.label}
            </div>
          ))}
        </div>
        <div style={S.gap}>
          <button
            style={S.btn('primary', running || eligibleCount === 0)}
            onClick={runPipeline}
            disabled={running || eligibleCount === 0}
          >
            {running ? '⟳ Running...' : eligibleCount === 0 ? '⛔ No eligible agents' : `▶ Start pipeline — ${eligibleCount} agent(s)`}
          </button>
          {complete && (
            <button style={S.btn()} onClick={() => onResults(null, null, true)}>
              View scorecards ↗
            </button>
          )}
        </div>
      </div>

      {/* Live call preview */}
      {live && (
        <div style={S.liveCard}>
          <div style={S.liveHeader}>
            <div style={S.pulse} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{live.agent} — {live.callId}</span>
            {live.customer && <span style={{ fontSize: 12, color: '#94a3b8' }}>/ {live.customer}</span>}
            <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: live.lang === 'SW' ? '#065f46' : '#1e3a5f', color: live.lang === 'SW' ? '#6ee7b7' : '#93c5fd' }}>
              {live.lang === 'SW' ? 'Kiswahili' : 'English'}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{live.callNum}/{live.totalCalls}</span>
          </div>
          <div style={S.tx}>{live.tx}</div>
        </div>
      )}

      {/* Post-run agent summary */}
      {agentReport.length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Scoring complete — agent summary</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1F4E79' }}>
                {['Agent', 'Total calls', 'Sampled', 'Avg score', 'Status'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', color: '#fff', fontWeight: 600, textAlign: 'left', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentReport.map((r, i) => (
                <tr key={r.name} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: '8px 10px' }}>{r.callCount.toLocaleString()}</td>
                  <td style={{ padding: '8px 10px' }}>{r.sampledCount}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: r.avg >= 70 ? '#16a34a' : r.avg >= 55 ? '#d97706' : '#dc2626' }}>{r.avg}%</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 600, background: r.status === 'Pass' ? '#f0fdf4' : r.status === 'Coaching' ? '#fefce8' : '#fef2f2', color: r.status === 'Pass' ? '#166534' : r.status === 'Coaching' ? '#92400e' : '#991b1b' }}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
