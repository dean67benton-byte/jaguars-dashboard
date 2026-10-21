import type { BriefIndexEntry, SportKey } from '../lib/types';
import { briefFor, SPORT_LABEL } from '../lib/data';
import { GameRow, Loading, TeamState, Updated } from './parts';

export function Schedule({ sport, team, briefs }: { sport: SportKey; team: TeamState; briefs: BriefIndexEntry[] | null }) {
  const data = team.data?.sport === sport ? team.data : null;
  if (!data) return <Loading team={team} />;
  const done = data.events.filter((e) => e.status === 'post');
  const ahead = data.events.filter((e) => e.status !== 'post');
  const w = done.filter((e) => e.result === 'W').length;
  const l = done.filter((e) => e.result === 'L').length;

  return (
    <>
      <div class="section-head">
        <h1>{SPORT_LABEL[sport]} schedule</h1>
        <span class="num" style="font-size:1.3rem">{data.team.record ?? `${w}-${l}`}</span>
      </div>
      {!data.events.length && <div class="panel empty">The schedule hasn't been published yet.</div>}
      {ahead.length > 0 && (
        <section class="section">
          <span class="label">Upcoming · {ahead.length}</span>
          <div class="panel list">
            {ahead.map((e) => <GameRow key={e.id} e={e} sport={sport} brief={briefFor(briefs, e)} />)}
          </div>
        </section>
      )}
      {done.length > 0 && (
        <section class="section">
          <span class="label">Results · {w}-{l}</span>
          <div class="panel list">
            {[...done].reverse().map((e) => <GameRow key={e.id} e={e} sport={sport} brief={briefFor(briefs, e)} />)}
          </div>
        </section>
      )}
      <Updated data={data} />
    </>
  );
}
