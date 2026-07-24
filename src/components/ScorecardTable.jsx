import React from 'react';

// ─── Colours matching the scorecard image ────────────────────────────────────
const BLUE_HEADER = '#1F4E79';
const BLUE_HEADER_TEXT = '#FFFFFF';
const BLUE_SUBHEADER = '#2E74B5';
const LIGHT_BLUE_ROW = '#D6E4F0';
const WHITE = '#FFFFFF';
const TOTAL_BG = '#1F4E79';
const TOTAL_TEXT = '#FFFFFF';
const FEEDBACK_BG = '#EBF3FB';

function scoreColor(points, maxPoints) {
  if (points === null) return '#6b7280';
  const pct = points / maxPoints;
  if (pct >= 0.85) return '#166534';
  if (pct >= 0.65) return '#374151';
  if (pct >= 0.45) return '#92400e';
  return '#991b1b';
}

const CALL_LABELS = ['CALL ONE', 'CALL TWO', 'CALL THREE', 'CALL FOUR', 'CALL FIVE'];

export default function ScorecardTable({ agentName, calls, params, feedback, avg }) {
  if (!calls || calls.length === 0) return null;

  // Compute per-parameter averages across the 5 calls
  function paramAvg(paramId) {
    const valid = calls.map(c => c.breakdown?.[paramId]).filter(d => d && !d.isNA && d.points !== null);
    if (!valid.length) return 'N/A';
    return (valid.reduce((s, d) => s + d.points, 0) / valid.length).toFixed(1);
  }

  // Compute total points per call (sum of non-NA params)
  function callTotal(call) {
    return Object.values(call.breakdown || {})
      .filter(d => !d.isNA && d.points !== null)
      .reduce((s, d) => s + d.points, 0);
  }

  const totals = calls.map(callTotal);
  const totalAvg = (totals.reduce((s, t) => s + t, 0) / totals.length).toFixed(1);

  const tdBase = {
    border: '1px solid #BDD7EE',
    padding: '7px 10px',
    fontSize: 13,
    verticalAlign: 'middle',
    textAlign: 'center',
  };
  const tdLeft = { ...tdBase, textAlign: 'left' };

  return (
    <div style={{ marginBottom: '2rem', pageBreakAfter: 'always' }}>
      {/* Print button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 8 }}>
        <button
          onClick={() => window.print()}
          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}
        >
          🖨 Print / Save PDF
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif' }}>
        {/* Agent name header */}
        <thead>
          <tr>
            <td
              colSpan={calls.length + 2}
              style={{ background: BLUE_HEADER, color: BLUE_HEADER_TEXT, textAlign: 'center', fontWeight: 700, fontSize: 15, padding: '10px 12px', border: '1px solid #1F4E79' }}
            >
              {agentName}
            </td>
          </tr>
          {/* Column headers */}
          <tr style={{ background: BLUE_SUBHEADER }}>
            <th style={{ ...tdLeft, background: BLUE_SUBHEADER, color: BLUE_HEADER_TEXT, fontWeight: 700, fontSize: 12, width: '38%' }}>
              MEASURING SCRIPTS
            </th>
            {calls.map((_, i) => (
              <th key={i} style={{ ...tdBase, background: BLUE_SUBHEADER, color: BLUE_HEADER_TEXT, fontWeight: 700, fontSize: 12 }}>
                {CALL_LABELS[i]}
              </th>
            ))}
            <th style={{ ...tdBase, background: BLUE_SUBHEADER, color: BLUE_HEADER_TEXT, fontWeight: 700, fontSize: 12 }}>
              AVERAGE
            </th>
          </tr>
        </thead>

        <tbody>
          {params.map((p, idx) => {
            const rowBg = idx % 2 === 0 ? LIGHT_BLUE_ROW : WHITE;
            const avg = paramAvg(p.id);
            return (
              <tr key={p.id} style={{ background: rowBg }}>
                <td style={{ ...tdLeft, background: rowBg, fontSize: 12 }}>
                  {p.name} ({p.maxPoints} Points)
                </td>
                {calls.map((c, ci) => {
                  const d = c.breakdown?.[p.id];
                  const isNA = d?.isNA;
                  const points = isNA ? null : (d?.points ?? 0);
                  return (
                    <td key={ci} style={{ ...tdBase, background: rowBg, fontWeight: 600, color: scoreColor(points, p.maxPoints) }}>
                      {isNA ? 'N/A' : points}
                    </td>
                  );
                })}
                <td style={{ ...tdBase, background: rowBg, fontWeight: 700, color: scoreColor(avg === 'N/A' ? null : parseFloat(avg), p.maxPoints) }}>
                  {avg}
                </td>
              </tr>
            );
          })}

          {/* Spacer */}
          <tr><td colSpan={calls.length + 2} style={{ height: 4, background: WHITE, border: 'none' }} /></tr>

          {/* Total row */}
          <tr style={{ background: TOTAL_BG }}>
            <td colSpan={calls.length + 1} style={{ ...tdLeft, background: TOTAL_BG, color: TOTAL_TEXT, fontWeight: 700, fontSize: 13 }}>
              TOTAL
            </td>
            <td style={{ ...tdBase, background: TOTAL_BG, color: TOTAL_TEXT, fontWeight: 700, fontSize: 14 }}>
              {totalAvg}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Feedback line */}
      {feedback && (
        <div style={{ background: FEEDBACK_BG, border: '1px solid #BDD7EE', borderTop: 'none', padding: '10px 14px', fontSize: 13, color: '#1F4E79', fontStyle: 'italic' }}>
          {feedback}
        </div>
      )}

      {/* Call-level detail below the scorecard */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {calls.map((c, i) => (
          <div key={c.callId || c.filename || i} style={{ fontSize: 11, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px' }}>
            <strong>{CALL_LABELS[i]}:</strong> {c.callId} · {c.customerName || '—'} · {c.language} · {callTotal(c)} pts
            {c.filename && <span style={{ display: 'block', marginTop: 4, color: '#475569' }}>File: {c.filename}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
