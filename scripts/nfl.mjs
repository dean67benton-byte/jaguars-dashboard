#!/usr/bin/env node
// Jaguars in the NFL: finds every South Alabama alum on an NFL roster (ESPN
// lists college on each roster entry), adds the hand-kept alumni in
// scripts/nfl-alumni.json (free agents, facts, contracts), pulls season
// stats from ESPN, and writes public/data/nfl.json. Weekly grades are added
// by the Sunday Claude routine and kept here across runs.
//
// Runs in the Update data workflow once a day (5 a.m. Central) and on pushes.
//
//   node scripts/nfl.mjs           daily run (skips other hours)
//   node scripts/nfl.mjs --force   refresh now

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FORCE = process.argv.includes('--force');
const OUT = path.resolve('public/data/nfl.json');
const SEED = path.resolve('scripts/nfl-alumni.json');
const COLLEGE_ID = '6'; // South Alabama
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const COMMON = 'https://site.web.api.espn.com/apis/common/v3/sports/football/nfl';
const DAILY_HOUR_UTC = 10;

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

// Every alum on a current roster, with the roster's status (Active,
// Practice Squad, ...). ESPN team ids run 1 to 34 with two gaps.
async function scanRosters() {
  const found = new Map();
  const teams = await Promise.all(Array.from({ length: 34 }, (_, i) => getJson(`${SITE}/teams/${i + 1}/roster`)));
  for (const t of teams) {
    for (const g of t?.athletes ?? []) {
      for (const a of g.items ?? []) {
        if (String(a.college?.id) === COLLEGE_ID || a.college?.name === 'South Alabama') {
          found.set(String(a.id), { rosterStatus: a.status?.name, team: t.team?.abbreviation });
        }
      }
    }
  }
  return { found, ok: teams.filter(Boolean).length >= 30 };
}

function seasonLine(overview) {
  const s = overview?.statistics;
  const season = s?.splits?.find((x) => /regular season/i.test(x.displayName ?? ''));
  const career = s?.splits?.find((x) => /career/i.test(x.displayName ?? ''));
  const pairs = (split) =>
    (s?.labels ?? []).map((label, i) => ({ label, value: split?.stats?.[i] ?? '' })).filter((p) => !['', '-', '0', '0.0'].includes(p.value));
  return { season: pairs(season).slice(0, 5), career: pairs(career).slice(0, 4) };
}

function group(rosterStatus, espnStatus, onRoster) {
  if (rosterStatus === 'Practice Squad') return 'practice';
  if (onRoster) return 'active';
  if (/injured|reserve/i.test(espnStatus ?? '')) return 'reserve';
  return 'free';
}

async function player(id, roster, seed, prev) {
  const [bio, overview, log] = await Promise.all([
    getJson(`${COMMON}/athletes/${id}`),
    getJson(`${COMMON}/athletes/${id}/overview`),
    getJson(`${COMMON}/athletes/${id}/gamelog`),
  ]);
  const a = bio?.athlete;
  if (!a) return prev ?? null;
  const games = Object.values(log?.events ?? {}).sort((x, y) => Date.parse(y.gameDate) - Date.parse(x.gameDate));
  const last = games[0];
  const onRoster = Boolean(roster);
  const team = a.team;
  return {
    id,
    name: a.displayName,
    pos: a.position?.abbreviation,
    jersey: a.jersey,
    age: a.age,
    years: a.experience?.years,
    headshot: a.headshot?.href,
    group: group(roster?.rosterStatus, a.status?.name, onRoster),
    status: roster?.rosterStatus ?? a.status?.name,
    team: onRoster && team ? { abbr: team.abbreviation, name: team.displayName, logo: team.logos?.[0]?.href } : undefined,
    lastTeam: !onRoster && team ? team.displayName : undefined,
    // ESPN falls back to the player's most recent season when he has not
    // played this one, so label the numbers with their season.
    statsSeason: log?.seasonTypes?.[0]?.displayName,
    games: games.length,
    lastGame: last && {
      date: last.gameDate,
      opp: last.opponent?.abbreviation,
      at: last.atVs,
      result: last.gameResult,
      score: last.score,
      week: last.week,
    },
    stats: seasonLine(overview),
    facts: seed?.facts ?? [],
    contract: seed?.contract,
    sources: seed?.sources ?? [],
    // Written by the Sunday routine; kept until it writes a new one.
    grade: prev?.grade,
    espn: `https://www.espn.com/nfl/player/_/id/${id}`,
  };
}

async function main() {
  const prevFile = await readJson(OUT, { players: [] });
  const due = FORCE || new Date().getUTCHours() === DAILY_HOUR_UTC || !prevFile.players.length;
  if (!due) {
    console.log('nfl: nothing due this hour');
    return;
  }
  const seed = (await readJson(SEED, { players: {} })).players;
  const { found, ok } = await scanRosters();
  if (!ok) {
    console.warn('nfl: ESPN rosters unreachable, keeping previous data');
    return;
  }
  const prev = new Map(prevFile.players.map((p) => [p.id, p]));
  const ids = [...new Set([...found.keys(), ...Object.keys(seed)])];
  const players = (await Promise.all(ids.map((id) => player(id, found.get(id), seed[id], prev.get(id))))).filter(Boolean);
  const order = { active: 0, practice: 1, reserve: 2, free: 3 };
  players.sort((x, y) => order[x.group] - order[y.group] || (y.games ?? 0) - (x.games ?? 0) || x.name.localeCompare(y.name));
  await writeFile(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), players }, null, 1) + '\n');
  console.log(`nfl: ${players.length} alumni (${players.filter((p) => p.group === 'active').length} active)`);
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, 'daily=true\n', { flag: 'a' });
}

main();
