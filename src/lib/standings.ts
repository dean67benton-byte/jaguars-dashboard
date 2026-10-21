import { useEffect, useState } from 'preact/hooks';
import type { SportKey, StandingGroup } from './types';
import { ESPN_PATH } from './data';

const TEAM_ID = '6';
export const logoFor = (teamId: string) => `https://a.espncdn.com/i/teamlogos/ncaa/500/${teamId}.png`;

/* eslint-disable @typescript-eslint/no-explicit-any */
// Same rules as normalizeStandings in scripts/fetch-data.mjs: keep the Sun Belt
// groups (both football divisions) and sort by conference win percentage.
export function parseStandings(json: any): StandingGroup[] {
  const out: StandingGroup[] = [];
  const hasUs = (n: any): boolean =>
    n.standings?.entries?.some((e: any) => String(e.team?.id) === TEAM_ID) || (n.children ?? []).some(hasUs);
  const stat = (e: any, ...names: string[]) => {
    const s = (e.stats ?? []).find((x: any) => names.includes(x.name) || names.includes(x.type));
    return s ? String(s.displayValue ?? s.summary ?? s.value ?? '') : '';
  };
  const walk = (node: any, parentName: string, all = false) => {
    const kids = node.children ?? [];
    if (kids.length && kids.length <= 3 && kids.every((k: any) => k.standings) && kids.some(hasUs) && !node.standings) {
      kids.forEach((k: any) => walk(k, '', true));
      return;
    }
    const name = [parentName, node.name ?? node.abbreviation].filter(Boolean).join(' ');
    const entries = node.standings?.entries;
    if (entries && (all || entries.some((e: any) => String(e.team?.id) === TEAM_ID))) {
      out.push({
        name: name || 'Sun Belt',
        rows: entries
          .map((e: any) => ({
            teamId: String(e.team?.id),
            team: e.team?.shortDisplayName ?? e.team?.displayName ?? '',
            conf: stat(e, 'vs. Conf.', 'vsconf', 'conferenceRecord', 'Conference'),
            overall: stat(e, 'overall', 'total', 'Overall'),
            pct: Number(stat(e, 'leagueWinPercent', 'winPercent') || 0),
          }))
          .sort((a: any, b: any) => b.pct - a.pct)
          .map(({ pct, ...r }: any) => r),
      });
    }
    kids.forEach((c: any) => walk(c, node.standings ? name : parentName));
  };
  if (json) walk(json, '');
  return out;
}

/** Live Sun Belt standings straight from ESPN, falling back to the saved copy. */
export function useLiveStandings(sport: SportKey, fallback: StandingGroup[], enabled: boolean) {
  const [groups, setGroups] = useState<StandingGroup[] | null>(null);
  useEffect(() => {
    setGroups(null);
    if (!enabled) return;
    let alive = true;
    fetch(`https://site.api.espn.com/apis/v2/sports/${ESPN_PATH[sport]}/standings`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const parsed = parseStandings(j);
        if (alive && parsed.length) setGroups(parsed);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [sport, enabled]);
  return { groups: groups ?? fallback, live: Boolean(groups) };
}
