# Pride Landscaping AI Assistant — Setup Guide

## What this is
A secure AI chat widget for Pride Landscaping's website.
- Your Anthropic API key stays hidden on a server you control
- Rate limiting, token budgets, and domain locking protect against abuse
- Costs pennies per month at expected usage

---

## Project Structure
```
pride-assistant/
  api/
    chat.js          ← Vercel serverless function (your protected proxy)
  widget/
    PrideChatWidget.jsx  ← React component to embed on the site
  vercel.json
  package.json
  .env.example
  .gitignore
```

---

## Step 1 — Deploy the proxy to Vercel

1. Create a free account at vercel.com
2. Install Vercel CLI: `npm i -g vercel`
3. In this folder, run: `vercel`
4. Follow the prompts — choose "new project"
5. After deploy, go to your Vercel dashboard → Settings → Environment Variables
6. Add: `ANTHROPIC_API_KEY` = your actual key
7. Redeploy once after adding the env var

Your proxy URL will be: `https://your-project-name.vercel.app/api/chat`

---

## Step 2 — Lock it to Pride's domain

In `api/chat.js`, update the ALLOWED_ORIGINS array:
```js
const ALLOWED_ORIGINS = [
  'https://pride-yardworks.lovable.app',     // current Lovable URL
  'https://pridelandscaping.com',            // real domain when purchased
];
```
Remove the localhost entry for production.

---

## Step 3 — Add the widget to Lovable

1. Copy the contents of `widget/PrideChatWidget.jsx`
2. In Lovable, create a new file called `PrideChatWidget.jsx`
3. Paste the component code
4. Update the `PROXY_URL` constant at the top to your Vercel URL
5. Import and add `<PrideChatWidget />` at the bottom of App.jsx, inside the root div

In Lovable prompt:
> Add the PrideChatWidget component. Import it at the top of App.jsx and place <PrideChatWidget /> as the last element inside the root return div, after the footer.

---

## Step 4 — Set your monthly budget

In `api/chat.js`, adjust this value:
```js
const MONTHLY_TOKEN_BUDGET = 75000;
```

At Claude Haiku pricing (~$0.0004 per 1K tokens):
- 75,000 tokens ≈ $0.03/month
- 500,000 tokens ≈ $0.20/month
- Set whatever you're comfortable with

For persistent tracking across deployments, upgrade to Upstash Redis (free tier available).

---

## Current Protections

| Protection | Setting |
|---|---|
| API key exposure | Never touches browser — server only |
| Allowed domains | Whitelist only |
| Rate limit | 10 requests per IP per hour |
| Input length | Max 400 characters |
| Response length | Max 180 tokens |
| Monthly budget | 75,000 tokens then shuts off |
| Off-topic filter | Blocks jailbreak attempts, unrelated requests |
| History window | Last 4 exchanges only (cost control) |
| Session limit | 10 messages per visit (widget-side) |

---

## Adjusting Settings

All limits are at the top of `api/chat.js`:
```js
const MAX_INPUT_CHARS = 400;
const MAX_TOKENS_RESPONSE = 180;
const MAX_REQUESTS_PER_IP_PER_HOUR = 10;
const MONTHLY_TOKEN_BUDGET = 75000;
```

---

## Business Model

This is a reusable asset. For every landscaping client after Pride:
- Duplicate this repo
- Update ALLOWED_ORIGINS to their domain
- Update the SYSTEM_PROMPT with their info
- Deploy a new Vercel project (free tier)
- Charge $200–400 setup + include in retainer

30 minutes of work per client after the first one.

---

## Cost Estimate (Pride Landscaping)

Assuming 200 conversations/month, 5 messages each:
- ~1,000 API calls × ~300 tokens avg = 300,000 tokens
- At Haiku pricing: ~$0.12/month
- Well within free Vercel tier
- Your $0.12 cost, charge client $20–30/month as part of retainer
