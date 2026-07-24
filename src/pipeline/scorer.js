/**
 * CallIQ — Scoring Engine
 *
 * Responsibilities:
 *   1. Detect language (English / Kiswahili) from transcript text
 *   2. Score a transcript against the configured parameters
 *   3. Generate structured AI coaching feedback via Claude API
 */

const Anthropic = require('@anthropic-ai/sdk');

// ─────────────────────────────────────────
//  Default parameters
//  Each company can override these via the /api/parameters endpoint.
//  weight: percentage contribution to total score (must sum to 100)
//  kwEN:   English keywords to detect for this parameter
//  kwSW:   Kiswahili keywords to detect for this parameter
// ─────────────────────────────────────────
const DEFAULT_PARAMS = [
  {
    id: 'greeting',
    name: 'Greeting & self-identification',
    weight: 20,
    kwEN: ['hello', 'good morning', 'good afternoon', 'my name is', 'i am', 'calling from', 'this is'],
    kwSW: ['habari', 'jina langu', 'mimi ni', 'ninaitwa', 'ninapigia kutoka', 'karibu', 'asubuhi']
  },
  {
    id: 'verification',
    name: 'Account verification',
    weight: 20,
    kwEN: ['verify', 'account number', 'date of birth', 'confirm your', 'identity', 'for security'],
    kwSW: ['thibitisha', 'nambari ya akaunti', 'tarehe ya kuzaliwa', 'thibiti', 'utambulisho', 'usalama']
  },
  {
    id: 'purpose',
    name: 'Purpose of call',
    weight: 15,
    kwEN: ['calling about', 'calling regarding', 'repayment', 'outstanding', 'balance', 'device', 'payment', 'overdue'],
    kwSW: ['ninapigia kuhusu', 'malipo', 'deni', 'salio', 'simu', 'kulipa', 'bili']
  },
  {
    id: 'empathy',
    name: 'Empathy & tone',
    weight: 15,
    kwEN: ['understand', 'appreciate', 'sorry', 'i see', 'thank you for', 'i know', 'respect', 'patience'],
    kwSW: ['naelewa', 'asante', 'pole', 'samahani', 'nakushukuru', 'najua', 'heshimu', 'subira']
  },
  {
    id: 'solution',
    name: 'Solution offered',
    weight: 15,
    kwEN: ['payment plan', 'extension', 'arrangement', 'installment', 'waiver', 'help you', 'option', 'offer', 'flexible'],
    kwSW: ['mpango wa malipo', 'muda zaidi', 'mpango', 'msaada', 'chaguo', 'saidia', 'rahisi', 'nafasi']
  },
  {
    id: 'nextsteps',
    name: 'Next steps communicated',
    weight: 10,
    kwEN: ['within', 'expect', 'will send', 'follow up', '24 hours', 'confirmation', 'you will receive', 'sms'],
    kwSW: ['ndani ya', 'tarajia', 'tutakutumia', 'tutawasiliana', 'masaa 24', 'uthibitisho', 'ujumbe']
  },
  {
    id: 'closing',
    name: 'Professional closing',
    weight: 5,
    kwEN: ['thank you', 'goodbye', 'have a good', 'pleasure', 'wonderful day', 'take care', 'all the best'],
    kwSW: ['asante', 'kwa heri', 'siku njema', 'furaha', 'kwa salama', 'tutaonana', 'baraka']
  }
];

// In-memory parameter store (replaced by DB in full production)
let activeParams = [...DEFAULT_PARAMS];

// ─────────────────────────────────────────
//  Language detection
//  Uses frequency of Kiswahili marker words.
//  Returns 'SW' or 'EN'.
// ─────────────────────────────────────────
const SW_MARKERS = [
  'habari', 'jina langu', 'ninapigia', 'asante', 'kwa heri',
  'thibitisha', 'naelewa', 'mpango', 'salio', 'shilingi',
  'mimi ni', 'tafadhali', 'deni', 'simu', 'karibu', 'pole',
  'samahani', 'masaa', 'siku njema', 'ndani ya'
];

function detectLanguage(transcript) {
  const t = transcript.toLowerCase();
  const hits = SW_MARKERS.filter(w => t.includes(w)).length;
  return hits >= 2 ? 'SW' : 'EN';
}

// ─────────────────────────────────────────
//  Score a single transcript
//  Returns { total, breakdown, language }
// ─────────────────────────────────────────
function scoreTranscript(transcript, languageOverride = null) {
  const language = languageOverride || detectLanguage(transcript);
  const t = transcript.toLowerCase();
  let total = 0;
  const breakdown = {};

  for (const param of activeParams) {
    // Use language-appropriate keywords, supplemented by the other set
    const primary = language === 'SW' ? param.kwSW : param.kwEN;
    const secondary = language === 'SW' ? param.kwEN : param.kwSW;
    const allKw = [...primary, ...secondary.slice(0, 3)]; // blend a few cross-language

    const hits = allKw.filter(kw => t.includes(kw.toLowerCase())).length;
    const raw = Math.min(100, Math.round((hits / Math.max(3, allKw.length)) * 150));

    breakdown[param.id] = {
      name:     param.name,
      score:    raw,
      weight:   param.weight,
      weighted: Math.round(raw * param.weight / 100),
      hits:     hits,
      possible: allKw.length
    };

    total += raw * param.weight / 100;
  }

  return {
    total:    Math.min(100, Math.round(total)),
    language,
    breakdown
  };
}

// ─────────────────────────────────────────
//  Generate AI coaching feedback (Claude API)
//  Falls back to rule-based feedback if API key not set.
// ─────────────────────────────────────────
async function generateFeedback(callRecord) {
  const { agent, score, breakdown, transcript, language } = callRecord;

  const lowParams  = Object.values(breakdown).filter(p => p.score < 60).map(p => p.name);
  const highParams = Object.values(breakdown).filter(p => p.score >= 80).map(p => p.name);
  const firstName  = agent.split(' ')[0];

  // If no API key, return rule-based feedback
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return buildRuleBasedFeedback(firstName, score, lowParams, highParams, language);
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are a call centre quality analyst. Analyze the following call transcript and provide concise coaching feedback for agent ${agent}.

Language detected: ${language === 'SW' ? 'Kiswahili' : 'English'}
Overall score: ${score}%
Strong parameters: ${highParams.join(', ') || 'None above 80%'}
Weak parameters: ${lowParams.join(', ') || 'None below 60%'}

Transcript:
"""
${transcript.slice(0, 1500)}
"""

Write 3–4 sentences of specific, actionable coaching feedback. Be direct but constructive. Reference specific moments from the transcript where possible. End with one concrete improvement tip.`;

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }]
    });

    return response.content[0].text.trim();
  } catch (err) {
    console.error('[CallIQ] Feedback generation failed:', err.message);
    return buildRuleBasedFeedback(firstName, score, lowParams, highParams, language);
  }
}

function buildRuleBasedFeedback(name, score, lowParams, highParams, lang) {
  const langLabel = lang === 'SW' ? 'Kiswahili' : 'English';
  let fb = '';

  if (score >= 80) {
    fb = `${name} delivered a professional, compliant call in ${langLabel}. `;
  } else if (score >= 60) {
    fb = `${name} showed acceptable performance in ${langLabel} with clear room to improve. `;
  } else {
    fb = `${name} requires immediate coaching — significant gaps detected in this ${langLabel} call. `;
  }

  if (lowParams.length) fb += `Priority areas: ${lowParams.join(', ')}. `;
  if (highParams.length) fb += `Strengths to maintain: ${highParams.join(', ')}. `;

  fb += score < 70
    ? 'Recommend a 1-on-1 coaching session before next call batch.'
    : 'Continue building on strong areas and address the gaps above.';

  return fb;
}

// ─────────────────────────────────────────
//  Parameter management
// ─────────────────────────────────────────
function getParams()           { return activeParams; }
function setParams(params)     { activeParams = params; }
function resetParams()         { activeParams = [...DEFAULT_PARAMS]; }

module.exports = {
  detectLanguage,
  scoreTranscript,
  generateFeedback,
  getParams,
  setParams,
  resetParams,
  DEFAULT_PARAMS
};
