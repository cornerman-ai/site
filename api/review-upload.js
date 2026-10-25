// Vercel serverless function: POST /api/review-upload
// The /review page uploads videos straight from the browser to Vercel Blob. This function gives out the
// upload token (only to our own pages, only for videos up to 5 GB) and, when Vercel Blob reports the upload
// finished, posts the video to Slack and sends the "Footage received" email.
// Needs BLOB_READ_WRITE_TOKEN (added when a Blob store is connected to the project), SLACK_WEBHOOK_URL and
// LOOPS_API_KEY (Vercel > Project > Settings > Environment Variables).

const { handleUpload } = require('@vercel/blob/client');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BYTES = 5 * 1024 * 1024 * 1024; // keep in sync with review/index.html
const RECEIPT_ID = 'cmvnse04f0b4h0j130jqv28nj'; // app.loops.so/transactional/<id> ("Footage received")

// Slack mrkdwn treats &, < and > as markup
const slackEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function notifySlack(email, url) {
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (!hook) return console.error('SLACK_WEBHOOK_URL not set; new footage from', email, url);
  try {
    const r = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `New footage to review from ${slackEscape(email)}\n<${url}|Watch the video>` }),
    });
    if (!r.ok) console.error('Slack error', r.status, await r.text());
  } catch (err) {
    console.error('Slack request failed', err);
  }
}

async function sendReceipt(email) {
  try {
    const r = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.LOOPS_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionalId: RECEIPT_ID, email }),
    });
    if (!r.ok) console.error('Loops receipt error', r.status, await r.text());
  } catch (err) {
    console.error('Loops receipt failed', err);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // The token request comes from the page, so only our own pages get one (browsers always send Origin on a
  // POST). The completion call comes from Vercel Blob, without an Origin; handleUpload checks its signature.
  if (body.type === 'blob.generate-client-token') {
    let originHost = '';
    try { originHost = new URL(req.headers.origin).host; } catch {}
    if (!originHost || originHost !== req.headers.host) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const email = String(JSON.parse(clientPayload || '{}').email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email) || email.length > 254) throw new Error('invalid_email');
        if (!pathname.startsWith('review/')) throw new Error('invalid_pathname');
        return {
          allowedContentTypes: ['video/*'],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true, // the link is unguessable: only whoever gets it from Slack can watch
          tokenPayload: JSON.stringify({ email }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { email } = JSON.parse(tokenPayload);
        await Promise.all([notifySlack(email, blob.url), sendReceipt(email)]);
      },
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Review upload error', err);
    return res.status(400).json({ ok: false, error: String((err && err.message) || err) });
  }
};
