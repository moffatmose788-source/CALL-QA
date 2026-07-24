import * as XLSX from 'xlsx';

// ─── Export scorecards — one sheet per agent, matching the scorecard image ────
export function exportToExcel(agentScorecards, params, filename = 'CallIQ_Scorecards') {
  const wb = XLSX.utils.book_new();

  // ── Per-agent sheets ──
  agentScorecards.forEach(({ agentName, calls, avg, feedback }) => {
    const callLabels = ['CALL ONE','CALL TWO','CALL THREE','CALL FOUR','CALL FIVE'];

    // Header row
    const headerRow = ['MEASURING SCRIPTS', ...callLabels.slice(0, calls.length), 'AVERAGE'];

    // One row per parameter
    const paramRows = params.map(p => {
      const row = [`${p.name} (${p.maxPoints} Points)`];
      calls.forEach(c => {
        const d = c.breakdown?.[p.id];
        row.push(d?.isNA ? 'N/A' : (d?.points ?? 0));
      });
      // Average across calls (excluding N/A)
      const validPoints = calls.map(c => c.breakdown?.[p.id]).filter(d => d && !d.isNA && d.points !== null);
      const avg = validPoints.length ? (validPoints.reduce((s,d)=>s+d.points,0)/validPoints.length).toFixed(1) : 'N/A';
      row.push(avg);
      return row;
    });

    // Total row
    const totalRow = ['', ...calls.map(c => c.totalPoints ?? c.score), avg];
    const totalLabelRow = [...Array(calls.length + 1).fill(''), 'TOTAL', avg];

    // Feedback row
    const feedbackRow = [feedback || '', ...Array(calls.length + 1).fill('')];

    const wsData = [
      [`Agent: ${agentName}`],
      headerRow,
      ...paramRows,
      [],
      totalLabelRow,
      [],
      feedbackRow,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [{ wch: 45 }, ...Array(calls.length + 1).fill({ wch: 12 })];

    // Merge agent name header
    ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:calls.length+1} }];

    const safeSheetName = agentName.replace(/[\/\\*?\[\]:]/g,'').slice(0,31);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  });

  // ── Department summary sheet ──
  const summaryHeaders = ['Agent Name','Calls Sampled','Average Score','Status','Feedback'];
  const summaryRows = agentScorecards.map(a => [
    a.agentName, a.calls.length, a.avg,
    a.avg >= 70 ? 'Pass' : a.avg >= 55 ? 'Coaching' : 'Flagged',
    a.feedback,
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  wsSummary['!cols'] = [{ wch: 25 },{ wch: 16 },{ wch: 16 },{ wch: 12 },{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Dept Summary');

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ─── CSV export (flat) ────────────────────────────────────────────────────────
export function exportToCSV(sampledCalls, params, filename = 'CallIQ_Scorecards') {
  const headers = [
    'Agent Name','Call ID','Filename','Customer Name','Customer ID','Date','Language',
    'Total Score','Status','AI Feedback',
    ...params.map(p => `${p.name} (/${p.maxPoints}pts)`),
  ];
  const rows = sampledCalls.map(c => {
    const base = [
      `"${c.agentName}"`,`"${c.callId}"`,`"${c.filename||''}"`,`"${c.customerName||''}"`,
      c.customerId||'', c.date||'', c.language,
      c.score, c.status,
      `"${(c.feedback||'').replace(/"/g,"'")}"`,
    ];
    const scores = params.map(p => {
      const d = c.breakdown?.[p.id];
      return d?.isNA ? 'N/A' : (d?.points ?? 0);
    });
    return [...base, ...scores].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}
