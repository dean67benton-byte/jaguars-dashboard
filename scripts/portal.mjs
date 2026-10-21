#!/usr/bin/env node
// Transfer portal: who came in, who stayed, and how they are doing. Reads the
// hand-kept list in scripts/portal-seed.json (incoming transfers with their
// previous school, football's returning starters, notable departures), then
// uses ESPN for ids, headshots, this season's stats and last season's line.
// Returners are players on both last season's and this season's ESPN team;
// for basketball a returning starter is one with 10 or more starts last year.
// Writes public/data/portal.json.
//
//   node scripts/portal.mjs           daily run (skips other hours)
//   node scripts/portal.mjs --force   refresh now

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FORCE = process.argv.includes('--force');
const OUT = path.resolve('public/data/portal.json');
const SEED = path.resolve('scripts/portal-seed.json');
const TEAM = '6';
const DAILY_HOUR_UTC = 10;

const SPORTS = {
  football: { league: 'football/college-football', core: 'football/leagues/college-football' },
  mbb: { league: 'basketball/mens-college-basketball', core: 'basketball/leagues/mens-college-basketball' },
};
// Stat chips worth showing first for basketball; football takes the first
// non-zero columns ESPN gives for the player's position.
const MBB_ORDER = ['PTS', 'REB', 'AST', 'MIN', 'GP'];

async function getJson(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'jaguars-dashboard (personal, non-commercial)' } });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const norm = (s = '') => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const idOf = (ref = '') => ref.match(/athletes\/(\d+)/)?.[1];

// "2026" for football, "2026-27" for basketball (ESPN's season year is 2027).
const seasonLabel = (sport, year) => (sport === 'mbb' ? `${year - 1}-${String(year).slice(2)}` : String(year));

async function roster(sport) {
  const d = await getJson(`https://site.api.espn.com/apis/site/v2/sports/${SPORTS[sport].league}/teams/${TEAM}/roster`);
  if (!d) return null;
  const list = (d.athletes ?? []).flatMap((g) => g.items ?? [g]);
  return {
    year: d.season?.year,
    players: list.map((a) => ({
      id: String(a.id),
      name: a.fullName ?? a.displayName,
      pos: a.position?.abbreviation,
      cls: a.experience?.abbreviation ?? a.experience?.displayValue,
      headshot: a.headshot?.href,
    })),
  };
}

async function teamIds(sport, year) {
  const d = await getJson(`https://sports.core.api.espn.com/v2/sports/${SPORTS[sport].core}/seasons/${year}/teams/${TEAM}/athletes?limit=300`);
  return d ? new Set(d.items.map((i) => idOf(i.$ref))) : null;
}

async function general(sport, year, id) {
  const d = await getJson(`https://sports.core.api.espn.com/v2/sports/${SPORTS[sport].core}/seasons/${year}/types/2/athletes/${id}/statistics`);
  const out = {};
  for (const c of d?.splits?.categories ?? []) for (const s of c.stats ?? []) if (['gamesPlayed', 'gamesStarted'].includes(s.name)) out[s.name] = Number(s.value) || 0;
  return out;
}

async function lines(sport, id, cur, prev) {
  const d = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/${SPORTS[sport].league}/athletes/${id}/overview`);
  const s = d?.statistics;
  const pick = (label) => {
    const split = s?.splits?.find((x) => x.displayName === label);
    if (!split) return [];
    const pairs = (s.labels ?? []).map((l, i) => ({ label: l, value: split.stats?.[i] ?? '' })).filter((p) => !['', '-', '0', '0.0'].includes(p.value));
    if (sport !== 'mbb') return pairs.slice(0, 5);
    return MBB_ORDER.map((l) => pairs.find((p) => p.label === l)).filter(Boolean);
  };
  return { season: pick(cur), last: pick(prev) };
}

async function sportData(sport, seed, prevData) {
  const r = await roster(sport);
  if (!r?.players.length) return prevData;
  const year = r.year ?? Number(seed.season.slice(0, 4)) + (sport === 'mbb' ? 1 : 0);
  const prevIds = await teamIds(sport, year - 1);
  if (!prevIds) return prevData;
  const cur = seasonLabel(sport, year);
  const prev = seasonLabel(sport, year - 1);
  const byName = new Map(r.players.map((p) => [norm(p.name), p]));

  const build = async (p, extra) => {
    const [g, st] = p.id ? await Promise.all([general(sport, year, p.id), lines(sport, p.id, cur, prev)]) : [{}, { season: [], last: [] }];
    return { ...p, ...extra, games: g.gamesPlayed ?? 0, starts: g.gamesStarted, stats: st };
  };

  const incoming = await Promise.all(
    seed.incoming.map((t) => build(byName.get(norm(t.name)) ?? { name: t.name }, { from: t.from, level: t.level })),
  );

  const returners = r.players.filter((p) => prevIds.has(p.id));
  let starterList;
  if (seed.starters?.length) {
    const names = new Set(seed.starters.map(norm));
    starterList = returners.filter((p) => names.has(norm(p.name)));
  } else {
    const prevStarts = await Promise.all(returners.map((p) => general(sport, year - 1, p.id)));
    starterList = returners.filter((_, i) => (prevStarts[i].gamesStarted ?? 0) >= 10);
  }
  const starters = await Promise.all(starterList.map((p) => build(p)));

  const known = new Set(seed.incoming.map((t) => norm(t.name)));
  const otherNew = r.players.filter((p) => !prevIds.has(p.id) && !known.has(norm(p.name)));
  const unmatched = seed.incoming.filter((t) => !byName.has(norm(t.name))).map((t) => t.name);
  if (unmatched.length) console.log(`portal ${sport}: not on ESPN roster: ${unmatched.join(', ')}`);

  return {
    season: cur,
    lastSeason: prev,
    rosterSize: r.players.length,
    returners: returners.length,
    newcomers: r.players.length - returners.length,
    otherNew: otherNew.length,
    incoming,
    starters,
    startersNote: seed.startersNote,
    departures: seed.departures ?? [],
    sources: seed.sources ?? [],
  };
}

async function main() {
  const prevFile = await readJson(OUT, {});
  const due = FORCE || new Date().getUTCHours() === DAILY_HOUR_UTC || !prevFile.updatedAt;
  if (!due) {
    console.log('portal: nothing due this hour');
    return;
  }
  const seed = await readJson(SEED, {});
  const out = { updatedAt: new Date().toISOString() };
  for (const sport of Object.keys(SPORTS)) {
    if (seed[sport]) out[sport] = await sportData(sport, seed[sport], prevFile[sport]);
  }
  if (!out.football && !out.mbb) {
    console.warn('portal: ESPN unreachable, keeping previous data');
    return;
  }
  await writeFile(OUT, JSON.stringify(out, null, 1) + '\n');
  for (const s of Object.keys(SPORTS)) {
    if (out[s]) console.log(`portal ${s}: ${out[s].incoming.length} transfers in, ${out[s].starters.length} returning starters, ${out[s].returners} returners`);
  }
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, 'daily=true\n', { flag: 'a' });
}

main();
