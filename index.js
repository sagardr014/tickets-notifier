const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

// ── Config (set these as environment variables on Render/Railway) ─────────────
const EMAIL_TO       = process.env.EMAIL_TO;        // your email
const EMAILJS_SERVICE  = process.env.EMAILJS_SERVICE;
const EMAILJS_TEMPLATE = process.env.EMAILJS_TEMPLATE;
const EMAILJS_PUBKEY   = process.env.EMAILJS_PUBKEY;
const CHECK_INTERVAL_MS = (parseInt(process.env.CHECK_INTERVAL_MIN) || 5) * 60 * 1000;

// ── Matches to watch ──────────────────────────────────────────────────────────
const MATCHES = [
  {
    id: 1,
    date: "24 Apr",
    name: "RCB vs GT",
    venue: "M. Chinnaswamy, Bengaluru",
    url: "https://shop.royalchallengers.com/ticket",
    note: "7:30 PM IST",
  },
];

// ── Opponent aliases (full name + short code variants) ────────────────────────
const OPPONENT_ALIASES = {
  'gt':  ['gujarat titans', '>gt<', '"gt"', 'gt '],
  'csk': ['chennai super kings', '>csk<', '"csk"', 'csk '],
  'mi':  ['mumbai indians', '>mi<', '"mi"', ' mi '],
  'kkr': ['kolkata knight riders', '>kkr<', '"kkr"', 'kkr '],
  'srh': ['sunrisers hyderabad', '>srh<', '"srh"', 'srh '],
  'dc':  ['delhi capitals', '>dc<', '"dc"', ' dc '],
  'lsg': ['lucknow super giants', '>lsg<', '"lsg"', 'lsg '],
  'rr':  ['rajasthan royals', '>rr<', '"rr"', ' rr '],
  'pbks':['punjab kings', '>pbks<', '"pbks"', 'pbks '],
};

// ── Detection (same 3-rule gate as the HTML tool) ─────────────────────────────
function isTicketsLive(html, match) {
  const opponentKey = match.name.split(' vs ')[1].trim().toLowerCase();
  const aliases = OPPONENT_ALIASES[opponentKey] || [opponentKey];

  // Rule 1 — opponent name/code must appear
  const mentionsOpponent = aliases.some(a => html.includes(a));
  if (!mentionsOpponent) return { live: false, reason: 'opponent name not found on page' };

  // Rule 2 — ticket-flow UI keywords must be present
  const ticketUI = [
    'select stand', 'choose stand', 'stand ticket',
    'enclosure', 'seat category', 'select seats',
    'proceed to checkout', 'ticket category',
  ];
  const matchedUI = ticketUI.filter(s => html.includes(s));
  if (matchedUI.length === 0) return { live: false, reason: 'no ticket-UI keywords found' };

  // Rule 3 — must not be blocked/sold-out
  const blockers = ['coming soon', 'notify me when available', 'sold out', 'tickets unavailable', 'sale not started'];
  const blocker = blockers.find(s => html.includes(s));
  if (blocker) return { live: false, reason: `blocked — page says: "${blocker}"` };

  return { live: true, reason: `matched opponent + [${matchedUI.slice(0, 2).join(', ')}]` };
}

// ── Email via EmailJS REST API ────────────────────────────────────────────────
async function sendEmail(match) {
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE,
        template_id: EMAILJS_TEMPLATE,
        user_id:     EMAILJS_PUBKEY,
        template_params: {
          to_email:   EMAIL_TO,
          match_name: match.name,
          match_date: match.date,
          venue:      match.venue,
          ticket_url: match.url,
        },
      }),
    });
    if (res.ok) {
      log(`✅ Email sent to ${EMAIL_TO}`);
    } else {
      const text = await res.text();
      log(`❌ Email failed (${res.status}): ${text}`);
    }
  } catch (e) {
    log(`❌ Email error: ${e.message}`);
  }
}

// ── Fetch page HTML via allorigins proxy ──────────────────────────────────────
async function fetchPage(url) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&t=${Date.now()}`;
  const res = await fetch(proxyUrl, { timeout: 15000 });
  const data = await res.json();
  return (data.contents || '').toLowerCase();
}

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[${now}]  ${msg}`);
}

// ── Tracks which matches have already triggered an alert ──────────────────────
const alerted = new Set();

// ── Main check loop ───────────────────────────────────────────────────────────
async function checkTickets() {
  log('--- Checking tickets ---');

  for (const match of MATCHES) {
    if (alerted.has(match.id)) continue; // already notified, skip

    try {
      const html = await fetchPage(match.url);
      const { live, reason } = isTicketsLive(html, match);

      if (live) {
        log(`🎟️  TICKETS LIVE for ${match.name}! Reason: ${reason}`);
        await sendEmail(match);
        alerted.add(match.id);
      } else {
        log(`${match.name} — not live yet (${reason})`);
      }
    } catch (e) {
      log(`❌ Error checking ${match.name}: ${e.message}`);
    }
  }

  // If all matches have been alerted, no point running further
  if (alerted.size === MATCHES.length) {
    log('All matches alerted. Stopping.');
    process.exit(0);
  }
}

// ── Validate env vars before starting ────────────────────────────────────────
function validateConfig() {
  const required = { EMAIL_TO, EMAILJS_SERVICE, EMAILJS_TEMPLATE, EMAILJS_PUBKEY };
  const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    console.error('Set them in your Render/Railway dashboard under Environment Variables.');
    process.exit(1);
  }
}

// ── Kick off ──────────────────────────────────────────────────────────────────
validateConfig();
log(`🚀 RCB Ticket Alert started — checking every ${CHECK_INTERVAL_MS / 60000} min`);
log(`📧 Alerts → ${EMAIL_TO}`);
log(`🏏 Watching: ${MATCHES.map(m => m.name).join(', ')}`);

checkTickets(); // run immediately on start
setInterval(checkTickets, CHECK_INTERVAL_MS);

// Keep the process alive on Render (required for free tier web services)
const http = require('http');
http.createServer((req, res) => res.end('RCB Alert running ✅')).listen(process.env.PORT || 3000);
