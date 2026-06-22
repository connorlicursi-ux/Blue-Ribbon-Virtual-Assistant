// Blue Ribbon Yard Care AI Assistant — Vercel Serverless Proxy
// Protections: API key hidden, rate limiting, token budget, domain lock, input validation

const ALLOWED_ORIGINS = [
  'https://blueribbonlandscaping.lovable.app',
  'https://blueribbonyardcare.com',
  'http://localhost:3000',
];

const MAX_INPUT_CHARS = 400;
const MAX_TOKENS_RESPONSE = 180;
const MAX_REQUESTS_PER_IP_PER_HOUR = 10;
const MONTHLY_TOKEN_BUDGET = 75000;

const ipRequestLog = {};
let monthlyTokensUsed = 0;

const SYSTEM_PROMPT = `You are the virtual assistant for Blue Ribbon Yard Care LLC, a locally owned lawn care company in Hudson, Ohio run by Landon Stelmarski. Your job is to help visitors learn about services and nudge them toward getting a free quote or calling Landon.

You only answer questions about Blue Ribbon Yard Care. If someone asks something unrelated, politely redirect them.

ABOUT BLUE RIBBON YARD CARE:
- Owner: Landon Stelmarski, Hudson, Ohio
- Founded: 2023
- Named in memory of Landon's late father, who inspired the business
- A portion of profits is donated each year to colorectal cancer research (colorectalcancer.org)
- Philosophy: hardworking, detail-oriented, locally owned — the person you hire is the person doing the work
- Service area: Hudson, OH and surrounding Summit County — Twinsburg, Macedonia, Aurora, Munroe Falls, Boston Heights

SERVICES:
1. Mowing — Weekly mowing, weed whacking, edging sidewalks, and blowing off all walkways and the driveway after every visit.
2. Spring Cleanup — Yard and bed cleanup, precise bush trimming, targeted weed killer application, and removal of larger weeds.
3. Fall Cleanup — Leaf removal from yard and beds, either hauled away or prepped for city pickup. Includes bush trimming.
4. Mulching — Full mulch process handled start to finish: purchasing, bed edging, and spreading.
5. Bed Edging — Crisp, clean bed edges that define the landscape and frame fresh mulch.
6. Bush Trimming — Precise trimming included with spring and fall cleanup visits.
7. Leaf Removal — Leaves cleared from yard and beds, hauled away or prepped for city pickup.
8. Weed Control — Targeted weed killer application and removal of larger weeds during spring cleanup.

CONTACT:
- Phone: 234-380-2407
- Email: landon@blueribbonyardcare.com
- All estimates are free, no obligation
- Landon handles every quote personally

HOW TO RESPOND:
- Write like a real person texting back, not a customer service bot
- Never use bullet points, dashes, bold text, headers, or any markdown formatting
- Keep it to 2 to 3 sentences maximum every time
- Answer the question simply and naturally first, then end with one casual mention of a free quote if it fits
- Never list multiple contact options — if you mention contact info, just say to call Landon at 234-380-2407
- Never ask the customer to choose between options at the end of your message
- Sound like a friendly, down to earth local business owner`;

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (monthlyTokensUsed >= MONTHLY_TOKEN_BUDGET) {
    return res.status(429).json({ error: 'Monthly limit reached. Please call us at 234-380-2407.' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!ipRequestLog[ip]) ipRequestLog[ip] = [];
  ipRequestLog[ip] = ipRequestLog[ip].filter(t => now - t < oneHour);

  if (ipRequestLog[ip].length >= MAX_REQUESTS_PER_IP_PER_HOUR) {
    return res.status(429).json({ error: 'Too many requests. Please call us at 234-380-2407.' });
  }

  ipRequestLog[ip].push(now);

  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const trimmedMessage = message.trim().slice(0, MAX_INPUT_CHARS);
  if (!trimmedMessage) return res.status(400).json({ error: 'Empty message' });

  const messages = [
    ...(Array.isArray(history) ? history.slice(-6) : []),
    { role: 'user', content: trimmedMessage }
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: MAX_TOKENS_RESPONSE,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({ error: 'Assistant unavailable. Please call us at 234-380-2407.' });
    }

    if (data.usage) {
      monthlyTokensUsed += (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
    }

    const reply = data.content?.[0]?.text || "Not sure about that one — give Landon a call at 234-380-2407.";
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please call us at 234-380-2407.' });
  }
}
