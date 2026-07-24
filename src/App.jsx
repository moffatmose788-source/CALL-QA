import React, { useState } from 'react';
import UploadPage from './components/UploadPage';
import ResultsPage from './components/ResultsPage';
import DashboardPage from './components/DashboardPage';
import ExportPage from './components/ExportPage';
import ParametersPage from './components/ParametersPage';
import IntegrationPage from './components/IntegrationPage';
import { DEFAULT_PARAMS } from './utils/scoring';

const TABS = [
  { id: 'upload',       label: '① Upload & Run',  icon: '📂' },
  { id: 'results',      label: '② Scorecards',    icon: '📋' },
  { id: 'dashboard',    label: '③ Dashboard',     icon: '📊' },
  { id: 'export',       label: '④ Export',        icon: '⬇️' },
  { id: 'parameters',   label: 'Parameters',      icon: '🎛' },
  { id: 'integrations', label: 'Integrations',    icon: '🔌' },
];

const META = {
  upload:       { title: 'Upload & Run',       sub: 'Upload your CSV or Excel file containing agent calls, then press Run. The system samples 5 calls per agent, detects English/Kiswahili, scores against parameters, and generates scorecards.' },
  results:      { title: 'Agent Scorecards',   sub: 'Full scorecard per agent — Measuring Scripts × Call One to Five × Average × Total × Coaching feedback line.' },
  dashboard:    { title: 'Dashboard',          sub: 'Leaderboard, score charts, parameter heatmap, and language breakdown.' },
  export:       { title: 'Export',             sub: 'Download Excel with one sheet per agent in scorecard format, plus a department summary sheet.' },
  parameters:   { title: 'Parameters',         sub: 'Edit parameter names, max points, and English/Kiswahili keywords. Weights must total 100.' },
  integrations: { title: 'Integrations',       sub: 'Connect Whisper (audio transcription), your CRM portal, telephony system, and notifications.' },
};

const APP = {
  shell: { minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column' },
  bar: {
    background: '#1F4E79', padding: '0 1.25rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 54, position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  },
  logo: { fontSize: 17, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.02em' },
  badge: { fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', color: '#fff' },
  nav: { display: 'flex', gap: 2 },
  nb: (on) => ({
    fontSize: 12, padding: '6px 11px', borderRadius: 7, border: 'none',
    cursor: 'pointer', fontWeight: on ? 600 : 400,
    background: on ? 'rgba(255,255,255,0.2)' : 'transparent',
    color: on ? '#fff' : 'rgba(255,255,255,0.65)',
    whiteSpace: 'nowrap',
  }),
  statusBar: {
    background: '#fff', borderBottom: '1px solid #f3f4f6',
    padding: '0.4rem 1.5rem', display: 'flex', gap: 20, fontSize: 12, color: '#6b7280', flexWrap: 'wrap',
  },
  si: (ok) => ({ display: 'flex', alignItems: 'center', gap: 5, color: ok ? '#16a34a' : '#9ca3af' }),
  dot: (ok) => ({ width: 7, height: 7, borderRadius: '50%', background: ok ? '#16a34a' : '#d1d5db', flexShrink: 0 }),
  content: { flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', paddingBottom: '3rem' },
  ptitle: { padding: '1.25rem 1.5rem 0', fontSize: 18, fontWeight: 700, color: '#111827' },
  psub: { padding: '0.2rem 1.5rem 0', fontSize: 13, color: '#6b7280', marginBottom: '0.15rem' },
};

export default function App() {
  const [tab, setTab] = useState('upload');
  const [results, setResults] = useState([]);
  const [params, setParams] = useState(DEFAULT_PARAMS);

  const processed = results.length > 0;
  const agentCount = [...new Set(results.map(r => r.agentName))].length;
  const deptAvg = processed ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : null;

  function handleResults(scored) {
    setResults(scored);
    // Auto-navigate to scorecards once done
    setTimeout(() => setTab('results'), 300);
  }

  function handleParamSave(newParams) {
    setParams(newParams);
    setResults([]);
    setTab('upload');
  }

  const meta = META[tab];

  return (
    <div style={APP.shell}>
      {/* Top bar */}
      <div style={APP.bar}>
        <div style={APP.logo}>
          <span>📞</span> CallIQ
          <span style={APP.badge}>Professional</span>
        </div>
        <nav style={APP.nav}>
          {TABS.map(t => (
            <button key={t.id} style={APP.nb(tab === t.id)} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Status bar */}
      <div style={APP.statusBar}>
        <div style={APP.si(processed)}>
          <div style={APP.dot(processed)} />
          {processed ? `${results.length} calls scored` : 'No results yet — upload a file and press Run'}
        </div>
        {processed && (
          <>
            <div style={APP.si(true)}><div style={APP.dot(true)} />{agentCount} agent(s)</div>
            <div style={APP.si(true)}><div style={APP.dot(true)} />Dept avg: {deptAvg}%</div>
            <div style={APP.si(true)}><div style={APP.dot(true)} />Pass: {results.filter(r => r.status === 'Pass').length} · Coaching: {results.filter(r => r.status === 'Coaching').length} · Flagged: {results.filter(r => r.status === 'Flagged').length}</div>
          </>
        )}
        <div style={APP.si(false)}><div style={APP.dot(false)} />{params.length} parameters · {params.reduce((s, p) => s + Number(p.weight || 0), 0)}/100 weight</div>
      </div>

      {/* Content */}
      <div style={APP.content}>
        <div style={APP.ptitle}>{meta.title}</div>
        <div style={APP.psub}>{meta.sub}</div>

        {tab === 'upload' && (
          <UploadPage
            onResults={handleResults}
            params={params}
            sampleSize={5}
            passThresh={70}
            coachThresh={55}
          />
        )}

        {tab === 'results' && (
          results.length > 0
            ? <ResultsPage results={results} params={params} />
            : <div style={{ padding: '2rem 1.5rem', color: '#6b7280', fontSize: 14 }}>
                No scorecards yet.{' '}
                <button onClick={() => setTab('upload')} style={{ color: '#1F4E79', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'underline' }}>
                  Go to Upload & Run →
                </button>
              </div>
        )}

        {tab === 'dashboard' && (
          results.length > 0
            ? <DashboardPage results={results} params={params} />
            : <div style={{ padding: '2rem 1.5rem', color: '#6b7280', fontSize: 14 }}>
                No data yet.{' '}
                <button onClick={() => setTab('upload')} style={{ color: '#1F4E79', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'underline' }}>
                  Upload & Run first →
                </button>
              </div>
        )}

        {tab === 'export' && <ExportPage results={results} params={params} />}

        {tab === 'parameters' && <ParametersPage params={params} onChange={handleParamSave} />}

        {tab === 'integrations' && <IntegrationPage />}
      </div>
    </div>
  );
}
