import type { BriefIndexEntry, GameEvent, RankingRow, Rankings, SportKey, TeamData } from '../lib/types';
import { briefFor, lastResult, LISTEN_URL, nextGame, SPORT_LABEL } from '../lib/data';
import { day, ago } from '../lib/time';
import { hasEspnId, isLiveWindow, useSummary } from '../lib/live';
import { useSettings } from '../lib/settings';
import { IconGameDay, IconRadio } from '../icons';
import { GameCard, GameRow, Loading, NewsList, StandingsTable, TeamState, Updated, useNow } from './parts';
import { useLiveStandings } from '../lib/standings';
import { latestWeek } from './Rankings';

function NextGame({ sport, e, record, usLogo }: { sport: SportKey; e: GameEvent; record?: string; usLogo?: string }) {
  const settings = useSettings();
  const now = useNow(30e3);
  const liveWindow = isLiveWindow(e, now);
  const { summary, updatedAt } = useSummary(sport, e, liveWindow && settings.liveScores);
  const state = summary?.state ?? e.status;

  return (
    <div class="section">
      <GameCard
        e={e}
        label="Next game"
        usLogo={usLogo}
        usRecord={record}
        oppRecord={e.opponent.record}
        usScore={summary?.usScore}
        oppScore={summary?.oppScore}
        state={state}
        detail={summary?.detail}
      >
        <a class="btn primary" href="#gameday"><IconGameDay /> Game Day</a>
        <a class="btn" href={LISTEN_URL} target="_blank" rel="noopener"><IconRadio /> Listen live</a>
      </GameCard>
      {state === 'in' && updatedAt && (
        <p class="updated">Score updated {ago(new Date(updatedAt).toISOString(), now)}{settings.liveScores ? '. Refreshes every 30 seconds.' : '. Live updates are off.'}</p>
      )}
      {state === 'in' && !summary && !hasEspnId(e) && <p class="note">Live scores start once the first ESPN update has run.</p>}
    </div>
  );
}

function LatestBrief({ index, sport }: { index: BriefIndexEntry[] | null; sport: SportKey }) {
  const latest = index?.filter((b) => b.sport === sport).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  if (!latest) return null;
  const graded = latest.status === 'final';
  return (
    <section class="section">
      <div class="section-head">
        <h2>Latest analysis</h2>
        <a href="#briefs">All briefs</a>
      </div>
      <div class="panel list">
        <a class="row" href={`#brief/${latest.id}`}>
          {latest.letter && <span class="grade-letter" style="font-size:2.2rem;min-width:1.6ch">{latest.letter}</span>}
          <div class="grow">
            <div class="title">{graded ? 'Postgame grade' : 'Game Day brief'}: {latest.opponent}</div>
            <div class="small muted">
              {day(latest.date)}. Pick {latest.pick}
              {latest.accuracyPct != null && `. Brief ${latest.accuracyPct}% accurate`}
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}

function Snapshot({ data, rank }: { data: TeamData; rank?: RankingRow }) {
  const done = data.events.filter((e) => e.status === 'post');
  const conf = done.filter((e) => e.conference);
  const rec = (list: GameEvent[]) => `${list.filter((e) => e.result === 'W').length}-${list.filter((e) => e.result === 'L').length}`;
  // Current streak from the most recent result backwards.
  let streak = '';
  for (let i = done.length - 1, n = 0; i >= 0; i--) {
    if (done[i].result !== done[done.length - 1].result) break;
    streak = `${done[i].result}${++n}`;
  }
  const cells = [
    { k: 'Overall', v: data.team.record ?? rec(done) },
    { k: 'Sun Belt', v: data.team.confRecord ?? rec(conf) },
    { k: 'Streak', v: streak || '-' },
    ...(rank ? [{ k: 'Power', v: `#${rank.rank}` }] : []),
  ];
  return (
    <section class="section">
      <div class="section-head">
        <h2>Jaguars at a glance</h2>
        <a href="#team">Team</a>
      </div>
      <div class="strip">
        {cells.map((c) => (
          <div key={c.k}>
            <span class="label">{c.k}</span>
            <span class="v">{c.v}</span>
          </div>
        ))}
      </div>
      <p class="small muted">
        {data.team.standingSummary && `${data.team.standingSummary} standings. `}
        {rank && <a href="#rankings" style="color:var(--fg)">#{rank.rank} in our power rankings</a>}
      </p>
    </section>
  );
}

function SunBelt({ sport, data }: { sport: SportKey; data: TeamData }) {
  const settings = useSettings();
  const { groups, live } = useLiveStandings(sport, data.standings, settings.autoRefresh);
  const ours = groups.filter((g) => g.rows.some((r) => r.teamId === data.team.id));
  if (!ours.length) return null;
  return (
    <section class="section">
      <div class="section-head">
        <h2>{ours[0].name}</h2>
        <a href="#team/standings">Full standings</a>
      </div>
      <StandingsTable groups={ours} usId={data.team.id} compact />
      <p class="small muted">{live ? 'Live from ESPN.' : 'From the last update.'}</p>
    </section>
  );
}

export function Home({ sport, team, briefs, rankings }: { sport: SportKey; team: TeamState; briefs: BriefIndexEntry[] | null; rankings: Rankings | null }) {
  const data = team.data?.sport === sport ? team.data : null;
  if (!data) return <Loading team={team} />;
  const next = nextGame(data.events);
  const last = lastResult(data.events);
  const record = data.team.record;

  return (
    <>
      {next ? (
        <NextGame sport={sport} e={next} record={record} usLogo={data.team.logo} />
      ) : (
        <section class="card empty">
          <strong>No upcoming {SPORT_LABEL[sport].toLowerCase()} games on the schedule yet.</strong>
          <span class="small">The schedule fills in automatically once it is published.</span>
        </section>
      )}

      <div class="grid-2">
        <div class="stack">
          {last && (
            <section class="section">
              <div class="section-head">
                <h2>Last result</h2>
                <a href="#schedule">Schedule</a>
              </div>
              <div class="panel list">
                <GameRow e={last} sport={sport} brief={briefFor(briefs, last)} />
              </div>
            </section>
          )}
          <LatestBrief index={briefs} sport={sport} />
          <section class="section">
            <div class="section-head">
              <h2>Headlines</h2>
              <a href="#news">All news</a>
            </div>
            <NewsList items={data.news.slice(0, 4)} />
          </section>
        </div>
        <div class="stack">
          <Snapshot data={data} rank={latestWeek(rankings, sport)[0]?.rows.find((r) => r.teamId === data.team.id)} />
          <SunBelt sport={sport} data={data} />
        </div>
      </div>
      <Updated data={data} />
    </>
  );
}
