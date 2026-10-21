# Sunday routine

Instructions for the weekly Claude routine that runs **Sunday at 8:15 AM
Central**. It is one run a week that handles every written section, so Claude
usage stays low. Each section has an on/off switch under `sunday` in
`docs/routine-config.json`; a section that is off, or has nothing new, is
skipped without any web research. If every section is skipped, end with no
commit.

Sections, in order:

1. Sun Belt power rankings (`rankingBlurbs`), below.
2. Jaguars in the NFL grades (`nflGrades`): not built yet, skip.
3. Coaching outlook (`coachingOutlook`): not built yet, skip.

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

## Commit

Commit to `main` with a message like `Sunday: power ranking blurbs` and push.
The push triggers the Update data workflow, which refreshes records in place
(it keeps Claude's order and blurbs) and redeploys the site. Never change any
other files.
