import React, { useMemo } from 'react';
import { exportToExcel, exportToCSV } from '../utils/export';
import { DEFAULT_PARAMS } from '../utils/scoring';
import { groupBy } from '../utils/scoring';

const S = {
  page: { padding: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' },
  btn: (v) => ({
    fontSize: 13, padding: '9px 18px', borderRadius: 8,
    border: v === 'primary' ? 'none' : v === 'success' ? 'none' : '1px solid #d1d5db',
    cursor: 'pointer',
    background: v === 'primary' ? '#1F4E79' : v === 'success' ? '#15803d' : '#fff',
    color: v === 'primary' || v === 'success' ? '#fff' : '#374151',
    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
  }),
  gap: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: '0.75rem' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6' },
  notice: { padding: '0.75rem 1rem', borderRadius: 8, fontSize: 13, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', marginBottom: '0.75rem', lineHeight: 1.6 },
};

export default function ExportPage({ results, params = DEFAULT_PARAMS }) {
  const agentMap = useMemo(() => groupBy(results, 'agentName'), [results]);

  const agentScorecards = useMemo(() => {
    return Object.entries(agentMap).map(([name, calls]) => {
      const avg = parseFloat((calls.reduce((s, c) => s + c.score, 0) / calls.length).toFixed(1));
      const totalAvg = parseFloat((calls.map(c =>
        Object.values(c.breakdown || {}).filter(d => !d.isNA && d.points !== null).reduce((s, d) => s + d.points, 0)
      ).reduce((s, t) => s + t, 0) / calls.length).toFixed(1));
      return { agentName: name, calls, avg, totalAvg, feedback: calls[0]?.feedback || '' };
    });
  }, [agentMap]);

  if (!results.length) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: 14 }}>
            No results yet. Run the pipeline first to generate scorecards, then export them here.
          </div>
        </div>
      </div>
    );
  }

  const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  const agentCount = [...new Set(results.map(r => r.agentName))].length;

  return (
    <div style={S.page}>
      <div style={S.notice}>
        📊 <strong>Excel export</strong> produces one sheet per agent in the exact scorecard format (Measuring Scripts × Call One–Five × Average × Total), plus a Department Summary sheet. Open in Excel, Google Sheets, or LibreOffice.
      </div>

      <div style={S.card}>
        <div style={S.label}>Download scorecards</div>
        <div style={S.gap}>
          <button style={S.btn('success')} onClick={() => exportToExcel(agentScorecards, params)}>
            ⬇ Download Excel (.xlsx) — one sheet per agent
          </button>
          <button style={S.btn()} onClick={() => exportToCSV(results, params)}>
            ⬇ Download CSV (flat — all calls)
          </button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.label}>Report summary</div>
        <div style={S.row}><span style={{ color: '#6b7280' }}>Total calls analyzed</span><strong>{results.length}</strong></div>
        <div style={S.row}><span style={{ color: '#6b7280' }}>Agents</span><strong>{agentCount}</strong></div>
        <div style={S.row}><span style={{ color: '#6b7280' }}>Department average</span><strong>{avg}%</strong></div>
        <div style={S.row}><span style={{ color: '#6b7280' }}>Pass</span><strong style={{ color: '#16a34a' }}>{results.filter(r => r.status === 'Pass').length} calls</strong></div>
        <div style={S.row}><span style={{ color: '#6b7280' }}>Coaching required</span><strong style={{ color: '#d97706' }}>{results.filter(r => r.status === 'Coaching').length} calls</strong></div>
        <div style={S.row}><span style={{ color: '#dc2626' }}>Flagged</span><strong style={{ color: '#dc2626' }}>{results.filter(r => r.status === 'Flagged').length} calls</strong></div>
      </div>

      <div style={S.card}>
        <div style={S.label}>What the Excel file contains</div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 2 }}>
          <div>✅ <strong>One sheet per agent</strong> — e.g. "Moffat Mayaka", "Janet Wanjiku"</div>
          <div>✅ <strong>Agent name</strong> as blue header spanning full width</div>
          <div>✅ <strong>MEASURING SCRIPTS</strong> column with all parameters and max points</div>
          <div>✅ <strong>CALL ONE through CALL FIVE</strong> — actual score per call</div>
          <div>✅ <strong>AVERAGE</strong> column per parameter</div>
          <div>✅ <strong>N/A</strong> where a parameter was not demonstrated</div>
          <div>✅ <strong>TOTAL</strong> row at the bottom</div>
          <div>✅ <strong>Coaching feedback</strong> line (e.g. "Congratulations, Moffat, for good performance.")</div>
          <div>✅ <strong>Dept Summary sheet</strong> — all agents, averages, and status in one view</div>
        </div>
      </div>
    </div>
  );
}
