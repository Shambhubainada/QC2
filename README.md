# Godown Stock Dashboard – Final Fixed

Upload `index.html` to GitHub Pages.

Fixed logic:
- Fumigation Due: ONLY stacks having a non-blank LAST FUMIGATION date and more than 30 days. Blank LAST FUMIGATION is never shown as due.
- Under Cover: occupied stacks with Fumigation Date present and Degassing Date blank. A stack can appear in both Under Cover and Fumigation Due when both conditions are true.
- Wheat Priority: FIFO by Receipt Date, oldest first.
- Rice Priority: FIFO by Receipt Date, oldest first; FRK/RRA included.
- All four queues are visible on the Home page and update from the live Google Sheet.
