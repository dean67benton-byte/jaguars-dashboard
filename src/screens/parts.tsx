import type { BriefIndexEntry, GameEvent, SportKey, StandingGroup, TeamData } from '../lib/types';
import { useTeam } from '../lib/data';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ago, countdown, day, kickoff } from '../lib/time';
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
              <thead><tr><th>#</th><th>Team</th><th class="n">Conf</th><th class="n">Overall</th></tr></thead>
              <tbody>
                {g.rows.map((r, i) => (
                  <tr key={r.teamId} class={r.teamId === usId ? 'us' : ''}>
                    <td class="rank">{i + 1}</td>
                    <td><span class="team-cell"><Logo id={r.teamId} size={24} />{r.team}</span></td>
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

// "3d 14h", "4h 12m", "12:05" under an hour.
export function countdownText(iso: string, now: number) {
  const c = countdown(iso, now);
  if (c.d > 0) return `${c.d}d ${c.h}h`;
  if (c.h > 0) return `${c.h}h ${c.m}m`;
  return `${c.m}:${String(c.s).padStart(2, '0')}`;
}

export function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// One card for any game: two team lines (Apple Sports style), then either the
// countdown or the live/final status, then date, kickoff, TV and venue.
export function GameCard({
  e,
  label,
  usLogo,
  usRecord,
  oppRecord,
  usScore,
  oppScore,
  state,
  detail,
  children,
}: {
  e: GameEvent;
  label: string;
  usLogo?: string;
  usRecord?: string;
  oppRecord?: string;
  usScore?: number;
  oppScore?: number;
  state: GameEvent['status'];
  detail?: string;
  children?: ComponentChildren;
}) {
  const now = useNow(state === 'pre' ? 1000 : 60e3);
  const scored = state !== 'pre' && usScore !== undefined;
  const usLine = (
    <div class={`team-line us${scored && usScore! > (oppScore ?? 0) ? ' ahead' : ''}`} key="us">
      <Logo src={usLogo} id="6" size={40} />
      <span class="name">South Alabama{usRecord && <span class="rec">{usRecord}</span>}</span>
      {scored && <span class="score">{usScore}</span>}
    </div>
  );
  const oppLine = (
    <div class="team-line" key="opp">
      <Logo src={e.opponent.logo} id={e.opponent.id || undefined} size={40} />
      <span class="name">{e.opponent.short}{oppRecord && <span class="rec">{oppRecord}</span>}</span>
      {scored && <span class="score">{oppScore}</span>}
    </div>
  );
  const started = state === 'pre' && Date.parse(e.date) <= now;
  return (
    <section class="card game-card" aria-label={label}>
      <div class="top">
        {state === 'in' ? <span class="pill live">Live</span> : <span class="label">{label}</span>}
        <span class="small muted">{e.conference ? 'Sun Belt' : 'Non-conference'}, {e.neutral ? 'neutral site' : e.home ? 'home' : 'away'}</span>
      </div>
      {/* Away team on top, like a scoreboard. */}
      <div class="teams">{e.home || e.neutral ? [oppLine, usLine] : [usLine, oppLine]}</div>
      <div class="when">
        {state === 'pre' ? (
          <span class="cd" role="timer">
            {started ? 'Kickoff' : countdownText(e.date, now)}
            <small>{started ? 'waiting on first update' : 'until kickoff'}</small>
          </span>
        ) : (
          <span class="cd">{state === 'post' ? 'Final' : detail ?? 'In progress'}{state === 'post' && detail && detail !== 'Final' && <small>{detail}</small>}</span>
        )}
      </div>
      <div class="meta">
        <span><strong>{day(e.date)}</strong></span>
        <span>{kickoff(e.date, e.timeTbd)}</span>
        {e.tv && <span>{e.tv}</span>}
        {(e.venue || e.city) && <span>{[e.venue, e.city].filter(Boolean).join(', ')}</span>}
      </div>
      {children && <div class="actions">{children}</div>}
    </section>
  );
}
