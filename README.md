# Meta Receipt Generator

Standalone single-page web app that generates Meta-style invoice PDFs from campaign data.

Hosted at: `receipt.wetrademarketing.com`

## What it does

- Lets you input account info (Account Name, ID, Payment Method, etc.)
- Manual or bulk-paste campaign rows (campaign name, impressions, amount)
- Generates a pixel-accurate Meta-format PDF receipt
- Runs entirely in the browser — no server, no database
- Account info auto-saves to `localStorage` so you don't re-enter every time

## Tech stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- jsPDF (PDF generation)
- Inter font + Meta logo (embedded as base64)

## Deploy

1. Push this repo to GitHub
2. Import the repo into Vercel (no env vars needed — there's no backend)
3. Add a custom domain `receipt.wetrademarketing.com` in Vercel settings
4. Add a CNAME DNS record pointing `receipt` to `cname.vercel-dns.com`

## Local development

```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

## Project structure

```
app/
  globals.css   - Global styles (Tailwind + theme)
  layout.js     - Root HTML layout
  page.js       - Main receipt generator UI
lib/
  meta-receipt.js     - PDF generation logic (shared with main dashboard)
  receipt-assets.js   - Inter font + Meta logo as base64
```

## Notes

- The `lib/` folder is identical to the equivalent folder in the main `meta-daily-spending-tracker` repo. If you tweak receipt PDF logic, update both repos.
- No data leaves the browser. Account info is stored only in `localStorage`.
- Campaign rows are NOT persisted — they're per-receipt.
