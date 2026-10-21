import { useEffect, useState } from 'preact/hooks';
import type { BriefIndexEntry, GameEvent, SportKey, TeamData } from '../lib/types';
import { briefFor, lastResult, LISTEN_URL, nextGame, SPORT_LABEL } from '../lib/data';
import { countdown, day, kickoff, longDay, ago } from '../lib/time';
import { hasEspnId, isLiveWindow, useSummary } from '../lib/live';
import { useSettings } from '../lib/settings';
import { IconBrief, IconRadio } from '../icons';
import { GameRow, Loading, Logo, StandingsTable, TeamState, Updated, vsAt } from './parts';
import { useLiveStandings } from '../lib/standings';

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function NextGame({ sport, e, record, brief, usLogo }: { sport: SportKey; e: GameEvent; record?: string; brief?: BriefIndexEntry; usLogo?: string }) {
  const settings = useSettings();
  const now = useNow(1000);
  const liveWindow = isLiveWindow(e, now);
  const { summary, updatedAt } = useSummary(sport, e, liveWindow && settings.liveScores);
  const state = summary?.state ?? e.status;
  const live = state === 'in';
  const c = countdown(e.date, now);
  const started = c.done || live;

  return (
    <section class="panel hero" aria-label="Next game">
      <div class="section-head">
        {live ? <span class="pill live">Live</span> : <span class="label">{started ? 'Game time' : 'Next game'}</span>}
        <span class="small muted">{SPORT_LABEL[sport]}{e.conference ? ', Sun Belt game' : ''}</span>
      </div>

      <div class="matchup-line">
        <div class="team-block">
          <Logo src={usLogo} id="6" size={44} />
          <span class="t">South Alabama</span>
          <span class="r">{record}</span>
        </div>
        <span class="at">{vsAt(e)}</span>
        <div class="team-block right">
          <Logo src={e.opponent.logo} id={e.opponent.id || undefined} size={44} />
          <span class="t">{e.opponent.short}</span>
          <span class="r">{e.opponent.record}</span>
        </div>
      </div>

      {started && summary && summary.usScore !== undefined ? (
        <div>
          <div class="score-big">
            <span class="v">{summary.usScore}</span>
            <span class="small muted" style="text-align:center">{summary.detail}</span>
            <span class="v" style="text-align:right">{summary.oppScore}</span>
          </div>
          {summary.situation && <p class="small muted" style="text-align:center">{summary.situation}</p>}
          {updatedAt && <p class="updated">Score updated {ago(new Date(updatedAt).toISOString(), now)}{settings.liveScores ? '. Refreshes every 30 seconds.' : '. Live updates are off.'}</p>}
        </div>
      ) : started ? (
        <p class="note">
          {hasEspnId(e)
            ? settings.liveScores
              ? 'Loading the live score from ESPN…'
              : 'Live scores are off in Settings. Tap Matchup for the latest.'
            : 'Live scores start once the first ESPN update has run.'}
        </p>
      ) : (
        <div class="clock" role="timer" aria-label="Time until kickoff">
          <div><div class="v">{c.d}</div><div class="u">days</div></div>
          <div><div class="v">{c.h}</div><div class="u">hrs</div></div>
          <div><div class="v">{String(c.m).padStart(2, '0')}</div><div class="u">min</div></div>
          <div><div class="v">{String(c.s).padStart(2, '0')}</div><div class="u">sec</div></div>
        </div>
      )}

      <div class="meta">
        <span><strong>{longDay(e.date)}</strong></span>
        <span>{kickoff(e.date, e.timeTbd)}</span>
        {e.tv && <span>TV <strong>{e.tv}</strong></span>}
        {(e.venue || e.city) && <span>{[e.venue, e.city].filter(Boolean).join(', ')}</span>}
      </div>

      <div class="actions">
        {brief && (
          <a class="btn primary" href={`#brief/${brief.id}`}>
            <IconBrief /> {brief.status === 'final' ? 'Postgame grade' : 'Game Day brief'}
          </a>
        )}
        <a class="btn" href={`#game/${sport}/${e.id}`}>Matchup</a>
        <a class="btn" href={LISTEN_URL} target="_blank" rel="noopener">
          <IconRadio /> Listen live
        </a>
      </div>
    </section>
  );
}

function LatestBrief({ index, sport }: { index: BriefIndexEntry[] | null; sport: SportKey }) {
  const latest = index?.filter((b) => b.sport === sport).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  if (!latest) return null;
  return (
    <section class="section">
      <div class="section-head">
        <h2>Latest analysis</h2>
        <a href="#briefs">All briefs</a>
      </div>
      <a class="panel row" href={`#brief/${latest.id}`}>
        {latest.letter ? <span class="grade-letter" style="font-size:2rem">{latest.letter}</span> : <IconBrief />}
        <div class="grow">
          <div class="title">
            {latest.status === 'final' ? 'Postgame grade' : 'Game Day brief'}: {latest.opponent}
          </div>
          <div class="small muted">
            {day(latest.date)}. Pick: {latest.pick}
            {latest.accuracyPct != null && `. Brief ${latest.accuracyPct}% accurate`}
          </div>
        </div>
      </a>
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
        <a href="#team">Full standings</a>
      </div>
      <StandingsTable groups={ours} usId={data.team.id} compact />
      <p class="small muted">{live ? 'Live from ESPN.' : 'From the last update.'}</p>
    </section>
  );
}

export function Home({ sport, team, briefs }: { sport: SportKey; team: TeamState; briefs: BriefIndexEntry[] | null }) {
  const data = team.data?.sport === sport ? team.data : null;
  if (!data) return <Loading team={team} />;
  const next = nextGame(data.events);
  const last = lastResult(data.events);
  const record = [data.team.record, data.team.confRecord ? `${data.team.confRecord} Sun Belt` : data.team.standingSummary].filter(Boolean).join(', ');

  return (
    <>
      {next ? (
        <NextGame sport={sport} e={next} record={record} brief={briefFor(briefs, next)} usLogo={data.team.logo} />
      ) : (
        <section class="panel empty">
          <strong>No upcoming {SPORT_LABEL[sport].toLowerCase()} games on the schedule yet.</strong>
          <span class="small">The schedule fills in automatically once it is published.</span>
        </section>
      )}

      <div class="grid-2">
        <div style="display:grid;gap:22px;min-width:0">
          <LatestBrief index={briefs} sport={sport} />
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
        </div>
        <div style="display:grid;gap:22px;min-width:0">
        <SunBelt sport={sport} data={data} />
        <section class="section">
          <div class="section-head">
            <h2>Headlines</h2>
            <a href="#news">All news</a>
          </div>
          <div class="panel list">
            {data.news.slice(0, 3).map((n) => (
              <a class="row" href={n.url} target="_blank" rel="noopener" key={n.url}>
                <div class="grow">
                  <div class="title">{n.title}</div>
                  <div class="small muted">
                    {n.source}
                    {n.date ? `, ${day(n.date)}` : ''}
                  </div>
                </div>
              </a>
            ))}
            {!data.news.length && <div class="empty small">No headlines yet.</div>}
          </div>
        </section>
        </div>
      </div>
      <Updated data={data} />
    </>
  );
}
