# amboapp.ai

AMBO website (formerly the corner-man.ai site). Static site on Vercel.

- `/waitlist` early access page (`waitlist/index.html`). `/` redirects here for now.
- `/challenge` the AMBO challenge page (`challenge/index.html`): email, then "Now get your score" with the steps and the way to the app (a Download button on phones, a QR code on desktop). Signups go to the same Loops list as the waitlist with `source = challenge` or `challenge/<utm_source>`; short links `/challenge/tt`, `/challenge/ig`, `/challenge/yt`. Not linked anywhere until the challenge build is in the App Store: then set `APP_URL` in the page's script and add `challenge/qr.svg` (a QR code of that link).
- `/privacy` privacy policy (App + website + early access list).
- `/terms` terms of use for the App.
- `/api/waitlist` adds signups to Loops and sends the "Waitlist confirmation" transactional email to new ones (`api/waitlist.js`). Needs `LOOPS_API_KEY` set in Vercel. The confirmation is transactional, not a Loop, so it skips the bulk-mail headers and tracking that land Loop emails in Gmail's Promotions tab. Its wording is edited in Loops (Transactional > Waitlist confirmation), not here.
- Visits, the video and signups are measured by PostHog (EU, cookieless) on `/waitlist` only, sent through PostHog's managed reverse proxy `e.amboapp.ai` (a CNAME at GoDaddy, so ad blockers that block PostHog's own domains don't drop the events): its snippet in the page's `<head>` (the key in `posthog.init` is the project's public token, project 309193 on eu.posthog.com; the project needs *Cookieless server hash mode* on). Events: `video progress` (`reached` = start / 25% / 50% / 75% / end of the first loop) and `waitlist signup` (the link's utm tags, never the email). Cookieless means no countries, no session replay, and a visitor is a new visitor each day. Our own visits: open `amboapp.ai/waitlist/off` once in each browser we use (in-app browsers like Instagram's and TikTok's keep their own storage, so there too) and PostHog stays off there, with "Not tracked on this device" in the footer; `/waitlist/on` undoes it. It is a localStorage flag (`ambo_notrack`), so clearing site data or Safari's 7-day cleanup turns tracking back on: if the footer note is gone, open the link again.

Signups land in Loops with `userGroup = waitlist` and `source = waitlist` or `waitlist/<utm_source>` (e.g. `amboapp.ai/waitlist?utm_source=tiktok`).
Short links for bios and posts redirect to those (`vercel.json`): `/waitlist/yt` → youtube, `/waitlist/tt` → tiktok, `/waitlist/ig` → instagram. A new one is one more line there.

## The video
`waitlist/ambo-waitlist.mp4` (720 x 1280, about 4 MB, muted autoplay loop) with its poster `ambo-waitlist.jpg`, in the
9:16 `.visual` card: beside the copy on desktop, under the signup form on phones. It is a work-in-progress cut of the
demo video (made in the backend repo's demo tools); to replace it, overwrite both files with the same names.

## corner-man.ai
`CNAME` keeps GitHub Pages serving corner-man.ai until that domain is moved to Vercel (then delete `CNAME` and turn off Pages).
