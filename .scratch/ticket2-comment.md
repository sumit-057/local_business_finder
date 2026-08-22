Implemented in commit 9aeb2f5.

- Next.js 16 + TS scaffold, Tailwind v4, shadcn/ui, motion installed
- Dark-premium palette: single violet accent, gradient-mesh + noise backdrop
- Brand bar + custom SVG logomark, token-driven and replaceable
- Responsive app shell: search / results / map regions
- lint + typecheck pass; production build green and Vercel-ready

Remaining for this ticket: live Vercel URL — owner deploys.

Code-review findings addressed: typecheck script added, brand name centralized into one constant, duplicate .dark palette removed, logomark colors tokenized, heading gradient normalized to a single accent hue.
