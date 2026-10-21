# Jaguars Hub

A phone-first dashboard for South Alabama football and men's basketball:
next-game countdown, live scores, schedule, matchups, roster, stats, Sun Belt
standings, news, and Claude-written Game Day briefs with postgame grades.

Live site: GitHub Pages for this repo. On iPhone, open it in Safari, tap
Share, then Add to Home Screen.

## How it updates

| What | Where it runs | Cost | How to stop it |
| --- | --- | --- | --- |
| Data refresh (ESPN + usajaguars.com) | GitHub Actions, `.github/workflows/update-data.yml` | Free for public repos | Actions tab → Update data → Disable workflow |
| Live scores during games | Your phone, every 30 s while the app is open | Free | App Settings → Live scores |
| Game Day briefs (football) | Scheduled Claude routine, `docs/BRIEF_ROUTINE.md` | Your Claude plan usage | Pause the routine in Claude |

## Develop

```
npm install
npm run data -- --force   # pull fresh data into public/data
npm run dev
```

Data shapes live in `src/lib/types.ts`. ESPN's site API is unofficial and can
change without notice; `scripts/fetch-data.mjs` keeps the previous data when a
call fails.
