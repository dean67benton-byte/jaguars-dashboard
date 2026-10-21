import type { BriefIndexEntry, SportKey, StatCategory } from '../lib/types';
import { briefFor, LISTEN_URL } from '../lib/data';
import { hasEspnId, isLiveWindow, useSummary } from '../lib/live';
import { useSettings } from '../lib/settings';
import { IconBrief, IconRadio } from '../icons';
import { GameCard, Loading, TeamState } from './parts';

function sideBySide(us: StatCategory[], them: StatCategory[]) {
  const theirs = new Map(them.flatMap((c) => c.stats.map((s) => [`${c.name}|${s.name}`, s])));
  const rows = us.flatMap((c) =>
    c.stats
      .filter((s) => theirs.has(`${c.name}|${s.name}`))
      .map((s) => ({ label: s.label, us: s.value, them: theirs.get(`${c.name}|${s.name}`)!.value, cat: c.name })),
  );
  // Prefer per-game and rate stats; they compare fairly across schedules.
  const seen = new Set<string>();
  const unique = rows.filter((r) => !seen.has(r.label) && seen.add(r.label));
  const rate = unique.filter((r) => /per game|avg|average|pct|%|per/i.test(r.label));
  return (rate.length >= 6 ? rate : unique).slice(0, 14);
}

export function Game({ sport, id, team, briefs, label }: { sport: SportKey; id: string; team: TeamState; briefs: BriefIndexEntry[] | null; label?: string }) {
  const settings = useSettings();
  const data = team.data?.sport === sport ? team.data : null;
  const e = data?.events.find((x) => x.id === id);
  const live = isLiveWindow(e);
  const { summary, error, reload } = useSummary(sport, e, live && settings.liveScores);
  if (!data) return <Loading team={team} />;
  if (!e) return <div class="panel empty">That game isn't on the schedule anymore. <a href="#schedule">Back to schedule</a></div>;

  const brief = briefFor(briefs, e);
  const opp = data.nextOpponent?.team.id && data.nextOpponent.team.id === e.opponent.id ? data.nextOpponent : null;
  const compare = opp ? sideBySide(data.stats, opp.stats) : [];
  const state = summary?.state ?? e.status;
  const usScore = summary?.usScore ?? e.usScore;
  const oppScore = summary?.oppScore ?? e.oppScore;

  return (
    <>
      <GameCard
        e={e}
        label={label ?? (state === 'post' ? 'Final' : 'Matchup')}
        usLogo={data.team.logo}
        usRecord={data.team.record}
        oppRecord={opp?.team.record ?? e.opponent.record}
        usScore={usScore}
        oppScore={oppScore}
        state={state}
        detail={summary?.detail ?? e.statusDetail}
      >
        {brief && (
          <a class="btn primary" href={`#brief/${brief.id}`}>
            <IconBrief /> {brief.status === 'final' ? 'Postgame grade' : 'Game Day brief'}
          </a>
        )}
        <a class="btn" href={LISTEN_URL} target="_blank" rel="noopener"><IconRadio /> Listen live</a>
        {hasEspnId(e) && state !== 'pre' && <button class="btn" onClick={() => reload()}>Refresh</button>}
      </GameCard>

      {!hasEspnId(e) && <p class="note">Win probability, injuries, weather and recent form load from ESPN once the first data update has run.</p>}
      {error && <p class="note">{error}</p>}

      {summary?.winProb && (
        <section class="section">
          <h2>ESPN win probability{state === 'pre' ? '' : state === 'in' ? ', live' : ', final'}</h2>
          <div style="display:grid;gap:8px">
            <div style="display:flex;justify-content:space-between" class="num">
              <span>USA {summary.winProb.us.toFixed(1)}%</span>
              <span>{e.opponent.abbr || e.opponent.short} {summary.winProb.opp.toFixed(1)}%</span>
            </div>
            <div style="height:8px;border-radius:999px;background:var(--surface-2);overflow:hidden">
              <div style={`height:100%;width:${summary.winProb.us}%;background:var(--red)`} />
            </div>
          </div>
        </section>
      )}

      <div class="grid-2">
        {compare.length > 0 && (
          <section class="section">
            <h2>Season stats, side by side</h2>
            <div class="panel table-wrap">
              <table>
                <thead><tr><th>Stat</th><th class="n">USA</th><th class="n">{e.opponent.abbr || 'OPP'}</th></tr></thead>
                <tbody>
                  {compare.map((r) => (
                    <tr key={r.cat + r.label}><td>{r.label}</td><td class="n">{r.us}</td><td class="n">{r.them}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {summary && summary.lastFive.length > 0 && (
          <section class="section">
            <h2>Recent form</h2>
            <div class="panel list">
              {summary.lastFive.map((t) => (
                <div class="row" key={t.team} style="flex-wrap:wrap">
                  <strong style="width:52px">{t.team === 'USA' ? 'USA' : e.opponent.abbr || 'OPP'}</strong>
                  <div class="grow" style="display:flex;gap:6px;flex-wrap:wrap">
                    {t.games.map((g, i) => (
                      <span key={i} class={`pill ${g.result === 'W' ? 'good' : g.result === 'L' ? 'bad' : ''}`} title={g.label}>
                        {g.result} {g.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {summary && (summary.weather || summary.injuries.length > 0) && (
          <section class="section">
            <h2>Injuries and weather</h2>
            <div class="panel list">
              {summary.weather && <div class="row"><span class="label" style="width:70px">Weather</span><span class="grow">{summary.weather}</span></div>}
              {summary.injuries.slice(0, 12).map((i) => (
                <div class="row" key={i.team + i.name}>
                  <span class="label" style="width:70px">{i.team === 'USA' ? 'USA' : e.opponent.abbr || 'OPP'}</span>
                  <span class="grow">{i.name}</span>
                  <span class="small muted">{i.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {summary && summary.leaders.length > 0 && (
          <section class="section">
            <h2>{state === 'pre' ? 'Season leaders' : 'Game leaders'}</h2>
            <div class="panel list">
              {summary.leaders.map((l, i) => (
                <div class="row" key={i}>
                  <span class="label" style="width:52px">{l.team === 'USA' ? 'USA' : e.opponent.abbr || 'OPP'}</span>
                  <div class="grow"><div class="title">{l.name}</div><div class="small muted">{l.category}</div></div>
                  <span class="small">{l.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
