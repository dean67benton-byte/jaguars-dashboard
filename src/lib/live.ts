import { useEffect, useState } from 'preact/hooks';
import type { GameEvent, SportKey } from './types';
import { ESPN_PATH } from './data';

const TEAM_ID = '6';

export interface Summary {
  state: 'pre' | 'in' | 'post';
  detail?: string;
  usScore?: number;
  oppScore?: number;
  situation?: string;
  winProb?: { us: number; opp: number };
  weather?: string;
  injuries: { team: 'USA' | 'OPP'; name: string; status: string }[];
  lastFive: { team: 'USA' | 'OPP'; games: { result: string; label: string }[] }[];
  leaders: { team: 'USA' | 'OPP'; category: string; name: string; value: string }[];
}

const side = (id: unknown): 'USA' | 'OPP' => (String(id) === TEAM_ID ? 'USA' : 'OPP');

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseSummary(s: any): Summary {
  const comp = s?.header?.competitions?.[0] ?? {};
  const comps: any[] = comp.competitors ?? [];
  const us = comps.find((c) => String(c.team?.id ?? c.id) === TEAM_ID) ?? {};
  const them = comps.find((c) => c !== us) ?? {};
  const num = (v: any) => (v === undefined || v === null || v === '' ? undefined : Number(v));
  const p = s?.predictor;
  let winProb: Summary['winProb'];
  if (p?.homeTeam && p?.awayTeam) {
    const home = Number(p.homeTeam.gameProjection);
    const away = Number(p.awayTeam.gameProjection);
    const usHome = us.homeAway === 'home';
    if (!Number.isNaN(home) && !Number.isNaN(away)) winProb = { us: usHome ? home : away, opp: usHome ? away : home };
  }
  // During and after a game ESPN publishes a running win probability instead.
  const wp: any[] = s?.winprobability ?? [];
  if (wp.length) {
    const home = Number(wp[wp.length - 1].homeWinPercentage) * 100;
    const usHome = us.homeAway === 'home';
    if (!Number.isNaN(home)) winProb = { us: usHome ? home : 100 - home, opp: usHome ? 100 - home : home };
  }
  const w = s?.gameInfo?.weather;
  return {
    state: comp.status?.type?.state ?? 'pre',
    detail: comp.status?.type?.shortDetail,
    usScore: num(us.score),
    oppScore: num(them.score),
    situation: s?.situation?.downDistanceText ?? s?.drives?.current?.description,
    winProb,
    weather: w ? [w.displayValue ?? w.conditionId, w.temperature ? `${w.temperature}°F` : w.highTemperature ? `High ${w.highTemperature}°F` : '', w.precipitation ? `${w.precipitation}% chance of rain` : ''].filter(Boolean).join(', ') : undefined,
    injuries: (s?.injuries ?? []).flatMap((t: any) =>
      (t.injuries ?? []).map((i: any) => ({
        team: side(t.team?.id),
        name: [i.athlete?.displayName, i.athlete?.position?.abbreviation].filter(Boolean).join(', '),
        status: i.status ?? i.type?.description ?? '',
      })),
    ),
    lastFive: (s?.lastFiveGames ?? []).map((t: any) => ({
      team: side(t.team?.id),
      games: (t.events ?? []).map((e: any) => ({
        result: e.gameResult ?? '',
        label: `${e.atVs ?? ''} ${e.opponent?.abbreviation ?? ''} ${e.score ?? ''}`.trim(),
      })),
    })),
    leaders: (s?.leaders ?? []).flatMap((t: any) =>
      (t.leaders ?? []).slice(0, 3).map((l: any) => ({
        team: side(t.team?.id),
        category: l.displayName ?? l.name,
        name: l.leaders?.[0]?.athlete?.displayName ?? '',
        value: l.leaders?.[0]?.displayValue ?? '',
      })),
    ),
  };
}

// Seed events (before the first ESPN pull) have no ESPN id.
export const hasEspnId = (ev?: GameEvent) => Boolean(ev && /^\d+$/.test(ev.id));

export function isLiveWindow(ev?: GameEvent, now = Date.now()) {
  if (!ev || ev.status === 'post') return false;
  const t = Date.parse(ev.date);
  return ev.status === 'in' || (now >= t - 10 * 6e4 && now < t + 5 * 36e5);
}

/** Fetches ESPN's game summary; polls every `pollMs` while `poll` is true. */
export function useSummary(sport: SportKey, ev: GameEvent | undefined, poll: boolean, pollMs = 30000) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = hasEspnId(ev) ? ev!.id : null;

  const load = async () => {
    if (!id) return;
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${ESPN_PATH[sport]}/summary?event=${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const parsed = parseSummary(await res.json());
      setSummary(parsed);
      setUpdatedAt(Date.now());
      setError(null);
      return parsed;
    } catch {
      setError('ESPN did not respond. Pull to refresh or try again in a minute.');
    }
  };

  useEffect(() => {
    setSummary(null);
    if (!id) return;
    load();
    if (!poll) return;
    const t = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      const s = await load();
      if (s?.state === 'post') clearInterval(t);
    }, pollMs);
    return () => clearInterval(t);
  }, [id, poll, sport]);

  return { summary, updatedAt, error, reload: load };
}
