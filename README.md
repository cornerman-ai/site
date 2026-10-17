# amboapp.ai

AMBO website (formerly the corner-man.ai site). Static site on Vercel.

- `/waitlist` early access page (`waitlist/index.html`). `/` redirects here for now.
- `/privacy` privacy policy (App + website + early access list).
- `/terms` terms of use for the App.
- `/api/waitlist` adds signups to Loops (`api/waitlist.js`). Needs `LOOPS_API_KEY` set in Vercel.
- Visits, the video and signups are measured by PostHog (EU, cookieless) on `/waitlist` only: its snippet in the page's `<head>` (the key in `posthog.init` is the project's public token, project 309193 on eu.posthog.com; the project needs *Cookieless server hash mode* on). Events: `video progress` (`reached` = start / 25% / 50% / 75% / end of the first loop) and `waitlist signup` (the link's utm tags, never the email). Cookieless means no countries, no session replay, and a visitor is a new visitor each day.

Signups land in Loops with `userGroup = waitlist` and `source = waitlist` or `waitlist/<utm_source>` (e.g. `amboapp.ai/waitlist?utm_source=tiktok`).
Short links for bios and posts redirect to those (`vercel.json`): `/waitlist/yt` → youtube, `/waitlist/tt` → tiktok, `/waitlist/ig` → instagram. A new one is one more line there.

## The video
`waitlist/ambo-waitlist.mp4` (720 x 1280, about 4 MB, muted autoplay loop) with its poster `ambo-waitlist.jpg`, in the
9:16 `.visual` card: beside the copy on desktop, under the signup form on phones. It is a work-in-progress cut of the
demo video (made in the backend repo's demo tools); to replace it, overwrite both files with the same names.

## corner-man.ai
`CNAME` keeps GitHub Pages serving corner-man.ai until that domain is moved to Vercel (then delete `CNAME` and turn off Pages).
