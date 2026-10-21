import type { RankingRow, RankingWeek, Rankings as RankingsData, SportKey } from '../lib/types';
import { SPORT_LABEL } from '../lib/data';
import { day, longDay } from '../lib/time';
import { Logo } from './parts';

const US = '6';

export function latestWeek(data: RankingsData | null, sport: SportKey): [RankingWeek | undefined, RankingWeek | undefined] {
  const weeks = data?.[sport]?.weeks ?? [];
  return [weeks[0], weeks[1]];
}

// Movement since last week: positive = moved up.
export const movement = (row: RankingRow, prev?: RankingWeek) => {
  const before = prev?.rows.find((r) => r.teamId === row.teamId)?.rank;
  return before === undefined ? undefined : before - row.rank;
};

export function Move({ n }: { n?: number }) {
  if (n === undefined) return <span class="move muted">new</span>;
  if (n === 0) return <span class="move muted" aria-label="No change">–</span>;
  return (
    <span class={`move ${n > 0 ? 'up' : 'down'}`} aria-label={`${n > 0 ? 'Up' : 'Down'} ${Math.abs(n)}`}>
      {n > 0 ? '▲' : '▼'}
      {Math.abs(n)}
    </span>
  );
}

export function Rankings({ sport, data, error }: { sport: SportKey; data: RankingsData | null; error: string | null }) {
  const [week, prev] = latestWeek(data, sport);
  return (
    <>
      <div class="page-head">
        <span class="label">{SPORT_LABEL[sport]}</span>
        <h1>Sun Belt power rankings</h1>
        {week && (
          <p class="small muted">
            Posted {longDay(week.postedAt)}
            {prev ? `. Moves are since ${day(prev.postedAt)}.` : '.'}
            {week.source === 'formula' && ' Formula order; Claude adds blurbs Sunday mornings.'}
          </p>
        )}
      </div>

      {!week ? (
        <div class="card empty">
          <strong>{error && !data ? "Couldn't load the rankings." : `No ${SPORT_LABEL[sport].toLowerCase()} ranking yet.`}</strong>
          <span class="small">
            {sport === 'mbb'
              ? 'Basketball rankings start once most Sun Belt teams have played.'
              : 'The first ranking posts with the next data update.'}
          </span>
        </div>
      ) : (
        <ol class="panel list rank-list">
          {week.rows.map((r) => (
            <li class={`rank-row${r.teamId === US ? ' us' : ''}`} key={r.teamId}>
              <div class="rank-top">
                <span class="rank-n">{r.rank}</span>
                {prev && <Move n={movement(r, prev)} />}
                <Logo src={r.logo} id={r.teamId} size={32} />
                <div class="grow">
                  <div class="title">{r.team}</div>
                  <div class="small muted">
                    {r.record}, {r.conf} Sun Belt
                    {r.last && (
                      <>
                        . <span class={`result-inline ${r.last.result}`}>{r.last.result}</span> {r.last.score} {r.last.at} {r.last.opp}
                      </>
                    )}
                  </div>
                </div>
              </div>
              {r.blurb && <p class="rank-blurb">{r.blurb}</p>}
              {r.adjust && r.rank !== r.formulaRank && (
                <p class="small muted rank-adjust">
                  Formula had them #{r.formulaRank}. {r.adjust}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <section class="section">
        <h2>How it works</h2>
        <div class="prose small muted">
          <p>
            Every Sunday a formula ranks all 14 teams: win percentage (35%), Sun Belt win percentage (20%), scoring margin
            (20%, capped per game so blowouts don't dominate), strength of schedule (15%) and the last three games (10%).
          </p>
          <p>
            Claude then reads the week's games, can move a team up to two spots with a stated reason, and writes a short
            blurb for each team. If the Claude job is off, the formula ranking still posts.
          </p>
        </div>
      </section>
    </>
  );
}
