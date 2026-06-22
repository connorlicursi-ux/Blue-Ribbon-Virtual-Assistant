// Pride Landscaping AI Assistant — Vercel Serverless Proxy
// Protections: API key hidden, rate limiting, token budget, domain lock, input validation

const ALLOWED_ORIGINS = [
  'https://pride-yardworks.lovable.app',
  'https://pridelandscaping.com', // add real domain when purchased
  'http://localhost:3000',         // for local testing only — remove in production
];

const MAX_INPUT_CHARS = 400;
const MAX_TOKENS_RESPONSE = 180;
const MAX_REQUESTS_PER_IP_PER_HOUR = 10;
const MONTHLY_TOKEN_BUDGET = 75000; // ~$0.02 at Haiku pricing — very safe

// In-memory rate limit store (resets on cold start — use Upstash Redis for persistence)
const ipRequestLog = {};

// Simple token usage tracker (use Upstash KV for persistence across deployments)
let monthlyTokensUsed = 0;

const SYSTEM_PROMPT = `You are the virtual assistant for Pride Landscaping, a full-service landscaping and excavating company based in Chardon, Ohio. You are friendly, concise, and helpful.

You only answer questions about Pride Landscaping's services, pricing, service area, and how to get in touch. If someone asks anything unrelated to landscaping, outdoor work, or Pride Landscaping, politely redirect them.

ABOUT PRIDE LANDSCAPING:
- Owner: Nick
- Phone: 440-622-2693
- Based in: Chardon, OH
- Licensed and Insured
- Serves: Geauga, Lake, Cuyahoga, and surrounding counties
- Free estimates — no obligation

SERVICES:
1. Excavating — site prep, land clearing, grading
2. Drainage — French drains, catch basins, ditch enclosures
3. Demolition — sheds, decks, concrete removal
4. Tree Removal — licensed, any size, full cleanup
5. Hardscape — patios, retaining walls, walkways, stone steps
6. Softscape — mulch beds, plantings, lawn installs, garden design
7. Yard Restoration — storm damage, full property rebuilds
8. Ditch Enclosures — eliminate weekly ditch maintenance permanently

HOURS: Monday–Saturday 7:00 AM – 6:00 PM, Sunday by appointment

HOW TO GET A QUOTE: Call 440-622-2693 or fill out the contact form on this page. Nick handles every estimate personally.

RULES:
- Keep all responses under 3 sentences when possible
- Never use markdown formatting — no bold (**), no bullet points (-), no headers, no asterisks. Plain conversational text only.
- Write like a friendly local business owner, not a corporate chatbot
- Use natural language, short sentences, casual but professional tone
- Only suggest calling if the person is clearly ready to book or asking about pricing — do not add a call to action on every single response
- Never make up prices — say "call for a free estimate"
- Never discuss competitors
- If asked about something outside landscaping, say: "I'm only able to help with questions about Pride Landscaping's services. Feel free to call Nick directly at 440-622-2693!"`;

function getRateLimitKey(ip) {
  const hour = Math.floor(Date.now() / 3600000);
  return `${ip}:${hour}`;
}

function isRateLimited(ip) {
  const key = getRateLimitKey(ip);
  const count = ipRequestLog[key] || 0;
  if (count >= MAX_REQUESTS_PER_IP_PER_HOUR) return true;
  ipRequestLog[key] = count + 1;

  // Cleanup old keys to prevent memory leak
  const currentHour = Math.floor(Date.now() / 3600000);
  for (const k of Object.keys(ipRequestLog)) {
    const keyHour = parseInt(k.split(':')[1]);
    if (currentHour - keyHour > 2) delete ipRequestLog[k];
  }

  return false;
}

function isOffTopic(message) {
  const blocked = [
    'ignore previous', 'forget your instructions', 'jailbreak',
    'write code', 'write a story', 'poem', 'essay', 'recipe',
    'stock price', 'weather', 'politics', 'sports', 'news',
    'openai', 'chatgpt', 'anthropic', 'claude', 'gpt',
    'hack', 'password', 'credit card', 'social security',
  ];
  const lower = message.toLowerCase();
  return blocked.some(term => lower.includes(term));
}

export default async function handler(req, res) {
  // 1. CORS — only allow whitelisted origins
  const origin = req.headers.origin;
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 2. RATE LIMIT — per IP per hour
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a bit before asking again.' });
  }

  // 3. MONTHLY BUDGET CHECK
  if (monthlyTokensUsed >= MONTHLY_TOKEN_BUDGET) {
    return res.status(503).json({ error: 'Assistant is temporarily unavailable. Please call Nick directly at 440-622-2693.' });
  }

  // 4. PARSE & VALIDATE INPUT
  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message.' });
  }

  if (message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  if (message.length > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: `Message too long. Please keep it under ${MAX_INPUT_CHARS} characters.` });
  }

  // 5. OFF-TOPIC FILTER
  if (isOffTopic(message)) {
    return res.status(200).json({
      reply: "I'm only able to help with questions about Pride Landscaping's services. Feel free to call Nick directly at 440-622-2693!",
    });
  }

  // 6. BUILD MESSAGES — cap history at last 4 exchanges to control costs
  const trimmedHistory = history.slice(-8).map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  const messages = [
    ...trimmedHistory,
    { role: 'user', content: message },
  ];

  // 7. CALL ANTHROPIC API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: MAX_TOKENS_RESPONSE,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ error: 'Something went wrong. Please call 440-622-2693 directly.' });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Sorry, I could not process that. Please call Nick at 440-622-2693.';

    // 8. TRACK TOKEN USAGE
    const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;
    monthlyTokensUsed += tokensUsed;

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please call 440-622-2693 directly.' });
  }
}
