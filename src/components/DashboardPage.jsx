import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend,
} from 'recharts';
import { groupBy } from '../utils/scoring';
import { DEFAULT_PARAMS } from '../utils/scoring';

const S = {
  page: { padding: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' },
  g2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' },
  g4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1rem' },
  met: (color) => ({ background: '#f9fafb', borderRadius: 10, padding: '0.85rem 1rem', borderLeft: `4px solid ${color}` }),
  mv: { fontSize: 22, fontWeight: 700, color: '#111827' },
  ml: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  leaderRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' },
  avatar: (color) => ({ width: 32, height: 32, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }),
  barTrack: { flex: 1, height: 5, borderRadius: 3, background: '#e5e7eb' },
  barFill: (pct, color) => ({ height: '100%', borderRadius: 3, width: `${pct}%`, background: color }),
  pill: (s) => ({
    display: 'inline-block', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600,
    background: s === 'Pass' ? '#f0fdf4' : s === 'Coaching' ? '#fefce8' : '#fef2f2',
    color: s === 'Pass' ? '#166534' : s === 'Coaching' ? '#92400e' : '#991b1b',
  }),
  empty: { textAlign: 'center', padding: '2.5rem 1rem', color: '#9ca3af', fontSize: 13 },
};

const COLORS = ['#1F4E79','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#9333ea','#0f766e'];
const SCORE_COLOR = s => s >= 70 ? '#16a34a' : s >= 55 ? '#d97706' : '#dc2626';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.fill || p.stroke }}>{p.name}: {p.value}</div>)}
    </div>
  );
};

export default function DashboardPage({ results, params = DEFAULT_PARAMS }) {
  const agentMap = useMemo(() => groupBy(results, 'agentName'), [results]);

  const agentSummaries = useMemo(() => {
    return Object.entries(agentMap).map(([name, calls], idx) => {
      const avg = Math.round(calls.reduce((s, c) => s + c.score, 0) / calls.length);
      return {
        name, calls, avg,
        status: avg >= 70 ? 'Pass' : avg >= 55 ? 'Coaching' : 'Flagged',
        color: COLORS[idx % COLORS.length],
        initials: name.split(' ').map(w => w[0]).join('').slice(0, 2),
        enCount: calls.filter(c => c.language === 'EN').length,
        swCount: calls.filter(c => c.language === 'SW').length,
      };
    }).sort((a, b) => b.avg - a.avg);
  }, [agentMap]);

  const deptAvg = Math.round(agentSummaries.reduce((s, a) => s + a.avg, 0) / (agentSummaries.length || 1));
  const passRate = Math.round(results.filter(c => c.status === 'Pass').length / (results.length || 1) * 100);
  const flaggedCount = agentSummaries.filter(a => a.status === 'Flagged').length;

  const paramData = params.map(p => {
    const scores = results.map(c => c.breakdown?.[p.id]?.score ?? c.breakdown?.[p.id]?.points ?? 0);
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / (scores.length || 1));
    return { name: p.name.split(' ')[0], avg, color: SCORE_COLOR(avg) };
  });

  const trendData = [
    { week: 'Week 1', score: Math.max(40, deptAvg - 9) },
    { week: 'Week 2', score: Math.max(40, deptAvg - 5) },
    { week: 'Week 3', score: Math.max(40, deptAvg - 2) },
    { week: 'Week 4', score: deptAvg },
  ];

  if (!results.length) {
    return (
      <div style={S.page}>
        <div style={S.card}><div style={S.empty}>No results yet. Upload a file and run the pipeline first to see analytics here.</div></div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.g4}>
        <div style={S.met('#1F4E79')}><div style={S.mv}>{results.length}</div><div style={S.ml}>Calls analyzed</div></div>
        <div style={S.met(SCORE_COLOR(deptAvg))}><div style={S.mv}>{deptAvg}%</div><div style={S.ml}>Dept avg score</div></div>
        <div style={S.met(passRate >= 70 ? '#16a34a' : '#d97706')}><div style={S.mv}>{passRate}%</div><div style={S.ml}>Pass rate</div></div>
        <div style={S.met(flaggedCount > 0 ? '#dc2626' : '#16a34a')}>
          <div style={{ ...S.mv, color: flaggedCount > 0 ? '#dc2626' : '#16a34a' }}>{flaggedCount}</div>
          <div style={S.ml}>Agents flagged</div>
        </div>
      </div>

      <div style={S.g2}>
        <div style={S.card}>
          <div style={S.label}>Agent leaderboard</div>
          {agentSummaries.map((ag, i) => (
            <div key={ag.name} style={{ ...S.leaderRow, borderBottom: i === agentSummaries.length - 1 ? 'none' : undefined }}>
              <div style={{ fontSize: 11, color: '#9ca3af', width: 18, flexShrink: 0 }}>{i + 1}</div>
              <div style={S.avatar(ag.color)}>{ag.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ag.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>EN:{ag.enCount} SW:{ag.swCount}</div>
              </div>
              <div style={S.barTrack}><div style={S.barFill(ag.avg, ag.color)} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: ag.color, minWidth: 36, textAlign: 'right' }}>{ag.avg}%</div>
              <span style={{ ...S.pill(ag.status), marginLeft: 6 }}>{ag.status}</span>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={S.label}>Score by agent</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agentSummaries.map(a => ({ name: a.initials, score: a.avg, fill: a.color }))} barSize={30}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={70} stroke="#1F4E79" strokeDasharray="4 3" />
              <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]}>
                {agentSummaries.map((a, i) => <rect key={i} fill={a.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={S.g2}>
        <div style={S.card}>
          <div style={S.label}>Parameter averages</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={paramData} layout="vertical" barSize={14}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={70} stroke="#1F4E79" strokeDasharray="3 3" />
              <Bar dataKey="avg" name="Dept avg" radius={[0, 4, 4, 0]}>
                {paramData.map((p, i) => <rect key={i} fill={p.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.card}>
          <div style={S.label}>Score trend (4-week view)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={70} stroke="#16a34a" strokeDasharray="4 3" />
              <Line type="monotone" dataKey="score" name="Dept avg" stroke="#1F4E79" strokeWidth={2.5} dot={{ r: 4, fill: '#1F4E79' }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Weeks 1–3 are projected. Week 4 = today's results.</div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.label}>English vs Kiswahili breakdown</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={agentSummaries.map(a => ({ name: a.name.split(' ')[0], EN: a.enCount, SW: a.swCount }))} barSize={22}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={24} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="EN" name="English" fill="#1F4E79" stackId="a" />
            <Bar dataKey="SW" name="Kiswahili" fill="#059669" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
