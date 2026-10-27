// Vercel serverless function: POST /api/waitlist
// Adds the signup to Loops as a contact, then sends the confirmation email as a Loops
// transactional email ("Waitlist confirmation"), so it skips the bulk-mail headers and
// tracking that put a Loop email in Gmail's Promotions tab. The contact property
// waitlistConfirmationSent records that it went out, so someone who signs up again gets it
// once if they never did (an earlier send failed, or they joined before it existed).
// Needs env var LOOPS_API_KEY (Vercel > Project > Settings > Environment Variables).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_ID = 'cmvnfqng50uj10jzzesogge8o'; // app.loops.so/transactional/<id>

function loops(key, method, path, body) {
  return fetch(`https://app.loops.so/api/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
}

// They're on the list either way, so a failed confirmation is only logged.
async function sendConfirmation(key, email) {
  try {
    const t = await loops(key, 'POST', 'transactional', { transactionalId: CONFIRMATION_ID, email });
    if (!t.ok) return console.error('Loops confirmation error', t.status, await t.text());
    const u = await loops(key, 'PUT', 'contacts/update', { email, waitlistConfirmationSent: true });
    if (!u.ok) console.error('Loops confirmation mark error', u.status, await u.text());
  } catch (err) {
    console.error('Loops confirmation failed', err);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Only our own pages may sign people up (each signup emails the address): browsers always send
  // Origin on a POST, so other sites and bare scripts are turned away before Loops sends anything.
  let originHost = '';
  try { originHost = new URL(req.headers.origin).host; } catch {}
  if (!originHost || originHost !== req.headers.host) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
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

  // Where the signup came from: the page, the platform and, from a per-account bio link, the account's content
  // style, e.g. "waitlist", "waitlist/tiktok" or "waitlist/instagram/2d-explainer"
  const utm = body.utm && typeof body.utm === 'object' ? body.utm : {};
  const clean = (v) => String(v || '').replace(/[^\w.-]/g, '').slice(0, 40);
  const page = body.source === 'challenge' ? 'challenge' : 'waitlist';
  const source = [page, clean(utm.utm_source || utm.ref), clean(utm.utm_campaign)].filter(Boolean).join('/');

  try {
    const r = await loops(key, 'POST', 'contacts/create', { email, source, userGroup: 'waitlist', subscribed: true });

    if (r.ok) {
      await sendConfirmation(key, email);
      return res.status(200).json({ ok: true });
    }

    // 409 = already on the list: treat as success so people can't probe the list. Signing up
    // again resubscribes someone who had unsubscribed, and sends the confirmation if they never got it.
    if (r.status === 409) {
      try {
        const f = await loops(key, 'GET', `contacts/find?email=${encodeURIComponent(email)}`);
        if (!f.ok) throw new Error(`find ${f.status}: ${await f.text()}`);
        const contact = (await f.json())[0];
        if (contact && !contact.subscribed) {
          const u = await loops(key, 'PUT', 'contacts/update', { email, subscribed: true });
          if (!u.ok) console.error('Loops resubscribe error', u.status, await u.text());
        }
        if (contact && !contact.waitlistConfirmationSent) await sendConfirmation(key, email);
      } catch (err) {
        console.error('Loops existing contact failed', err);
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
