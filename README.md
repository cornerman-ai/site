# amboapp.ai

AMBO website (formerly the corner-man.ai site). Static site on Vercel.

- `/waitlist` early access page (`waitlist/index.html`). `/` redirects here for now.
- `/privacy` privacy policy (App + website + early access list).
- `/terms` terms of use for the App.
- `/api/waitlist` adds signups to Loops (`api/waitlist.js`). Needs `LOOPS_API_KEY` set in Vercel.
- Visits are counted by Vercel Web Analytics (no cookies): the `/_vercel/insights/script.js` tag in each page's `<head>`, seen in the Vercel project's Analytics tab (it must be enabled there). The waitlist video sends a custom event `Video` with `reached` = start / 25% / 50% / 75% / end for its first loop (custom events need Vercel Pro).

Signups land in Loops with `userGroup = waitlist` and `source = waitlist` or `waitlist/<utm_source>` (e.g. `amboapp.ai/waitlist?utm_source=tiktok`).
Short links for bios and posts redirect to those (`vercel.json`): `/waitlist/yt` → youtube, `/waitlist/tt` → tiktok, `/waitlist/ig` → instagram. A new one is one more line there.

## The video
`waitlist/ambo-waitlist.mp4` (720 x 1280, about 4 MB, muted autoplay loop) with its poster `ambo-waitlist.jpg`, in the
9:16 `.visual` card: beside the copy on desktop, under the signup form on phones. It is a work-in-progress cut of the
demo video (made in the backend repo's demo tools); to replace it, overwrite both files with the same names.

## corner-man.ai
`CNAME` keeps GitHub Pages serving corner-man.ai until that domain is moved to Vercel (then delete `CNAME` and turn off Pages).
