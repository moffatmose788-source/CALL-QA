// ─── Default Parameters ───────────────────────────────────────────────────────
export const DEFAULT_PARAMS = [
  {
    id: 'greeting',
    name: 'Greeting & Professionalism',
    maxPoints: 15,
    weight: 15,
    kwEN: ['hello','good morning','good afternoon','good evening','my name is','i am','this is','calling from','speaking','how are you','may i speak'],
    kwSW: ['habari','jina langu','mimi ni','ninaitwa','ninapigia kutoka','karibu','asubuhi','jioni','mchana','habari yako'],
  },
  {
    id: 'verification',
    name: 'Account Verification, Compliance & Debt Information Accuracy',
    maxPoints: 25,
    weight: 25,
    kwEN: ['verify','account number','date of birth','confirm your','identity','id number','national id','outstanding balance','amount due','debt','overdue','compliance'],
    kwSW: ['thibitisha','nambari ya akaunti','tarehe ya kuzaliwa','thibiti','utambulisho','nambari ya kitambulisho','salio','deni','mkopo'],
  },
  {
    id: 'negotiation',
    name: 'Balance Explanation, Negotiation & Payment Commitment',
    maxPoints: 30,
    weight: 30,
    kwEN: ['payment plan','extension','arrangement','installment','commit','promise','balance','will pay','pay by','repayment','offer','help you','option','solution','negotiate','settle','agree'],
    kwSW: ['mpango wa malipo','muda zaidi','mpango','kulipa','salio','ahadi','panga','saidia','suluhisho','malipo','kukubaliana'],
  },
  {
    id: 'empathy',
    name: 'Empathy, Listening & Call Control',
    maxPoints: 15,
    weight: 15,
    kwEN: ['understand','appreciate','sorry','i see','thank you for','i know','respect','value','important','concern','listen','i hear you','noted'],
    kwSW: ['naelewa','asante','pole','samahani','nakushukuru','najua','heshimu','muhimu','sikiliza','nimeona'],
  },
  {
    id: 'product',
    name: 'Product Knowledge / Problem Solving Skills',
    maxPoints: 10,
    weight: 10,
    kwEN: ['product','device','model','specification','feature','warranty','insurance','policy','terms','condition','inform','explain','detail','resolve','solution'],
    kwSW: ['bidhaa','simu','vifaa','bima','masharti','maelezo','suluhisho','tatua','hali'],
  },
  {
    id: 'closing',
    name: 'Closing Remarks',
    maxPoints: 5,
    weight: 5,
    kwEN: ['thank you','goodbye','have a good','pleasure','wonderful day','take care','great day','been a pleasure','anything else','further assistance'],
    kwSW: ['asante','kwa heri','siku njema','furaha','kwa salama','tutaonana','asante sana','kitu kingine'],
  },
];

// ─── Minimum calls required before sampling is allowed ────────────────────────
export const MIN_CALLS_REQUIRED = 300;

// ─── Language Detection ───────────────────────────────────────────────────────
export function detectLanguage(transcript, whisperHint = null) {
  if (whisperHint) {
    const hint = whisperHint.toString().toLowerCase();
    if (hint.startsWith('sw')) return 'SW';
    if (hint.startsWith('en')) return 'EN';
  }

  const t = transcript.toLowerCase();
  const swWords = [
    'habari','jina langu','ninapigia','asante','kwa heri',
    'thibitisha','naelewa','mpango','salio','shilingi',
    'mimi ni','tafadhali','ndio','hapana','sawa','pole',
    'karibu','tutaonana','asubuhi','jioni','nakushukuru',
  ];
  const hits = swWords.filter(w => t.includes(w)).length;
  return hits >= 2 ? 'SW' : 'EN';
}

// ─── Score a transcript — returns points out of maxPoints per parameter ───────
export function scoreTranscript(transcript, lang, params = DEFAULT_PARAMS) {
  const t = transcript.toLowerCase();
  let totalPoints = 0;
  let totalMax = 0;
  const breakdown = {};

  params.forEach(p => {
    const keywords = lang === 'SW' ? [...p.kwSW, ...p.kwEN] : p.kwEN;
    const hits = keywords.filter(kw => t.includes(kw.toLowerCase())).length;
    const ratio = Math.min(1, (hits / Math.max(3, keywords.length)) * 1.6);
    const points = Math.round(ratio * p.maxPoints);
    const isNA = p.id === 'product' && hits === 0;

    breakdown[p.id] = {
      name: p.name,
      points: isNA ? null : points,
      maxPoints: p.maxPoints,
      weight: p.weight,
      hits,
      isNA,
    };

    if (!isNA) {
      totalPoints += points;
      totalMax += p.maxPoints;
    }
  });

  const total = Math.min(100, Math.round((totalPoints / Math.max(1, totalMax)) * 100));
  return { total, totalPoints, breakdown };
}

// ─── Generate coaching feedback ───────────────────────────────────────────────
export function generateFeedback(agentName, total, breakdown) {
  const low = Object.values(breakdown)
    .filter(d => !d.isNA && d.points !== null && d.points / d.maxPoints < 0.6)
    .map(d => d.name);
  const high = Object.values(breakdown)
    .filter(d => !d.isNA && d.points !== null && d.points / d.maxPoints >= 0.85)
    .map(d => d.name);

  let fb = '';
  if (total >= 80) fb = `Congratulations, ${agentName}, for good performance. `;
  else if (total >= 65) fb = `Good effort, ${agentName}. You are on the right track but there is room for improvement. `;
  else fb = `${agentName} requires immediate coaching and supervisor support. `;

  if (high.length) fb += `Excellent in: ${high.join(', ')}. `;
  if (low.length) fb += `Needs improvement in: ${low.join(', ')}.`;
  return fb.trim();
}

// ─── Status ───────────────────────────────────────────────────────────────────
export function getStatus(score, passThreshold = 70, coachThreshold = 55) {
  if (score >= passThreshold) return 'Pass';
  if (score >= coachThreshold) return 'Coaching';
  return 'Flagged';
}

// ─── TRUE RANDOM SAMPLE — no bias ────────────────────────────────────────────
// Uses Fisher-Yates shuffle to guarantee unbiased random selection
export function randomSample(arr, n) {
  const pool = [...arr];
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

// ─── Group array by key ───────────────────────────────────────────────────────
export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'Unknown';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// ─── Check which agents are eligible for sampling ─────────────────────────────
// An agent is eligible ONLY when they have >= MIN_CALLS_REQUIRED calls
export function getAgentEligibility(allCalls, minCalls = MIN_CALLS_REQUIRED) {
  const groups = groupBy(allCalls, 'agentName');
  return Object.entries(groups).map(([name, calls]) => ({
    agentName: name,
    callCount: calls.length,
    eligible: calls.length >= minCalls,
    callsNeeded: Math.max(0, minCalls - calls.length),
    calls,
  }));
}
