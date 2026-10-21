import type { BriefIndexEntry, GameEvent, SportKey, TeamData } from '../lib/types';
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
      {e.status === 'post' ? <span class={`result ${e.result ?? ''}`}>{e.result}</span> : <span class="result muted">·</span>}
      <div class="grow">
        <div class="title">
          <span class="muted">{vsAt(e)}</span> {e.opponent.short}
        </div>
        <div class="small muted">
          {day(e.date)}
          {e.status === 'post' ? '' : ` · ${kickoff(e.date, e.timeTbd)}`}
          {e.tv ? ` · ${e.tv}` : ''}
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
