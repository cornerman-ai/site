# amboapp.ai

AMBO website (formerly the corner-man.ai site). Static site on Vercel.

- `/waitlist` early access page (`waitlist/index.html`). `/` redirects here for now.
- `/privacy` privacy policy (App + website + early access list).
- `/terms` terms of use for the App.
- `/api/waitlist` adds signups to Loops (`api/waitlist.js`). Needs `LOOPS_API_KEY` set in Vercel.

Signups land in Loops with `userGroup = waitlist` and `source = waitlist` or `waitlist/<utm_source>` (e.g. `amboapp.ai/waitlist?utm_source=tiktok`).

## Adding the video
Put `ambo-waitlist.mp4` (+ a poster `.jpg`) in `waitlist/`, then in `waitlist/index.html` replace the contents of `<div class="visual">` with:

```html
<video src="ambo-waitlist.mp4" poster="ambo-waitlist.jpg" autoplay muted loop playsinline></video>
```

## corner-man.ai
`CNAME` keeps GitHub Pages serving corner-man.ai until that domain is moved to Vercel (then delete `CNAME` and turn off Pages).
