# Sunday routine

Instructions for the weekly Claude routine that runs **Sunday at 8:15 AM
Central**. It is one run a week that handles every written section, so Claude
usage stays low. Each section has an on/off switch under `sunday` in
`docs/routine-config.json`; a section that is off, or has nothing new, is
skipped without any web research. If every section is skipped, end with no
commit.

Sections, in order:

1. Sun Belt power rankings (`rankingBlurbs`), below.
2. Jaguars in the NFL grades (`nflGrades`), below.
3. Coaching outlook (`coachingOutlook`), below.

## 1. Sun Belt power rankings

The Update data workflow posts a formula ranking every Sunday from 6 AM
Central into `public/data/rankings.json` (written by `scripts/rankings.mjs`;
shape: `Rankings` in `src/lib/types.ts`). For each sport (`football`, `mbb`):

- Take `weeks[0]`. If it is not dated today (Central), or its `source` is
  already `claude`, skip that sport. Basketball is ranked once its season has
  started; if `mbb` is missing, skip it.
- Read last week's games for the conference: each row's `last` result,
  ESPN scores and recaps for the week. Keep research short: one ESPN
  scoreboard look per sport plus a recap for any surprising result.
- You may move a team **at most two spots** from its `formulaRank`, only for
  a stated reason (key injury, quality of win or loss, a result the formula
  over- or under-rates). Write that reason in `adjust` (one sentence). Leave
  `formulaRank` and `score` unchanged, renumber `rank` 1 to N with no gaps,
  and keep `rows` sorted by `rank`.
- Write a `blurb` for every team: one or two sentences, under 40 words,
  about the week's result and what it means. Plain, specific, no hype. Use
  only facts from sources. **No betting lines.**
- Set `source` to `claude` and `updatedAt` to now.

Validate the JSON (`node -e "JSON.parse(require('fs').readFileSync('public/data/rankings.json'))"`)
and run `npm ci && npm run build`.

## 2. Jaguars in the NFL grades

`public/data/nfl.json` (written daily by `scripts/nfl.mjs`; shape: `NflData`
in `src/lib/types.ts`) lists every South Alabama alum in the league. Grade the
NFL week that ended last Monday:

- For each player whose `lastGame` is in the current season and whose
  `lastGame.week` is newer than his `grade.week` (or who has no grade), look
  at that game: the ESPN box score for his line, plus snap counts if a free
  source shows them (say so if not found).
- Set `grade` to `{ "letter", "note", "week", "gradedAt" }`: `letter` from
  `A+` to `F-` judged against his role (a punter by net average and
  placement, a special teamer by coverage snaps and tackles, a starter by
  his full line); `note` is one sentence under 30 words with the numbers
  behind it; `week` is `lastGame.week`; `gradedAt` is now.
- Players who did not play keep their old grade. Do not change any other
  field: the daily script overwrites everything but `grade`.
- Occasionally (once a month is enough) check Spotrac for a missing or
  changed contract and add it, with a source URL, to
  `scripts/nfl-alumni.json`. Add a sourced fact there when something notable
  happens (first TD, signing, Pro Bowl). Add a newly signed alum's ESPN id
  there if he is a free agent the roster scan cannot see.

## 3. Coaching outlook

`public/data/outlook.json` (shape: `OutlookData` in `src/lib/types.ts`) holds
Claude's read on the head coach and coordinators for each sport. Update a
sport only if the Jaguars played since `updatedAt` (check
`public/data/<sport>.json` events); basketball only once its season has
started and `basketball` is on in `docs/routine-config.json`, or if there is
staff news.

- For each coach, revisit `stayPct` (chance he is on this staff next
  season, 5 to 95), `hotSeat` and `poach` (`low`, `medium`, `high`) and the
  `note` (two to four sentences, under 70 words): results so far, what the
  rest of the season needs, and how it compares with the Sun Belt history in
  `history.items`. Move `stayPct` at most 10 points in a week unless there is
  news (a firing, an extension, a reported interview). Keep `record` for
  past seasons; the page adds this season's record and points live.
- Set the sport's `asOf` (for example `After week 9 (5-3, 3-1 Sun Belt)`).
- Staff changes: add, remove or retitle coaches only on sourced news.
- When a Sun Belt football head coach is fired or hired away, add it to
  `history.items` with a source in `history.sources`, and update the counts
  in `history.summary`.
- Coaches only: no predictions about players. Short web research only: one
  news search per sport for staff news. **No betting lines.**
- Set `source` to `claude` and `updatedAt` to now.

The transfer list itself (`scripts/portal-seed.json`) changes rarely: add a
player only when a transfer joins mid-year. `scripts/portal.mjs` logs any
seed name it cannot find on the ESPN roster.

## Commit

Commit to `main` with a message like `Sunday: power ranking blurbs, NFL week 7 grades, coaching outlook` and push.
The push triggers the Update data workflow, which refreshes records in place
(it keeps Claude's order, blurbs and NFL grades) and redeploys the site.
Only change `public/data/rankings.json`, `public/data/nfl.json`,
`scripts/nfl-alumni.json`, `public/data/outlook.json` and
`scripts/portal-seed.json`.
