import React, { useState } from 'react';
import { loadAgentMap, saveAgentMap } from '../utils/agentMap';

const S = {
  page: { padding: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' },
  paramCard: (err) => ({
    border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
    borderRadius: 10, padding: '1rem', marginBottom: '0.6rem',
    background: err ? '#fef2f2' : '#fff',
  }),
  paramHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' },
  nameInput: {
    flex: 1, padding: '7px 10px', borderRadius: 7,
    border: '1px solid #d1d5db', fontSize: 13, fontWeight: 500,
  },
  weightInput: {
    width: 60, padding: '7px 8px', borderRadius: 7,
    border: '1px solid #d1d5db', fontSize: 13, textAlign: 'center',
  },
  weightLabel: { fontSize: 12, color: '#6b7280' },
  deleteBtn: {
    padding: '6px 10px', borderRadius: 7, border: '1px solid #fca5a5',
    cursor: 'pointer', background: '#fef2f2', color: '#dc2626', fontSize: 12,
  },
  kwLabel: { fontSize: 11, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  kwInput: {
    width: '100%', padding: '6px 10px', borderRadius: 7,
    border: '1px solid #e5e7eb', fontSize: 12, color: '#374151',
    background: '#f9fafb',
  },
  btn: (v) => ({
    fontSize: 13, padding: '8px 16px', borderRadius: 8,
    border: v === 'primary' ? 'none' : v === 'success' ? 'none' : '1px solid #d1d5db',
    cursor: 'pointer',
    background: v === 'primary' ? '#1d4ed8' : v === 'success' ? '#15803d' : '#fff',
    color: v === 'primary' || v === 'success' ? '#fff' : '#374151',
    fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6,
  }),
  gap: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: '0.75rem' },
  totalBar: (ok) => ({
    padding: '0.75rem 1rem', borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: ok ? '#f0fdf4' : '#fef2f2',
    color: ok ? '#166534' : '#991b1b',
    border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
    marginBottom: '0.75rem',
  }),
  notice: {
    padding: '0.6rem 0.85rem', borderRadius: 8, fontSize: 12,
    background: '#eff6ff', color: '#1e40af',
    border: '1px solid #bfdbfe', marginBottom: '0.75rem',
  },
};

export default function ParametersPage({ params, onChange }) {
  const [localParams, setLocalParams] = useState(params.map(p => ({ ...p })));
  const [agentMap, setAgentMap] = useState(() => loadAgentMap());

  const totalWeight = localParams.reduce((s, p) => s + Number(p.weight || 0), 0);
  const weightOk = totalWeight === 100;

  function update(idx, field, val) {
    const updated = localParams.map((p, i) => i === idx ? { ...p, [field]: val } : p);
    setLocalParams(updated);
  }

  function updateKw(idx, field, val) {
    const arr = val.split(',').map(k => k.trim()).filter(Boolean);
    update(idx, field, arr);
  }

  function addParam() {
    setLocalParams([...localParams, {
      id: `param_${Date.now()}`,
      name: 'New parameter',
      weight: 0,
      kwEN: [],
      kwSW: [],
    }]);
  }

  function removeParam(idx) {
    setLocalParams(localParams.filter((_, i) => i !== idx));
  }

  function saveParams() {
    if (!weightOk) return;
    onChange(localParams);
  }

  function updateAgentMap(extension, value) {
    const updated = { ...agentMap, [extension]: value };
    setAgentMap(updated);
    saveAgentMap(updated);
  }

  function removeAgent(extension) {
    const updated = { ...agentMap };
    delete updated[extension];
    setAgentMap(updated);
    saveAgentMap(updated);
  }

  function addAgent() {
    const newExt = `ext_${Date.now()}`;
    const updated = { ...agentMap, [newExt]: 'New agent name' };
    setAgentMap(updated);
    saveAgentMap(updated);
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.label}>Scoring parameters</div>

        <div style={S.notice}>
          Each parameter has a weight (%). All weights must total exactly 100%. The system uses English keywords for EN calls and Kiswahili keywords for SW calls (plus EN as fallback).
        </div>

        <div style={S.totalBar(weightOk)}>
          Total weight: {totalWeight}% {weightOk ? '✓ Ready' : `— needs to equal 100% (${totalWeight > 100 ? 'over' : 'under'} by ${Math.abs(100 - totalWeight)}%)`}
        </div>

        {localParams.map((p, idx) => (
          <div key={p.id || idx} style={S.paramCard(!weightOk && Number(p.weight) === 0)}>
            <div style={S.paramHeader}>
              <input
                style={S.nameInput}
                value={p.name}
                onChange={e => update(idx, 'name', e.target.value)}
                placeholder="Parameter name"
              />
              <input
                style={S.weightInput}
                type="number"
                min={0}
                max={100}
                value={p.weight}
                onChange={e => update(idx, 'weight', Number(e.target.value))}
              />
              <span style={S.weightLabel}>%</span>
              <button style={S.deleteBtn} onClick={() => removeParam(idx)} title="Remove parameter">✕</button>
            </div>

            <div style={S.kwLabel}>English keywords (comma-separated)</div>
            <input
              style={S.kwInput}
              value={(p.kwEN || []).join(', ')}
              onChange={e => updateKw(idx, 'kwEN', e.target.value)}
              placeholder="e.g. hello, my name is, account number, thank you"
            />

            <div style={S.kwLabel}>Kiswahili keywords (comma-separated)</div>
            <input
              style={S.kwInput}
              value={(p.kwSW || []).join(', ')}
              onChange={e => updateKw(idx, 'kwSW', e.target.value)}
              placeholder="e.g. habari, jina langu, nambari ya akaunti, asante"
            />
          </div>
        ))}

        <div style={S.gap}>
          <button style={S.btn()} onClick={addParam}>+ Add parameter</button>
          <button style={S.btn(weightOk ? 'success' : 'default')} onClick={saveParams} disabled={!weightOk}>
            {weightOk ? '✓ Save parameters' : `Fix weights first (${totalWeight}/100)`}
          </button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.label}>Agent extension mapping</div>
        <div style={S.notice}>
          Maintain the extension → agent name table used by raw audio uploads. When a ZIP contains calls for extension 343, CallIQ resolves it to the mapped agent name before scoring.
        </div>
        {Object.entries(agentMap).map(([extension, name]) => (
          <div key={extension} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{extension}</div>
            <input
              style={S.nameInput}
              value={name}
              onChange={e => updateAgentMap(extension, e.target.value)}
              placeholder="Agent name"
            />
            <button style={S.deleteBtn} onClick={() => removeAgent(extension)} title="Remove mapping">✕</button>
          </div>
        ))}
        <button style={S.btn()} onClick={addAgent}>+ Add extension mapping</button>
      </div>

      <div style={S.card}>
        <div style={S.label}>How scoring works</div>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
          When a call transcript is analyzed, CallIQ scans for each parameter's keywords in the transcript.
          The more keywords matched relative to the total, the higher that parameter's score (0–100%).
          Each parameter's raw score is then multiplied by its weight to give a weighted contribution.
          The overall call score is the sum of all weighted contributions.
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8, marginTop: '0.5rem' }}>
          For Kiswahili calls, the system uses that parameter's Kiswahili keywords (plus English as fallback).
          For English calls, only English keywords are used.
        </p>
      </div>
    </div>
  );
}
