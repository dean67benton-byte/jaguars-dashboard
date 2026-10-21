#!/usr/bin/env node
// Sun Belt power rankings, step 1 of 2: a formula ranks all conference teams
// from ESPN results and writes public/data/rankings.json. Step 2 is the Sunday
// Claude routine (docs/SUNDAY_ROUTINE.md), which may move teams up to two spots
// and adds a blurb per team. Without Claude the formula ranking still posts.
//
// Runs after fetch-data.mjs in the Update data workflow. A new week posts on
// Sunday from 6 a.m. Central; other runs do nothing.
//
//   node scripts/rankings.mjs          post this week's ranking if due
//   node scripts/rankings.mjs --force  refresh the current week now (keeps
//                                      Claude's order and blurbs if it has them)

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FORCE = process.argv.includes('--force');
const OUT = path.resolve('public/data/rankings.json');
const SITE = 'https://site.api.espn.com/apis/site/v2/sports';
const PATHS = { football: 'football/college-football', mbb: 'basketball/mens-college-basketball' };
const SEASON = {
  football: (d) => (d.getUTCMonth() < 1 ? d.getUTCFullYear() - 1 : d.getUTCFullYear()),
  mbb: (d) => (d.getUTCMonth() >= 6 ? d.getUTCFullYear() + 1 : d.getUTCFullYear()),
};
const KEEP_WEEKS = 26;

// Formula weights; they add to 1. Margins are capped at 28 points a game
// (football) or 25 (basketball) so blowouts of weak teams don't dominate.
const W = { winPct: 0.35, confPct: 0.2, margin: 0.2, sos: 0.15, recent: 0.1 };
const CAP = { football: 28, mbb: 25 };

const central = (d) => new Date(d.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
const dayId = (d) => {
  const c = central(d);
  return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
};

async function getJson(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'jaguars-dashboard (personal, non-commercial)' } });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

const num = (s) => {
  const v = typeof s === 'object' ? s?.value ?? s?.displayValue : s;
  return v === undefined || v === null || v === '' ? undefined : Number(v);
};

function games(json, id) {
  return (json?.events ?? [])
    .map((ev) => {
      const comp = ev.competitions?.[0] ?? {};
      if (comp.status?.type?.state !== 'post') return null;
      const us = comp.competitors?.find((c) => String(c.team?.id ?? c.id) === id);
      const them = comp.competitors?.find((c) => c !== us);
      const a = num(us?.score);
      const b = num(them?.score);
      if (!us || !them || a === undefined || b === undefined) return null;
      return {
        date: ev.date,
        oppId: String(them.team?.id ?? them.id),
        opp: them.team?.shortDisplayName ?? them.team?.displayName ?? '',
        home: us.homeAway === 'home',
        neutral: Boolean(comp.neutralSite),
        pf: a,
        pa: b,
        result: a > b ? 'W' : a < b ? 'L' : 'T',
      };
    })
    .filter(Boolean)
    .sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
}

const pct = (list) => (list.length ? list.filter((g) => g.result === 'W').length / list.length + list.filter((g) => g.result === 'T').length / 2 / list.length : 0);
const rec = (list) => {
  const w = list.filter((g) => g.result === 'W').length;
  const l = list.filter((g) => g.result === 'L').length;
  const t = list.length - w - l;
  return t ? `${w}-${l}-${t}` : `${w}-${l}`;
};
const scale = (m, cap) => Math.max(-1, Math.min(1, m / cap)) * 0.5 + 0.5;

async function formula(sport, now) {
  const data = JSON.parse(await readFile(path.resolve(`public/data/${sport}.json`), 'utf8'));
  const ids = [...new Set((data.standings ?? []).flatMap((g) => g.rows.map((r) => r.teamId)))];
  if (ids.length < 8) return null;
  const season = SEASON[sport](new Date(now));
  const base = `${SITE}/${PATHS[sport]}`;
  const teams = await Promise.all(
    ids.map(async (id) => {
      const [reg, post] = await Promise.all([
        getJson(`${base}/teams/${id}/schedule?season=${season}&seasontype=2`),
        getJson(`${base}/teams/${id}/schedule?season=${season}&seasontype=3`),
      ]);
      const t = reg?.team ?? {};
      return {
        teamId: id,
        team: t.location ?? t.shortDisplayName ?? t.displayName ?? id,
        logo: t.logo ?? t.logos?.[0]?.href,
        games: [...games(reg, id), ...games(post, id)],
      };
    }),
  );
  // Rank only once most teams have played; an empty week is not posted.
  if (teams.filter((t) => t.games.length).length < Math.ceil(ids.length * 0.6)) return null;

  const winPct = new Map(teams.map((t) => [t.teamId, pct(t.games)]));
  const cap = CAP[sport];
  const rows = teams.map((t) => {
    const conf = t.games.filter((g) => winPct.has(g.oppId));
    const capped = (g) => Math.max(-cap, Math.min(cap, g.pf - g.pa));
    const avg = (list) => (list.length ? list.reduce((s, g) => s + capped(g), 0) / list.length : 0);
    // Strength of schedule: a Sun Belt opponent counts at its current win
    // percentage; a non-conference opponent counts as average (0.5).
    const sos = t.games.length ? t.games.reduce((s, g) => s + (winPct.get(g.oppId) ?? 0.5), 0) / t.games.length : 0.5;
    const parts = {
      winPct: pct(t.games),
      confPct: conf.length ? pct(conf) : pct(t.games),
      margin: scale(avg(t.games), cap),
      sos,
      recent: scale(avg(t.games.slice(-3)), cap),
    };
    const score = Object.entries(W).reduce((s, [k, w]) => s + w * parts[k], 0);
    const last = t.games.at(-1);
    return {
      teamId: t.teamId,
      team: t.team,
      logo: t.logo,
      record: rec(t.games),
      conf: rec(conf),
      last: last && {
        result: last.result,
        score: `${last.pf}-${last.pa}`,
        opp: last.opp,
        at: last.neutral ? 'vs' : last.home ? 'vs' : 'at',
        date: last.date,
      },
      score: Math.round(score * 1000) / 1000,
      _conf: parts.confPct,
      _margin: parts.margin,
    };
  });
  rows.sort((a, b) => b.score - a.score || b._conf - a._conf || b._margin - a._margin);
  return rows.map(({ _conf, _margin, ...r }, i) => ({ rank: i + 1, formulaRank: i + 1, ...r }));
}

async function main() {
  const now = Date.now();
  let file;
  try {
    file = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    file = {};
  }
  const today = dayId(new Date(now));
  const sunday = central(new Date(now)).getDay() === 0 && central(new Date(now)).getHours() >= 6;
  let changed = false;

  for (const sport of Object.keys(PATHS)) {
    const weeks = file[sport]?.weeks ?? [];
    const current = weeks[0];
    // A new week posts on Sunday; the first ranking of a season posts at the
    // daily 5 a.m. run. --force (any push to main) refreshes the current week.
    const newWeek = (sunday && current?.id !== today) || (!current && (FORCE || new Date(now).getUTCHours() === 10));
    if (!newWeek && !(FORCE && current)) continue;
    const rows = await formula(sport, now);
    if (!rows) {
      console.log(`rankings ${sport}: not enough games yet`);
      continue;
    }
    const lastGame = Math.max(...rows.map((r) => (r.last ? Date.parse(r.last.date) : 0)));
    if (newWeek && current && lastGame < Date.parse(current.postedAt)) {
      console.log(`rankings ${sport}: no games since the last ranking`);
      continue;
    }
    if (newWeek) {
      weeks.unshift({ id: today, postedAt: new Date(now).toISOString(), source: 'formula', rows });
    } else if (current.source === 'claude') {
      // Claude already set the order and wrote blurbs: refresh records and
      // results only.
      const byId = new Map(rows.map((r) => [r.teamId, r]));
      current.rows = current.rows.map((r) => ({ ...byId.get(r.teamId), rank: r.rank, blurb: r.blurb, adjust: r.adjust }));
      current.updatedAt = new Date(now).toISOString();
    } else {
      current.rows = rows;
      current.updatedAt = new Date(now).toISOString();
    }
    file[sport] = { weeks: weeks.slice(0, KEEP_WEEKS) };
    changed = true;
    console.log(`rankings ${sport}: ${newWeek ? 'posted' : 'refreshed'} ${weeks[0].id}, #1 ${weeks[0].rows[0].team}`);
  }

  if (changed) {
    file.updatedAt = new Date(now).toISOString();
    await writeFile(OUT, JSON.stringify(file, null, 1) + '\n');
  }
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `rankings=${changed}\n`, { flag: 'a' });
}

main();
