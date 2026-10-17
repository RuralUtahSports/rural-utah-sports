# 2026 RUS Playoff Pick’em

## Public page
- `playoff-pickem.html`: dynamic, interactive, four-column bracket, phone-swipable; fans select winners which advance through each round.
- Source-of-truth matchups: `official-brackets-2026.json` (8-Player through 6A).
- Original logos and team colors: `official-bracket-team-assets.js`; names remain visible if assets fail.
- `playoff-pickem.js`: picks kept locally until users submit; share links encode selections, and the Instagram card shows the seven predicted champions.

## Public fan challenge
- Backend: deployed Supabase Edge Function `playoff-pickem`, with versioned source at `supabase/functions/playoff-pickem/index.ts`.
- Database: `public.playoff_pick_entries` in the existing **Rural Utah Sports** Supabase project; created using migration `create_2026_playoff_pickem_entries`.
- Fan name 2–24 characters; unique case-insensitively. Browser generates a random 256-bit entry token; backend stores **only SHA-256 hash**. The secret token is never returned on the leaderboard.
- Public RLS access is **denied** to entry rows. Edge Function holds the service-role key in environment variables; never put it into client code.
- Picks are mutable until **the first listed kickoff of the classification**, based on official matchups in America/Denver. Once a class locks, existing submitted picks for that class cannot be altered; open classes remain editable.
- Leaderboard scoring automatically reads the current main-branch official bracket feed and the weekly-simulation final-results feed. Only **confirmed winners** score: 1 pt opening round, 2 pts quarterfinals, 4 pts semifinals, 8 pts championship. Byes do not score.
- Leaderboard: publicly displays fan name, points, correct picks, and champions correctly picked. No fan email or personal records are collected.
- A shared bracket URL is a preview/copy of picks, not a submitted entry.
- This is a **fan challenge**, not an official UHSAA contest or prize competition.

## Operations
- Merge this branch to publish the front-end page and homepage/official playoff/nav links. The Edge Function is already deployed.
- Verify 2026 postseason finals enter `official-brackets-2026.json` with a `winner` flag, `final` score, or `actualWinner` in `weekly-simulation.json`. **Scores do not change until final results reach these feeds.**
- To update edge logic: edit `supabase/functions/playoff-pickem/index.ts` and redeploy that function; do not expose service-role credentials.
- To check whether public entries work, submit a test entry from the deployed browser page and confirm leaderboard displays it. The test account can be kept as a normal fan entry; there is no admin reset UI yet.
- This lightweight fun contest uses token-based update authorization, not verified fan accounts. A fan could create multiple names; for prizes, implement verified accounts, abuse protection and contest terms first.
