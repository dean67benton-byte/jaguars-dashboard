# Scheduled task setup

Schedule: `CRON_TZ=America/Chicago 27 8,22,0 * * *` (8:27 AM, 10:27 PM, 12:27 AM Central),
a fresh session on each run, no notifications.

Prompt:

> You maintain Dean's South Alabama Jaguars dashboard. Attach the GitHub repo
> dean67benton-byte/jaguars-dashboard with push access, clone it with --depth 1,
> and follow docs/BRIEF_ROUTINE.md exactly. Football only; basketball only if
> docs/routine-config.json says "basketball": true. Work cheaply: first read
> public/data/football.json and public/briefs/index.json and decide whether a
> preview, game-morning update or postgame grade is due. If nothing is due, stop
> immediately with no commit and no web research. When something is due:
> research with web search, write the brief JSON in the shape of
> src/lib/types.ts (Brief) matching public/briefs/2026-10-20-marshall.json,
> update public/briefs/index.json, validate the JSON, run npm ci and npm run
> build, then commit to main and push. No betting lines. Use only sourced
> facts and list the sources. Never change any other files.
