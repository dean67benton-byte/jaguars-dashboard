# Game Day brief routine

Instructions for the scheduled Claude routine that writes South Alabama
**football** briefs. Basketball briefs are OFF unless `docs/routine-config.json`
has `"basketball": true` (Dean turns this on by asking Claude).

The routine runs three times a day (times Central):
8:00 AM (preview / game-morning update), 10:30 PM and 12:30 AM (postgame grade).
Most runs find nothing to do. Check cheaply first and stop as soon as you know
nothing is due: read `public/data/football.json` and `public/briefs/index.json`
before doing any web research.

## Decide what is due

Let `next` be the first football event with `status != "post"` and `last` the
most recent event with `status == "post"` (also treat an event whose kickoff
was more than 4 hours ago as possibly final; confirm on ESPN).

1. **Preview** — kickoff of `next` is 30 to 60 hours away and there is no
   brief for it in the index → write the full preview.
2. **Game-morning update** — kickoff of `next` is today (Central) and its
   brief has no `reminder` → add a short reminder.
3. **Postgame grade** — a game finished today or last night, its brief has
   no `grade`, and final team stats are posted (ESPN box score or
   usajaguars.com recap) → grade it. If stats are not posted yet, stop; the
   next run will try again.
4. Otherwise → do nothing, make no commit, end.

## Writing

Files: `public/briefs/<YYYY-MM-DD>-<opponent-slug>.json` (shape: `Brief` in
`src/lib/types.ts`) and the matching entry in `public/briefs/index.json`
(shape: `BriefIndexEntry`; keep `status`, `pick` and `letter` in sync).
`public/briefs/2026-10-20-marshall.json` is the reference example.

Preview content, modeled on Dean's Marshall brief:
- headline (one line), summary, both records
- matchup table, 5 to 7 rows, each with USA, opponent, edge, and why it matters
- keys to the game for each side, players to watch (2 per side), what to watch for
- key injuries, expected weather (forecast for kickoff at the venue), each team's last game
- final score pick, confidence (Low / Medium / High), reasoning, what could make it wrong
- context (series history, notable facts) and every source used, with URLs
- **No betting lines** in phase 1.

Game-morning reminder: 2 to 4 notes on injury news, the weather update, and
anything that changed since the preview.

Postgame grade: final score, `winnerCorrect`, `marginOff` =
|predicted margin − actual margin|, `totalOff` = |predicted total − actual
total|, a letter grade (A to F) weighing winner, margin, total and how many
keys held up, a 2 to 3 sentence summary, every key with hit/miss and one line
of evidence, the players to watch with what they did, what the brief missed,
and sources. Set `status` to `final` in the brief and the index.

Use only facts you found in sources; write "not found" rather than guessing.
Times are Central. Validate JSON (`node -e "JSON.parse(require('fs').readFileSync(f))"`)
and run `npm run build` before committing.

## Commit

Commit to `main` with a message like `Brief: preview vs Marshall` and push.
The push triggers the Update data workflow, which redeploys the site.
