// Vercel serverless function: GET /beta/em?e=<email> (rewritten here in vercel.json)
// The link in the "Early test access granted" email to the early access list. Marks the contact in Loops as having
// opened it (betaClickedAt, set on the first click only), so the reminder and any later beta emails skip them, then
// sends them on to the beta page. Without a known email it just sends them on.
// Needs env var LOOPS_API_KEY (Vercel > Project > Settings > Environment Variables).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOOPS = 'https://app.loops.so/api/v1';

module.exports = async function handler(req, res) {
  const key = process.env.LOOPS_API_KEY;
  // A "+" in an unencoded address arrives as a space, and an email address never has one
  const email = String((req.query && req.query.e) || '').trim().replace(/ /g, '+').toLowerCase();

  if (key && EMAIL_RE.test(email) && email.length <= 254) {
    try {
      const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
      const found = await fetch(`${LOOPS}/contacts/find?email=${encodeURIComponent(email)}`,
        { headers, signal: AbortSignal.timeout(3000) });
      const contact = found.ok ? (await found.json())[0] : null;
      // Only contacts already on the list (update would create a new one), and only the first click
      if (contact && !contact.betaClickedAt) {
        const r = await fetch(`${LOOPS}/contacts/update`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ email, betaClickedAt: new Date().toISOString() }),
          signal: AbortSignal.timeout(3000),
        });
        if (!r.ok) console.error('Loops update error', r.status, await r.text());
      }
    } catch (err) {
      // They still get the beta page; the worst case is one reminder they didn't need.
      console.error('Loops beta click failed', err);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', '/beta?utm_source=email');
  return res.status(302).end();
};
