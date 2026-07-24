import React, { useState, useEffect, useRef } from 'react';
import { getAgentEligibility, MIN_CALLS_REQUIRED } from '../utils/scoring';

const S = {
  page: { padding: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' },
  notice: (type) => ({
    padding: '0.85rem 1rem', borderRadius: 8, fontSize: 13, marginBottom: '0.75rem', lineHeight: 1.7,
    background: type === 'warn' ? '#fef3c7' : type === 'info' ? '#eff6ff' : type === 'success' ? '#f0fdf4' : '#fef2f2',
    color: type === 'warn' ? '#92400e' : type === 'info' ? '#1e40af' : type === 'success' ? '#166534' : '#991b1b',
    border: `1px solid ${type === 'warn' ? '#fde68a' : type === 'info' ? '#bfdbfe' : type === 'success' ? '#bbf7d0' : '#fecaca'}`,
  }),
  agentRow: (eligible) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
    borderRadius: 8, marginBottom: 6,
    background: eligible ? '#f0fdf4' : '#f9fafb',
    border: `1px solid ${eligible ? '#bbf7d0' : '#e5e7eb'}`,
  }),
  avatar: (color) => ({
    width: 36, height: 36, borderRadius: '50%', background: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
  }),
  progressTrack: { flex: 1, height: 8, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' },
  progressFill: (pct, eligible) => ({
    height: '100%', borderRadius: 4,
    width: `${Math.min(100, pct)}%`,
    background: eligible ? '#16a34a' : pct > 60 ? '#d97706' : '#2563eb',
    transition: 'width 0.5s ease',
  }),
  pill: (type) => ({
    display: 'inline-block', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0,
    background: type === 'ready' ? '#f0fdf4' : type === 'waiting' ? '#eff6ff' : '#fef3c7',
    color: type === 'ready' ? '#166534' : type === 'waiting' ? '#1e40af' : '#92400e',
    border: `1px solid ${type === 'ready' ? '#bbf7d0' : type === 'waiting' ? '#bfdbfe' : '#fde68a'}`,
  }),
  btn: (v = 'default', disabled) => ({
    fontSize: 13, padding: '9px 18px', borderRadius: 8,
    border: v === 'primary' ? 'none' : v === 'success' ? 'none' : '1px solid #d1d5db',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: v === 'primary' ? '#1F4E79' : v === 'success' ? '#15803d' : '#fff',
    color: v === 'primary' || v === 'success' ? '#fff' : '#374151',
    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
    opacity: disabled ? 0.5 : 1,
  }),
  gap: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: '0.75rem' },
  g3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1rem' },
  met: (color) => ({ background: '#f9fafb', borderRadius: 10, padding: '0.85rem 1rem', borderLeft: `4px solid ${color}` }),
  mv: { fontSize: 22, fontWeight: 700, color: '#111827' },
  ml: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  liveTag: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', fontWeight: 600 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#dc2626', animation: 'pulse 1s infinite', flexShrink: 0 },
};

const COLORS = ['#1F4E79','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#9333ea','#0f766e','#b45309','#4338ca'];

export default function CallAccumulatorPage({ allCalls, onReadyToPipeline }) {
  const [minCalls, setMinCalls] = useState(MIN_CALLS_REQUIRED);
  const [liveSimulating, setLiveSimulating] = useState(false);
  const [simulatedCounts, setSimulatedCounts] = useState({});
  const intervalRef = useRef(null);

  const eligibility = getAgentEligibility(allCalls, minCalls);

  // Merge real call counts with simulated increments
  const displayEligibility = eligibility.map(e => ({
    ...e,
    callCount: e.callCount + (simulatedCounts[e.agentName] || 0),
    eligible: (e.callCount + (simulatedCounts[e.agentName] || 0)) >= minCalls,
    callsNeeded: Math.max(0, minCalls - (e.callCount + (simulatedCounts[e.agentName] || 0))),
  }));

  const totalAgents = displayEligibility.length;
  const eligibleAgents = displayEligibility.filter(e => e.eligible).length;
  const totalCalls = displayEligibility.reduce((s, e) => s + e.callCount, 0);
  const allReady = eligibleAgents === totalAgents && totalAgents > 0;

  // Live simulation — increments call counts over time to show the accumulation effect
  function startLiveSimulation() {
    if (liveSimulating) return;
    setLiveSimulating(true);
    const initialCounts = {};
    eligibility.forEach(e => { initialCounts[e.agentName] = 0; });
    setSimulatedCounts(initialCounts);

    intervalRef.current = setInterval(() => {
      setSimulatedCounts(prev => {
        const next = { ...prev };
        eligibility.forEach(e => {
          const current = (e.callCount + (prev[e.agentName] || 0));
          if (current < minCalls + 50) {
            // Add 8-15 calls per tick per agent (simulates calls coming in during the day)
            next[e.agentName] = (prev[e.agentName] || 0) + Math.floor(Math.random() * 8 + 8);
          }
        });
        return next;
      });
    }, 600);
  }

  function stopSimulation() {
    clearInterval(intervalRef.current);
    setLiveSimulating(false);
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  function handleProceed() {
    stopSimulation();
    // Only pass eligible agents' calls to the pipeline
    const eligibleCalls = allCalls.filter(c => {
      const e = displayEligibility.find(a => a.agentName === c.agentName);
      return e?.eligible;
    });
    onReadyToPipeline(eligibleCalls, minCalls);
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>

      {/* Rule explanation */}
      <div style={S.notice('info')}>
        <strong>📋 Sampling rule:</strong> The system will <strong>not</strong> sample or score any agent until they have completed at least <strong>{minCalls} calls</strong> for the day. Once an agent crosses that threshold, 5 calls are randomly selected from their full pool using an unbiased Fisher-Yates shuffle — every call has an equal chance of being picked.
      </div>

      {/* KPIs */}
      <div style={S.g3}>
        <div style={S.met('#1F4E79')}>
          <div style={S.mv}>{totalCalls.toLocaleString()}</div>
          <div style={S.ml}>Total calls accumulated today</div>
        </div>
        <div style={S.met(eligibleAgents === totalAgents && totalAgents > 0 ? '#16a34a' : '#d97706')}>
          <div style={S.mv}>{eligibleAgents} / {totalAgents}</div>
          <div style={S.ml}>Agents ready (≥ {minCalls} calls)</div>
        </div>
        <div style={S.met(allReady ? '#16a34a' : '#6b7280')}>
          <div style={S.mv}>{allReady ? '✓ All ready' : `${totalAgents - eligibleAgents} waiting`}</div>
          <div style={S.ml}>Pipeline status</div>
        </div>
      </div>

      {/* Threshold setting */}
      <div style={S.card}>
        <div style={S.label}>Minimum calls threshold</div>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '0.75rem' }}>
          Set how many calls an agent must complete before the system is allowed to randomly sample their calls. The default is {MIN_CALLS_REQUIRED} calls.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="number"
            min={10}
            max={1000}
            value={minCalls}
            onChange={e => setMinCalls(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 15, fontWeight: 600, width: 120, textAlign: 'center' }}
          />
          <span style={{ fontSize: 13, color: '#6b7280' }}>calls minimum per agent before sampling is allowed</span>
        </div>
      </div>

      {/* Agent progress tracker */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={S.label} >Agent call accumulation tracker</div>
          {liveSimulating && (
            <div style={S.liveTag}>
              <div style={S.dot} /> Live — calls coming in
            </div>
          )}
        </div>

        {displayEligibility.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: 13 }}>
            No agents loaded yet. Upload a file or start recording calls first.
          </div>
        )}

        {displayEligibility.map((e, idx) => {
          const pct = Math.round((e.callCount / minCalls) * 100);
          const status = e.eligible ? 'ready' : pct > 60 ? 'close' : 'waiting';
          return (
            <div key={e.agentName} style={S.agentRow(e.eligible)}>
              <div style={S.avatar(COLORS[idx % COLORS.length])}>
                {e.agentName.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{e.agentName}</span>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                    {e.callCount.toLocaleString()} / {minCalls.toLocaleString()} calls
                    {!e.eligible && <span style={{ color: '#d97706', marginLeft: 6 }}>({e.callsNeeded} more needed)</span>}
                  </span>
                </div>
                <div style={S.progressTrack}>
                  <div style={S.progressFill(pct, e.eligible)} />
                </div>
              </div>
              <span style={S.pill(status)}>
                {e.eligible ? '✓ Ready to sample' : `${Math.min(pct, 99)}%`}
              </span>
            </div>
          );
        })}

        <div style={S.gap}>
          {!liveSimulating && allCalls.length > 0 && !allReady && (
            <button style={S.btn('primary')} onClick={startLiveSimulation}>
              ▶ Simulate calls coming in (demo)
            </button>
          )}
          {liveSimulating && (
            <button style={S.btn()} onClick={stopSimulation}>⏹ Stop simulation</button>
          )}
          {eligibleAgents > 0 && (
            <button style={S.btn('success')} onClick={handleProceed}>
              ✓ Proceed — sample {eligibleAgents} eligible agent{eligibleAgents > 1 ? 's' : ''} ↗
            </button>
          )}
        </div>

        {eligibleAgents > 0 && !allReady && (
          <div style={{ ...S.notice('warn'), marginTop: '0.75rem', marginBottom: 0 }}>
            ⚠ {totalAgents - eligibleAgents} agent(s) have not yet reached {minCalls} calls. You can either wait for them to accumulate more calls, or proceed now and only score the {eligibleAgents} eligible agent(s).
          </div>
        )}
      </div>

      {/* How it works explanation */}
      <div style={S.card}>
        <div style={S.label}>How the unbiased sampling works</div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 2 }}>
          <div>① <strong>All day:</strong> Every call an agent makes is recorded and added to their pool</div>
          <div>② <strong>Threshold check:</strong> The system continuously monitors each agent's call count</div>
          <div>③ <strong>300+ calls reached:</strong> Agent becomes eligible — green bar, "Ready to sample" tag</div>
          <div>④ <strong>Fisher-Yates shuffle:</strong> The system shuffles the entire pool randomly, then takes the first 5 — this guarantees every call has exactly equal probability of being selected</div>
          <div>⑤ <strong>No bias:</strong> The system does not prefer recent calls, longer calls, or any particular customer — selection is purely random</div>
          <div>⑥ <strong>Scoring:</strong> Those 5 calls are transcribed, language-detected, and scored against all parameters</div>
          <div>⑦ <strong>Scorecard:</strong> A scorecard is generated with Call One through Call Five, averages, total, and feedback</div>
        </div>
      </div>
    </div>
  );
}
