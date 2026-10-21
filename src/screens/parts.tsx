import type { BriefIndexEntry, GameEvent, SportKey, StandingGroup, TeamData } from '../lib/types';
import { useTeam } from '../lib/data';
import { ago, day, kickoff } from '../lib/time';
import { Chevron } from '../icons';

export type TeamState = ReturnType<typeof useTeam>;

export function Updated({ data }: { data: TeamData | null }) {
  if (!data) return null;
  return (
    <p class="updated">
      {data.source === 'seed'
        ? 'Starter data from the official 2026 schedule. Live ESPN data replaces it after the first update.'
        : `Updated ${ago(data.updatedAt)}`}
    </p>
  );
}

export function Loading({ team }: { team: TeamState }) {
  if (team.error)
    return (
      <div class="panel empty">
        <strong>Couldn't load the latest data.</strong>
        <span class="small">Check your connection, then tap refresh at the top.</span>
      </div>
    );
  return <div class="panel empty">Loading…</div>;
}

export const vsAt = (e: GameEvent) => (e.neutral ? 'vs' : e.home ? 'vs' : 'at');

export function GameRow({ e, sport, brief }: { e: GameEvent; sport: SportKey; brief?: BriefIndexEntry }) {
  return (
    <a class="row" href={`#game/${sport}/${e.id}`}>
      {e.status === 'post' ? <span class={`result ${e.result ?? ''}`}>{e.result}</span> : <span class="result muted" aria-hidden="true"></span>}
      <Logo id={e.opponent.id || undefined} src={e.opponent.logo} size={30} />
      <div class="grow">
        <div class="title">
          <span class="muted">{vsAt(e)}</span> {e.opponent.short}
        </div>
        <div class="small muted">
          {day(e.date)}
          {e.status === 'post' ? '' : `, ${kickoff(e.date, e.timeTbd)}`}
          {e.tv ? `, ${e.tv}` : ''}
        </div>
      </div>
      {e.conference && <span class="pill">Sun Belt</span>}
      {brief && <span class="pill accent">{brief.status === 'final' ? brief.letter ?? 'Graded' : 'Brief'}</span>}
      {e.status === 'post' && (
        <span class="num" style="font-size:1.15rem">
          {e.usScore}-{e.oppScore}
        </span>
      )}
      {e.status === 'in' && <span class="pill live">Live</span>}
      <Chevron />
    </a>
  );
}

export function Logo({ id, src, size = 28 }: { id?: string; src?: string; size?: number }) {
  const url = src ?? (id ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png` : undefined);
  if (!url) return null;
  return (
    <img
      class="logo"
      src={url}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
    />
  );
}

export function StandingsTable({ groups, usId, compact }: { groups: StandingGroup[]; usId: string; compact?: boolean }) {
  return (
    <>
      {groups.map((g) => (
        <section class="section" key={g.name}>
          {!compact && <h2>{g.name}</h2>}
          {compact && groups.length > 1 && <span class="label">{g.name}</span>}
          <div class="panel table-wrap">
            <table>
              <thead><tr><th>Team</th><th class="n">Conf</th><th class="n">Overall</th></tr></thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.teamId} class={r.teamId === usId ? 'us' : ''}>
                    <td><span class="team-cell"><Logo id={r.teamId} size={22} />{r.team}</span></td>
                    <td class="n">{r.conf}</td>
                    <td class="n">{r.overall}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
