import React, { useState, useMemo } from 'react';
import { groupBy } from '../utils/scoring';
import { DEFAULT_PARAMS } from '../utils/scoring';
import ScorecardTable from './ScorecardTable';
import { exportToExcel, exportToCSV } from '../utils/export';

const S = {
  page: { padding: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' },
  g4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1rem' },
  met: { background: '#f9fafb', borderRadius: 10, padding: '0.85rem 1rem' },
  mv: { fontSize: 22, fontWeight: 700, color: '#111827' },
  ml: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  pill: (s) => ({
    display: 'inline-block', fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 600,
    background: s === 'Pass' ? '#f0fdf4' : s === 'Coaching' ? '#fefce8' : '#fef2f2',
    color: s === 'Pass' ? '#166534' : s === 'Coaching' ? '#92400e' : '#991b1b',
    border: `1px solid ${s === 'Pass' ? '#bbf7d0' : s === 'Coaching' ? '#fde68a' : '#fecaca'}`,
  }),
  pillLang: (l) => ({
    display: 'inline-block', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600,
    background: l === 'SW' ? '#d1fae5' : '#dbeafe', color: l === 'SW' ? '#065f46' : '#1e40af',
  }),
  btn: (v='default') => ({
    fontSize: 13, padding: '8px 16px', borderRadius: 8,
    border: v === 'primary' ? 'none' : v === 'success' ? 'none' : '1px solid #d1d5db',
    cursor: 'pointer',
    background: v === 'primary' ? '#1d4ed8' : v === 'success' ? '#15803d' : '#fff',
    color: v === 'primary' || v === 'success' ? '#fff' : '#374151',
    fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6,
  }),
  agentNav: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' },
  agentBtn: (active) => ({
    fontSize: 12, padding: '6px 14px', borderRadius: 20,
    border: active ? 'none' : '1px solid #d1d5db',
    cursor: 'pointer',
    background: active ? '#1F4E79' : '#fff',
    color: active ? '#fff' : '#374151',
    fontWeight: active ? 600 : 400,
  }),
};

const AVATAR_COLORS = ['#1F4E79','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#9333ea','#0f766e','#b45309','#4338ca'];

export default function ResultsPage({ results, params = DEFAULT_PARAMS }) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [view, setView] = useState('scorecards'); // 'scorecards' | 'all'

  const agentMap = useMemo(() => groupBy(results, 'agentName'), [results]);

  const agentSummaries = useMemo(() => {
    return Object.entries(agentMap).map(([name, calls], idx) => {
      const avg = parseFloat((calls.reduce((s, c) => s + c.score, 0) / calls.length).toFixed(1));
      const langs = [...new Set(calls.map(c => c.language))];
      // Build total points per call
      const callsWithTotals = calls.map(c => ({
        ...c,
        totalPoints: Object.values(c.breakdown || {}).filter(d => !d.isNA && d.points !== null).reduce((s, d) => s + d.points, 0),
      }));
      const totalAvg = parseFloat((callsWithTotals.reduce((s,c)=>s+c.totalPoints,0)/callsWithTotals.length).toFixed(1));
      const status = avg >= 70 ? 'Pass' : avg >= 55 ? 'Coaching' : 'Flagged';
      const feedback = calls[0]?.feedback || '';
      return { name, calls: callsWithTotals, avg, totalAvg, langs, status, feedback, color: AVATAR_COLORS[idx % AVATAR_COLORS.length], initials: name.split(' ').map(w=>w[0]).join('').slice(0,2) };
    }).sort((a,b)=>b.avg-a.avg);
  }, [agentMap]);

  const deptAvg = (agentSummaries.reduce((s,a)=>s+a.avg,0)/(agentSummaries.length||1)).toFixed(1);
  const passRate = Math.round(results.filter(c=>c.status==='Pass').length/(results.length||1)*100);
  const flagged = agentSummaries.filter(a=>a.status==='Flagged').length;

  const displayedAgent = selectedAgent || agentSummaries[0]?.name;
  const currentAgent = agentSummaries.find(a=>a.name===displayedAgent);

  function handleExcelAll() {
    exportToExcel(agentSummaries, params);
  }
  function handleCSVAll() {
    exportToCSV(results, params);
  }

  if (!results.length) return (
    <div style={S.page}><div style={S.card}><div style={{textAlign:'center',padding:'2rem',color:'#6b7280'}}>No results yet. Run the pipeline first.</div></div></div>
  );

  return (
    <div style={S.page}>
      {/* KPIs */}
      <div style={S.g4}>
        <div style={S.met}><div style={S.mv}>{results.length}</div><div style={S.ml}>Calls analyzed</div></div>
        <div style={S.met}><div style={S.mv}>{deptAvg}%</div><div style={S.ml}>Dept avg score</div></div>
        <div style={S.met}><div style={S.mv}>{passRate}%</div><div style={S.ml}>Pass rate</div></div>
        <div style={S.met}><div style={{...S.mv, color: flagged>0?'#dc2626':'#16a34a'}}>{flagged}</div><div style={S.ml}>Agents flagged</div></div>
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <button style={S.btn('success')} onClick={handleExcelAll}>⬇ Download All Scorecards (Excel)</button>
        <button style={S.btn()} onClick={handleCSVAll}>⬇ Download CSV</button>
      </div>

      {/* Agent navigation */}
      <div style={S.label}>Select agent to view scorecard</div>
      <div style={S.agentNav}>
        {agentSummaries.map(ag => (
          <button key={ag.name} style={S.agentBtn(displayedAgent===ag.name)} onClick={()=>setSelectedAgent(ag.name)}>
            {ag.name}
            <span style={{marginLeft:6,...S.pill(ag.status), fontSize:10}}>{ag.avg}% · {ag.status}</span>
          </button>
        ))}
      </div>

      {/* Scorecard table */}
      {currentAgent && (
        <div style={S.card}>
          <ScorecardTable
            agentName={currentAgent.name}
            calls={currentAgent.calls}
            params={params}
            feedback={currentAgent.feedback}
            avg={currentAgent.totalAvg}
          />
        </div>
      )}

      {/* Summary table of all agents */}
      <div style={S.card}>
        <div style={S.label}>Department summary</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#1F4E79' }}>
                {['Agent','Calls','Avg Score','Status','Languages','Feedback'].map(h=>(
                  <th key={h} style={{ padding:'8px 10px', color:'#fff', fontWeight:700, fontSize:11, textAlign:'left', textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentSummaries.map((ag,i)=>(
                <tr key={ag.name} style={{ background: i%2===0?'#D6E4F0':'#fff', cursor:'pointer' }} onClick={()=>setSelectedAgent(ag.name)}>
                  <td style={{ padding:'8px 10px', fontWeight:600 }}>{ag.name}</td>
                  <td style={{ padding:'8px 10px' }}>{ag.calls.length}</td>
                  <td style={{ padding:'8px 10px', fontWeight:700, color: ag.avg>=70?'#166534':ag.avg>=55?'#92400e':'#991b1b' }}>{ag.avg}%</td>
                  <td style={{ padding:'8px 10px' }}><span style={S.pill(ag.status)}>{ag.status}</span></td>
                  <td style={{ padding:'8px 10px' }}>{ag.langs.map(l=><span key={l} style={{...S.pillLang(l),marginRight:3}}>{l}</span>)}</td>
                  <td style={{ padding:'8px 10px', color:'#374151', fontSize:12 }}>{ag.feedback?.slice(0,80)}{ag.feedback?.length>80?'…':''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
