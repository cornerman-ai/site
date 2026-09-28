// Vercel serverless function: POST /api/waitlist
// Adds the signup to Loops as a contact. The confirmation email is a Loop in Loops
// triggered by "Contact added" with userGroup = "waitlist".
// Needs env var LOOPS_API_KEY (Vercel > Project > Settings > Environment Variables).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // Where the signup came from, e.g. "waitlist" or "waitlist/tiktok"
  const utm = body.utm && typeof body.utm === 'object' ? body.utm : {};
  const channel = String(utm.utm_source || utm.ref || '').replace(/[^\w.-]/g, '').slice(0, 40);
  const source = channel ? `waitlist/${channel}` : 'waitlist';

  try {
    const r = await fetch('https://app.loops.so/api/v1/contacts/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source, userGroup: 'waitlist', subscribed: true }),
    });

    // 409 = already on the list: treat as success so people can't probe the list.
    if (r.ok || r.status === 409) return res.status(200).json({ ok: true });

    const detail = await r.text();
    console.error('Loops error', r.status, detail);
    return res.status(502).json({ ok: false, error: 'upstream' });
  } catch (err) {
    console.error('Loops request failed', err);
    return res.status(502).json({ ok: false, error: 'upstream' });
  }
};
