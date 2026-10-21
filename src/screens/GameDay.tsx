import type { BriefIndexEntry, GameEvent, SportKey } from '../lib/types';
import { lastResult, nextGame, SPORT_LABEL } from '../lib/data';
import { Chevron, IconBrief } from '../icons';
import { Game } from './Game';
import { Loading, NewsList, TeamState } from './parts';

// The game Game Day is about: a live game, else last night's game until the
// next morning (postgame grade time), else the next one on the schedule.
export function gameDayEvent(events: GameEvent[], now = Date.now()): GameEvent | undefined {
  const live = events.find((e) => e.status === 'in');
  if (live) return live;
  const last = lastResult(events);
  if (last && now - Date.parse(last.date) < 20 * 36e5) return last;
  return nextGame(events, now);
}

export function GameDay({ sport, team, briefs }: { sport: SportKey; team: TeamState; briefs: BriefIndexEntry[] | null }) {
  const data = team.data?.sport === sport ? team.data : null;
  if (!data) return <Loading team={team} />;
  const e = gameDayEvent(data.events);
  // Stories about this matchup: name the opponent, within 8 days of kickoff.
  const coverage = e
    ? data.news.filter((n) => n.title.toLowerCase().includes(e.opponent.short.toLowerCase()) && (!n.date || Math.abs(Date.parse(n.date) - Date.parse(e.date)) < 8 * 864e5))
    : [];
  return (
    <>
      <div class="page-head">
        <span class="label">{SPORT_LABEL[sport]}</span>
        <h1>Game Day</h1>
      </div>
      {e ? (
        <Game sport={sport} id={e.id} team={team} briefs={briefs} label={e.status === 'post' ? 'Final' : e.status === 'in' ? 'Live' : 'Next game'} />
      ) : (
        <section class="card empty">No game on the schedule right now.</section>
      )}
      {coverage.length > 0 && (
        <section class="section">
          <h2>{e!.status === 'post' ? 'Recap and photos' : 'Matchup coverage'}</h2>
          <NewsList items={coverage.slice(0, 4)} />
        </section>
      )}
      <section class="section">
        <div class="panel list">
          <a class="row" href="#briefs">
            <IconBrief />
            <div class="grow">
              <div class="title">All Game Day briefs</div>
              <div class="small muted">Previews, picks, postgame grades and the season scorecard</div>
            </div>
            <Chevron />
          </a>
        </div>
      </section>
    </>
  );
}
