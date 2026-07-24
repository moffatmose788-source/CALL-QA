import React, { useMemo, useRef } from 'react';
import { groupBy, generateFeedback } from '../utils/scoring';
import { DEFAULT_PARAMS } from '../utils/scoring';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const avg = (arr) => {
  const valid = arr.filter(v => v !== null && v !== undefined);
  if (!valid.length) return null;
  return parseFloat((valid.reduce((s, v) => s + v, 0) / valid.length).toFixed(1));
};

const fmtPts = (v) => (v === null || v === undefined ? 'N/A' : v);
const fmtAvg = (v) => (v === null || v === undefined ? 'N/A' : v);

const statusColor = (pct) =>
  pct >= 85 ? '#166534' : pct >= 70 ? '#1d4ed8' : pct >= 55 ? '#92400e' : '#991b1b';

const statusBg = (pct) =>
  pct >= 85 ? '#f0fdf4' : pct >= 70 ? '#eff6ff' : pct >= 55 ? '#fffbeb' : '#fef2f2';

/* ─── Styles ───────────────────────────────────────────────────────────────── */
const S = {
  page: { padding: '1.5rem' },
  topControls: {
    display: 'flex', gap: 10, alignItems: 'center',
    marginBottom: '1rem', flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1, minWidth: 180, padding: '7px 12px',
    borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13,
  },
  btn: (v) => ({
    fontSize: 13, padding: '7px 14px', borderRadius: 8,
    border: v === 'primary' ? 'none' : '1px solid #d1d5db',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
    background: v === 'primary' ? '#1d4ed8' : v === 'success' ? '#15803d' : '#fff',
    color: v === 'primary' || v === 'success' ? '#fff' : '#374151',
    fontWeight: 500, whiteSpace: 'nowrap',
  }),
  /* ── Scorecard table ── */
  scWrapper: {
    marginBottom: '2rem',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    pageBreakInside: 'avoid',
  },
  agentHeader: {
    background: '#1e40af',
    color: '#fff',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 15,
    padding: '10px 16px',
    letterSpacing: '0.02em',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  thScript: {
    background: '#1e3a5f',
    color: '#fff',
    padding: '9px 12px',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: 12,
    borderRight: '1px solid #2d5fa8',
    width: '34%',
  },
  thCall: {
    background: '#1e3a5f',
    color: '#fff',
    padding: '9px 8px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 12,
    borderRight: '1px solid #2d5fa8',
    minWidth: 70,
  },
  thAvg: {
    background: '#1e3a5f',
    color: '#fff',
    padding: '9px 8px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 12,
  },
  tdParam: (alt) => ({
    padding: '9px 12px',
    background: alt ? '#f8fafc' : '#fff',
    borderBottom: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    fontSize: 12,
    color: '#1e293b',
    fontWeight: 500,
    verticalAlign: 'middle',
  }),
  tdScore: (alt, isAvg) => ({
    padding: '9px 8px',
    background: alt ? '#f8fafc' : '#fff',
    borderBottom: '1px solid #e2e8f0',
    borderRight: isAvg ? 'none' : '1px solid #e2e8f0',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: isAvg ? 700 : 400,
    color: '#1e293b',
    verticalAlign: 'middle',
  }),
  tdTotal: {
    padding: '10px 12px',
    background: '#f1f5f9',
    borderTop: '2px solid #1e40af',
    fontWeight: 700,
    fontSize: 13,
    color: '#1e293b',
  },
  tdTotalScore: (pct) => ({
    padding: '10px 8px',
    background: statusBg(pct),
    borderTop: '2px solid #1e40af',
    textAlign: 'center',
    fontWeight: 800,
    fontSize: 15,
    color: statusColor(pct),
  }),
  feedbackRow: (pct) => ({
    background: statusBg(pct),
    padding: '10px 14px',
    fontSize: 12,
    color: statusColor(pct),
    fontWeight: 500,
    borderTop: '1px solid #e2e8f0',
    fontStyle: 'italic',
  }),
  pill: (pct) => ({
    display: 'inline-block', fontSize: 11, padding: '2px 9px', borderRadius: 20,
    fontWeight: 700, background: statusBg(pct), color: statusColor(pct),
    border: `1px solid ${statusColor(pct)}33`,
  }),
  empty: {
    textAlign: 'center', padding: '3rem', color: '#9ca3af', fontSize: 14,
    background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
  },
};

/* ─── Single agent scorecard ─────────────────────────────────────────────────── */
function AgentScorecard({ agentName, calls, params }) {
  // Each call has .breakdown[paramId].points (number or null)
  // Build rows: param × call
  const callLabels = ['CALL ONE', 'CALL TWO', 'CALL THREE', 'CALL FOUR', 'CALL FIVE'];

  // Compute per-param averages and per-call totals
  const paramRows = params.map(p => {
    const pts = calls.map(c => c.breakdown?.[p.id]?.points ?? null);
    const rowAvg = avg(pts);
    return { param: p, pts, avg: rowAvg };
  });

  // Per-call totals (sum of non-null params)
  const callTotals = calls.map((_, ci) => {
    const valid = paramRows.filter(r => r.pts[ci] !== null).map(r => r.pts[ci]);
    return valid.reduce((s, v) => s + v, 0);
  });

  // Overall average total
  const overallAvg = parseFloat(avg(callTotals).toFixed(1));
  const maxTotal = params.reduce((s, p) => s + p.maxPoints, 0);
  const overallPct = Math.round((overallAvg / maxTotal) * 100);

  const feedback = generateFeedback(agentName, overallAvg, maxTotal);

  return (
    <div style={S.scWrapper}>
      {/* Agent name header */}
      <div style={S.agentHeader}>{agentName}</div>

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.thScript}>MEASURING SCRIPTS</th>
            {callLabels.map((l, i) => (
              <th key={i} style={S.thCall}>{l}</th>
            ))}
            <th style={S.thAvg}>AVERAGE</th>
          </tr>
        </thead>
        <tbody>
          {paramRows.map((row, ri) => (
            <tr key={row.param.id}>
              <td style={S.tdParam(ri % 2 === 1)}>
                {row.param.name} ({row.param.maxPoints} Points)
              </td>
              {row.pts.map((pt, ci) => (
                <td key={ci} style={S.tdScore(ri % 2 === 1, false)}>
                  {fmtPts(pt)}
                </td>
              ))}
              <td style={S.tdScore(ri % 2 === 1, true)}>
                {fmtAvg(row.avg)}
              </td>
            </tr>
          ))}

          {/* Totals row */}
          <tr>
            <td style={{ ...S.tdTotal, borderRight: '1px solid #e2e8f0' }} />
            {callTotals.map((t, i) => (
              <td key={i} style={{ ...S.tdTotalScore(overallPct), borderRight: '1px solid #cbd5e1', fontSize: 13 }}>
                {t}
              </td>
            ))}
            <td style={S.tdTotalScore(overallPct)}>
              {overallAvg}
            </td>
          </tr>

          {/* TOTAL label row */}
          <tr>
            <td colSpan={calls.length + 1} style={{ ...S.tdTotal, borderTop: 'none', color: '#64748b', fontSize: 11 }}>
              Out of {maxTotal} points total &nbsp;·&nbsp;
              <span style={S.pill(overallPct)}>{overallPct}% — {overallPct >= 70 ? 'PASS' : overallPct >= 55 ? 'COACHING' : 'FLAGGED'}</span>
            </td>
            <td style={{ ...S.tdTotalScore(overallPct), borderTop: 'none', fontSize: 11, background: '#f1f5f9', color: '#64748b' }}>
              TOTAL
            </td>
          </tr>
        </tbody>
      </table>

      {/* Feedback / congratulations message */}
      <div style={S.feedbackRow(overallPct)}>{feedback}</div>
    </div>
  );
}

/* ─── Print styles injected into <head> ────────────────────────────────────── */
const PRINT_CSS = `
@media print {
  body { background: #fff !important; }
  .no-print { display: none !important; }
  .sc-wrapper { page-break-inside: avoid; margin-bottom: 1.5rem; }
}
`;

/* ─── Main page ──────────────────────────────────────────────────────────────── */
export default function ScorecardPage({ results, params = DEFAULT_PARAMS }) {
  const [search, setSearch] = React.useState('');
  const printRef = useRef();

  const agentMap = useMemo(() => groupBy(results, 'agentName'), [results]);

  const agents = useMemo(() =>
    Object.entries(agentMap)
      .filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a[0].localeCompare(b[0])),
    [agentMap, search]
  );

  function handlePrint() {
    window.print();
  }

  function handleExportAll() {
    // Export all scorecards as one CSV
    const lines = [];
    Object.entries(agentMap).forEach(([agentName, calls]) => {
      lines.push([agentName]);
      lines.push(['Parameter', ...calls.map((_, i) => `Call ${i+1}`), 'Average']);
      params.forEach(p => {
        const pts = calls.map(c => c.breakdown?.[p.id]?.points ?? 'N/A');
        const validPts = pts.filter(v => v !== 'N/A');
        const rowAvg = validPts.length
          ? parseFloat((validPts.reduce((s, v) => s + v, 0) / validPts.length).toFixed(1))
          : 'N/A';
        lines.push([`${p.name} (${p.maxPoints}pts)`, ...pts, rowAvg]);
      });
      // totals
      const callTotals = calls.map((_, ci) => {
        const valid = params.filter(p => calls[ci].breakdown?.[p.id]?.points !== null).map(p => calls[ci].breakdown?.[p.id]?.points ?? 0);
        return valid.reduce((s, v) => s + v, 0);
      });
      const overallAvg = parseFloat((callTotals.reduce((s, v) => s + v, 0) / callTotals.length).toFixed(1));
      lines.push(['TOTAL', ...callTotals, overallAvg]);
      lines.push([]);
    });

    const csv = lines.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CallIQ_Scorecards_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  if (!results.length) {
    return (
      <div style={S.page}>
        <div style={S.empty}>No results yet. Upload a file and run the pipeline first.</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{PRINT_CSS}</style>

      {/* Controls */}
      <div style={{ ...S.topControls, marginBottom: '1.25rem' }} className="no-print">
        <input
          style={S.searchInput}
          placeholder="Search agent name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button style={S.btn('success')} onClick={handleExportAll}>
          ⬇ Export all scorecards (CSV)
        </button>
        <button style={S.btn()} onClick={handlePrint}>
          🖨 Print scorecards
        </button>
        <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
          {agents.length} agent{agents.length !== 1 ? 's' : ''} shown
        </span>
      </div>

      {/* One scorecard per agent */}
      <div ref={printRef}>
        {agents.map(([agentName, calls]) => (
          <AgentScorecard
            key={agentName}
            agentName={agentName}
            calls={calls}
            params={params}
          />
        ))}
      </div>
    </div>
  );
}
