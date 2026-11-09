// Google Apps Script, run from the mathe@amboapp.ai account (script.google.com). Every 10 minutes, anyone on the
// Loops list who emailed this inbox (a reply to the welcome email or any other) gets repliedAt set, which keeps them
// out of the footage invite (the campaign and both emails of the workflow filter on repliedAt being empty).
// Setup: paste this into a new project, add LOOPS_API_KEY under Project Settings > Script properties, then run
// setup() once: it asks for Gmail access, marks everyone who already replied and adds the 10-minute trigger.

const START = '2026/09/01'; // before the waitlist opened

function setup() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  const now = Math.floor(Date.now() / 1000);
  markSince('after:' + START);
  PropertiesService.getScriptProperties().setProperty('LAST_RUN', String(now));
  ScriptApp.newTrigger('markReplies').timeBased().everyMinutes(10).create();
}

function markReplies() {
  const props = PropertiesService.getScriptProperties();
  const now = Math.floor(Date.now() / 1000);
  markSince('after:' + (Number(props.getProperty('LAST_RUN')) - 15 * 60)); // overlap, so nothing falls between runs
  props.setProperty('LAST_RUN', String(now));
}

// Marks each sender of a message in the matching threads with the date of their first message there.
function markSince(when) {
  const me = Session.getActiveUser().getEmail().toLowerCase();
  const firstSeen = new Map();
  for (let start = 0; ; start += 100) {
    const threads = GmailApp.search(when + ' -in:chats -in:spam', start, 100);
    threads.forEach((t) => t.getMessages().forEach((m) => {
      const email = senderOf(m);
      if (!email || email === me || isAutoReply(m)) return;
      const at = m.getDate().getTime();
      if (!firstSeen.has(email) || at < firstSeen.get(email)) firstSeen.set(email, at);
    }));
    if (threads.length < 100) break;
  }
  firstSeen.forEach((at, email) => mark(email, at));
}

function senderOf(m) {
  const from = m.getFrom();
  const angle = from.match(/<([^>]+)>/);
  return (angle ? angle[1] : from).trim().toLowerCase();
}

// Out-of-office and other automatic answers aren't a reply from the person.
function isAutoReply(m) {
  const auto = (m.getHeader('Auto-Submitted') || 'no').toLowerCase();
  return auto !== 'no' || !!m.getHeader('X-Autoreply') ||
    /^(auto(matic)?[ -]?reply|out of (the )?office)/i.test(m.getSubject());
}

// Only people already on the list, and only once: nobody new is added to Loops here.
function mark(email, at) {
  const found = loops('get', 'contacts/find?email=' + encodeURIComponent(email));
  const contact = found && found[0];
  if (!contact || contact.repliedAt) return;
  if (loops('put', 'contacts/update', { email, repliedAt: at })) console.log('repliedAt set for', email);
}

function loops(method, path, body) {
  Utilities.sleep(150); // Loops allows 10 requests a second
  const r = UrlFetchApp.fetch('https://app.loops.so/api/v1/' + path, {
    method,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + PropertiesService.getScriptProperties().getProperty('LOOPS_API_KEY') },
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() >= 300) {
    console.error(method, path, r.getResponseCode(), r.getContentText());
    return null;
  }
  return JSON.parse(r.getContentText());
}
