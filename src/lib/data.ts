import { useCallback, useEffect, useState } from 'preact/hooks';
import type { Brief, BriefIndexEntry, GameEvent, NflData, OutlookData, PortalData, Rankings, SportKey, TeamData } from './types';

const cache = new Map<string, unknown>();

async function getJson<T>(url: string, fresh = false): Promise<T> {
  if (!fresh && cache.has(url)) return cache.get(url) as T;
  const res = await fetch(url + (fresh ? `?t=${Date.now()}` : ''), { cache: fresh ? 'no-store' : 'default' });
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const json = (await res.json()) as T;
  cache.set(url, json);
  return json;
}

export function useJson<T>(url: string | null, refreshMs = 0) {
  const [data, setData] = useState<T | null>(url ? ((cache.get(url) as T) ?? null) : null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(
    async (fresh = true) => {
      if (!url) return;
      setLoading(true);
      try {
        setData(await getJson<T>(url, fresh));
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [url],
  );

  useEffect(() => {
    reload(false);
    if (!refreshMs) return;
    const t = setInterval(() => document.visibilityState === 'visible' && reload(true), refreshMs);
    return () => clearInterval(t);
  }, [reload, refreshMs]);

  return { data, error, loading, reload };
}

export const useTeam = (sport: SportKey, refreshMs = 0) => useJson<TeamData>(`./data/${sport}.json`, refreshMs);
export const useBriefIndex = () => useJson<BriefIndexEntry[]>('./briefs/index.json');
export const useBrief = (id: string | null) => useJson<Brief>(id ? `./briefs/${id}.json` : null);

export const nextGame = (events: GameEvent[], now = Date.now()) =>
  events.find((e) => e.status === 'in') ??
  events.find((e) => e.status === 'pre' && Date.parse(e.date) > now - 5 * 36e5);

export const lastResult = (events: GameEvent[]) => [...events].reverse().find((e) => e.status === 'post');

// A brief belongs to a game when the dates are within 12 hours of each other.
export const briefFor = (index: BriefIndexEntry[] | null, ev?: GameEvent) =>
  ev && index?.find((b) => Math.abs(Date.parse(b.date) - Date.parse(ev.date)) < 12 * 36e5);

export const SPORT_LABEL: Record<SportKey, string> = { football: 'Football', mbb: 'Basketball' };
export const ESPN_PATH: Record<SportKey, string> = {
  football: 'football/college-football',
  mbb: 'basketball/mens-college-basketball',
};
export const LISTEN_URL = 'https://apps.apple.com/app/id1574519982'; // Varsity Network app
export const useRankings = () => useJson<Rankings>('./data/rankings.json', 30 * 60e3);
export const useNfl = (on: boolean) => useJson<NflData>(on ? './data/nfl.json' : null);
export const usePortal = (on: boolean) => useJson<PortalData>(on ? './data/portal.json' : null);
export const useOutlook = (on: boolean) => useJson<OutlookData>(on ? './data/outlook.json' : null);
