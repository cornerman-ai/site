// Vercel serverless function: POST /api/waitlist
// Adds the signup to Loops as a contact, then sends the confirmation email as a Loops
// transactional email ("Waitlist confirmation"), so it skips the bulk-mail headers and
// tracking that put a Loop email in Gmail's Promotions tab.
// Needs env var LOOPS_API_KEY (Vercel > Project > Settings > Environment Variables).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_ID = 'cmvnfqng50uj10jzzesogge8o'; // app.loops.so/transactional/<id>

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const key = process.env.LOOPS_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }

  // Where the signup came from, e.g. "waitlist", "waitlist/tiktok" or "challenge/instagram"
  const utm = body.utm && typeof body.utm === 'object' ? body.utm : {};
  const channel = String(utm.utm_source || utm.ref || '').replace(/[^\w.-]/g, '').slice(0, 40);
  const page = body.source === 'challenge' ? 'challenge' : 'waitlist';
  const source = channel ? `${page}/${channel}` : page;

  try {
    const r = await fetch('https://app.loops.so/api/v1/contacts/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source, userGroup: 'waitlist', subscribed: true }),
    });

    // 409 = already on the list: treat as success so people can't probe the list,
    // and don't send the confirmation again.
    if (r.status === 409) return res.status(200).json({ ok: true });

    if (r.ok) {
      // They're on the list either way, so a failed confirmation is only logged.
      try {
        const t = await fetch('https://app.loops.so/api/v1/transactional', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionalId: CONFIRMATION_ID, email }),
        });
        if (!t.ok) console.error('Loops confirmation error', t.status, await t.text());
      } catch (err) {
        console.error('Loops confirmation failed', err);
      }
      return res.status(200).json({ ok: true });
    }

    const detail = await r.text();
    console.error('Loops error', r.status, detail);
    return res.status(502).json({ ok: false, error: 'upstream' });
  } catch (err) {
    console.error('Loops request failed', err);
    return res.status(502).json({ ok: false, error: 'upstream' });
  }
};
