#!/usr/bin/env node
// Pulls South Alabama football and men's basketball data from ESPN's public
// site API (plus usajaguars.com news) and writes public/data/<sport>.json.
// Runs hourly in GitHub Actions; decides for itself how much to refresh.
//
//   node scripts/fetch-data.mjs           scheduled run (may skip)
//   node scripts/fetch-data.mjs --force   refresh everything now

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('public/data');
const TEAM_ID = '6'; // South Alabama on ESPN (espn.com/college-football/team/_/id/6)
const FORCE = process.argv.includes('--force');
const DAILY_HOUR_UTC = 10; // 5 a.m. Central (CDT)

const SPORTS = {
  football: {
    path: 'football/college-football',
    rss: ['https://usajaguars.com/rss.aspx?path=football'],
    slug: /\/\d{4}\/\d+\/\d+\/football-/,
    season: (d) => (d.getUTCMonth() < 1 ? d.getUTCFullYear() - 1 : d.getUTCFullYear()),
  },
  mbb: {
    path: 'basketball/mens-college-basketball',
    rss: ['https://usajaguars.com/rss.aspx?path=mbball'],
    slug: /\/\d{4}\/\d+\/\d+\/mens-basketball-/,
    season: (d) => (d.getUTCMonth() >= 6 ? d.getUTCFullYear() + 1 : d.getUTCFullYear()),
  },
};

const SITE = 'https://site.api.espn.com/apis/site/v2/sports';
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports';

async function getJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'jaguars-dashboard (personal, non-commercial)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function tryJson(url) {
  try {
    return await getJson(url);
  } catch (err) {
    console.warn(`  skip: ${err.message}`);
    return null;
  }
}

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

function teamRef(t = {}) {
  return {
    id: String(pick(t.id, '')),
    name: pick(t.displayName, t.name, t.location, 'TBA'),
    short: pick(t.shortDisplayName, t.location, t.name, 'TBA'),
    abbr: pick(t.abbreviation, ''),
    logo: pick(t.logo, t.logos?.[0]?.href),
  };
}

function normalizeEvent(ev) {
  const comp = ev.competitions?.[0] ?? {};
  const comps = comp.competitors ?? [];
  const us = comps.find((c) => String(c.team?.id ?? c.id) === TEAM_ID) ?? {};
  const them = comps.find((c) => c !== us) ?? {};
  const state = comp.status?.type?.state ?? ev.status?.type?.state ?? 'pre';
  const score = (c) => {
    const s = c.score;
    const v = typeof s === 'object' ? pick(s?.value, s?.displayValue) : s;
    return v === undefined || v === null || v === '' ? undefined : Number(v);
  };
  const usScore = score(us);
  const oppScore = score(them);
  let result;
  if (state === 'post' && usScore !== undefined && oppScore !== undefined) {
    result = usScore > oppScore ? 'W' : usScore < oppScore ? 'L' : 'T';
  }
  const opp = teamRef(them.team);
  opp.record = pick(them.record?.[0]?.displayValue, them.records?.[0]?.summary);
  return {
    id: String(ev.id),
    date: ev.date,
    timeTbd: Boolean(comp.timeValid === false || ev.timeValid === false || /^TBD$/i.test(comp.status?.type?.shortDetail ?? '')),
    opponent: opp,
    home: us.homeAway === 'home',
    neutral: Boolean(comp.neutralSite),
    conference: Boolean(comp.conferenceCompetition),
    venue: comp.venue?.fullName,
    city: [comp.venue?.address?.city, comp.venue?.address?.state].filter(Boolean).join(', ') || undefined,
    tv: (comp.broadcasts ?? [])
      .map((b) => pick(b.media?.shortName, b.names?.join('/')))
      .filter(Boolean)
      .join(', ') || undefined,
    status: state,
    statusDetail: pick(comp.status?.type?.shortDetail, ev.status?.type?.shortDetail),
    usScore,
    oppScore,
    result,
  };
}

function normalizeRoster(json) {
  const groups = json?.athletes ?? [];
  // Football groups athletes by position unit; basketball is a flat list.
  const people = groups.flatMap((g) => (Array.isArray(g.items) ? g.items : [g]));
  return people.map((a) => ({
    number: a.jersey,
    name: pick(a.displayName, a.fullName, ''),
    pos: a.position?.abbreviation,
    cls: pick(a.experience?.abbreviation, a.experience?.displayValue),
    ht: a.displayHeight,
    wt: a.displayWeight,
    hometown: [a.birthPlace?.city, a.birthPlace?.state].filter(Boolean).join(', ') || undefined,
  }));
}

function normalizeStats(json) {
  const cats = json?.results?.stats?.categories ?? json?.statistics?.splits?.categories ?? [];
  return cats.map((c) => ({
    name: pick(c.displayName, c.name, ''),
    stats: (c.stats ?? []).map((s) => ({
      name: s.name,
      label: pick(s.displayName, s.shortDisplayName, s.name),
      value: pick(s.perGameDisplayValue && /PerGame|Avg/i.test(s.name ?? '') ? s.perGameDisplayValue : undefined, s.displayValue, String(s.value ?? '')),
      rank: s.rankDisplayValue,
    })),
  }));
}

function normalizeLeaders(teamJson) {
  const leaders = teamJson?.team?.leaders ?? [];
  return leaders
    .map((l) => {
      const top = l.leaders?.[0];
      if (!top) return null;
      return { category: pick(l.displayName, l.name), name: pick(top.athlete?.displayName, ''), value: pick(top.displayValue, '') };
    })
    .filter(Boolean);
}

// Standings come back as nested conference -> division groups; keep the
// groups that contain South Alabama.
function normalizeStandings(json) {
  const out = [];
  const hasUs = (n) => n.standings?.entries?.some((e) => String(e.team?.id) === TEAM_ID) || (n.children ?? []).some(hasUs);
  const walk = (node, parentName) => {
    // Football splits the Sun Belt into East and West: keep both divisions.
    const kids = node.children ?? [];
    if (kids.length && kids.length <= 3 && kids.every((k) => k.standings) && kids.some(hasUs) && !node.standings) {
      kids.forEach((k) => walk({ ...k, _all: true }, ''));
      return;
    }
    const name = [parentName, node.name ?? node.abbreviation].filter(Boolean).join(' · ');
    const entries = node.standings?.entries;
    if (entries && (node._all || entries.some((e) => String(e.team?.id) === TEAM_ID))) {
      const stat = (e, ...names) => {
        const s = (e.stats ?? []).find((x) => names.includes(x.name) || names.includes(x.type));
        return s ? pick(s.displayValue, s.summary, String(s.value ?? '')) : '';
      };
      out.push({
        name: name || 'Sun Belt',
        rows: entries
          .map((e) => ({
            teamId: String(e.team?.id),
            team: pick(e.team?.shortDisplayName, e.team?.displayName, ''),
            conf: stat(e, 'vs. Conf.', 'vsconf', 'conferenceRecord', 'Conference'),
            overall: stat(e, 'overall', 'total', 'Overall'),
            _winPct: Number(stat(e, 'leagueWinPercent', 'winPercent') || 0),
          }))
          .sort((a, b) => b._winPct - a._winPct)
          .map(({ _winPct, ...r }) => r),
      });
    }
    (node.children ?? []).forEach((c) => walk(c, node.standings ? name : parentName));
  };
  if (json) walk(json, '');
  return out;
}

function normalizeEspnNews(json) {
  return (json?.articles ?? []).map((a) => ({
    title: a.headline,
    url: pick(a.links?.web?.href, a.links?.mobile?.href, ''),
    date: a.published,
    source: 'ESPN',
    image: a.images?.[0]?.url,
  }));
}

async function fetchRss(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 15);
    const tag = (s, t) => {
      const m = s.match(new RegExp(`<${t}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`));
      return m ? m[1].trim() : undefined;
    };
    return items.map(([, s]) => ({
      title: tag(s, 'title'),
      url: tag(s, 'link'),
      date: tag(s, 'pubDate') ? new Date(tag(s, 'pubDate')).toISOString() : undefined,
      source: 'usajaguars.com',
    })).filter((n) => n.title && n.url);
  } catch (err) {
    console.warn(`  skip rss ${url}: ${err.message}`);
    return [];
  }
}

async function readPrevious(sport) {
  const file = path.join(OUT_DIR, `${sport}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

const HOUR = 3600e3;
const isGameWindow = (events, now) =>
  events?.some((e) => {
    const t = Date.parse(e.date);
    return e.status === 'in' || (t - now < 24 * HOUR && now - t < 8 * HOUR);
  });
const inSeason = (events, now) =>
  events?.some((e) => Math.abs(Date.parse(e.date) - now) < 30 * 24 * HOUR);

async function updateSport(sport, now) {
  const cfg = SPORTS[sport];
  const prev = await readPrevious(sport);
  const hour = new Date(now).getUTCHours();
  const daily = FORCE || hour === DAILY_HOUR_UTC || !prev || prev.source === 'seed';
  const gameWindow = isGameWindow(prev?.events, now);
  const active = inSeason(prev?.events, now);

  // Cadence: hourly on game days, every 2 hours in season, daily off-season.
  if (!FORCE && !daily && !gameWindow && (!active || hour % 2 === 1)) {
    console.log(`${sport}: nothing due this hour`);
    return false;
  }
  console.log(`${sport}: refreshing (${daily ? 'full' : 'light'})`);

  const base = `${SITE}/${cfg.path}`;
  const season = cfg.season(new Date(now));
  // seasontype 2 = regular season, 3 = postseason (bowls, conference tournament).
  const [teamJson, schedJson, postJson, newsJson] = await Promise.all([
    tryJson(`${base}/teams/${TEAM_ID}`),
    tryJson(`${base}/teams/${TEAM_ID}/schedule?season=${season}&seasontype=2`),
    tryJson(`${base}/teams/${TEAM_ID}/schedule?season=${season}&seasontype=3`),
    tryJson(`${base}/news?team=${TEAM_ID}&limit=15`),
  ]);
  if (!teamJson && !schedJson) {
    console.warn(`${sport}: ESPN unreachable, keeping previous data`);
    return false;
  }

  const t = teamJson?.team ?? {};
  const recordItems = t.record?.items ?? [];
  const overall = recordItems.find((r) => r.type === 'total') ?? recordItems[0];
  const team = {
    ...teamRef(t),
    record: overall?.summary,
    confRecord: recordItems.find((r) => /conf/i.test(r.type ?? r.description ?? ''))?.summary,
    standingSummary: t.standingSummary,
  };

  const raw = schedJson ? [...(schedJson.events ?? []), ...(postJson?.events ?? [])] : prev?.events ?? [];
  const events = raw
    .map((e) => (e.competitions ? normalizeEvent(e) : e))
    .filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i);
  events.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  // The athletics site's feed mixes sports; keep this sport's stories only.
  const rss = (await Promise.all(cfg.rss.map(fetchRss))).flat().filter((n) => cfg.slug.test(n.url));
  const news = [...rss, ...normalizeEspnNews(newsJson)]
    .filter((n, i, all) => all.findIndex((m) => m.title === n.title) === i)
    .sort((a, b) => Date.parse(b.date ?? 0) - Date.parse(a.date ?? 0))
    .slice(0, 25);

  let { roster = [], stats = [], leaders = [], standings = [], nextOpponent } = prev ?? {};
  if (daily) {
    const [rosterJson, statsJson, standJson] = await Promise.all([
      tryJson(`${base}/teams/${TEAM_ID}/roster`),
      tryJson(`${base}/teams/${TEAM_ID}/statistics`),
      tryJson(`${STANDINGS}/${cfg.path}/standings?season=${season}`),
    ]);
    if (rosterJson) roster = normalizeRoster(rosterJson);
    if (statsJson) stats = normalizeStats(statsJson);
    if (standJson) standings = normalizeStandings(standJson);
  }
  leaders = normalizeLeaders(teamJson).length ? normalizeLeaders(teamJson) : leaders;

  // Mark Sun Belt games: the opponent appears in our standings groups.
  const confIds = new Set(standings.flatMap((g) => g.rows.map((r) => r.teamId)));
  events.forEach((e) => (e.conference = e.conference || confIds.has(e.opponent.id)));

  const next = events.find((e) => e.status !== 'post');
  if (next && (daily || nextOpponent?.team?.id !== next.opponent.id) && next.opponent.id) {
    const [oppTeam, oppStats] = await Promise.all([
      tryJson(`${base}/teams/${next.opponent.id}`),
      tryJson(`${base}/teams/${next.opponent.id}/statistics`),
    ]);
    const ot = oppTeam?.team ?? {};
    nextOpponent = {
      team: { ...teamRef(ot), record: ot.record?.items?.[0]?.summary },
      stats: oppStats ? normalizeStats(oppStats) : [],
    };
  }

  const data = {
    sport,
    updatedAt: new Date(now).toISOString(),
    source: 'espn',
    team,
    events,
    roster,
    stats,
    leaders,
    standings,
    news,
    nextOpponent,
  };
  await writeFile(path.join(OUT_DIR, `${sport}.json`), JSON.stringify(data, null, 1) + '\n');
  return true;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const now = Date.now();
  let changed = false;
  for (const sport of Object.keys(SPORTS)) {
    try {
      changed = (await updateSport(sport, now)) || changed;
    } catch (err) {
      console.error(`${sport}: failed: ${err.stack ?? err}`);
    }
  }
  // Tell the workflow whether a deploy is needed.
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, { flag: 'a' });
  }
}

main();
