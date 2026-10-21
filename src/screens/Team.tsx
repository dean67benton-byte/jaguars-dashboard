import { useEffect, useState } from 'preact/hooks';
import type { SportKey } from '../lib/types';
import { SPORT_LABEL } from '../lib/data';
import { Headshot, Loading, Logo, StandingsTable, TeamState, Updated } from './parts';
import { useLiveStandings } from '../lib/standings';
import { useSettings } from '../lib/settings';

type View = 'stats' | 'roster' | 'standings';
const VIEWS: View[] = ['stats', 'roster', 'standings'];

export function Team({ sport, team, initial }: { sport: SportKey; team: TeamState; initial?: string }) {
  const start = VIEWS.find((v) => v === initial) ?? 'stats';
  const [view, setView] = useState<View>(start);
  useEffect(() => setView(start), [start]);
  const settings = useSettings();
  const data = team.data?.sport === sport ? team.data : null;
  const standings = useLiveStandings(sport, data?.standings ?? [], view === 'standings' && settings.autoRefresh);
  if (!data) return <Loading team={team} />;
  const pending = <div class="panel empty">This fills in after the first daily update (5 a.m. Central).</div>;

  return (
    <>
      <div class="section-head" style="flex-wrap:wrap">
        <h1 class="team-cell"><Logo src={data.team.logo} id="6" size={36} />{SPORT_LABEL[sport]}</h1>
        <span class="small muted">{[data.team.record, data.team.standingSummary].filter(Boolean).join(', ')}</span>
      </div>
      <div class="seg" role="group" aria-label="Team view">
        {VIEWS.map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
            {v === 'stats' ? 'Stats' : v === 'roster' ? 'Roster' : 'Sun Belt'}
          </button>
        ))}
      </div>

      {view === 'stats' && (
        <>
          {data.leaders.length > 0 && (
            <section class="section">
              <h2>Team leaders</h2>
              <div class="tiles">
                {data.leaders.map((l) => (
                  <div class="panel tile" key={l.category}>
                    <span class="label">{l.category}</span>
                    <span style="font-weight:600">{l.name}</span>
                    <span class="small muted">{l.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.stats.length
            ? data.stats.map((c) => (
                <section class="section" key={c.name}>
                  <h2>{c.name}</h2>
                  <div class="panel table-wrap">
                    <table>
                      <tbody>
                        {c.stats.slice(0, 12).map((s) => (
                          <tr key={s.name}>
                            <td>{s.label}</td>
                            <td class="n">{s.value}</td>
                            <td class="n small muted">{s.rank ? `#${s.rank.replace(/^#/, '')}` : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            : pending}
        </>
      )}

      {view === 'roster' &&
        (data.roster.length ? (
          <div class="panel table-wrap">
            <table>
              <thead><tr><th class="n">#</th><th>Name</th><th>Pos</th><th>Class</th><th>Ht / Wt</th><th>Hometown</th></tr></thead>
              <tbody>
                {data.roster.map((p) => (
                  <tr key={p.name + p.number}>
                    <td class="n">{p.number}</td>
                    <td style="font-weight:600;white-space:nowrap"><span class="player-cell"><Headshot src={p.headshot} size={34} />{p.name}</span></td>
                    <td>{p.pos}</td>
                    <td>{p.cls}</td>
                    <td style="white-space:nowrap">{[p.ht, p.wt].filter(Boolean).join(', ')}</td>
                    <td>{p.hometown}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : pending)}

      {view === 'standings' &&
        (standings.groups.length ? (
          <>
            <StandingsTable groups={standings.groups} usId={data.team.id} />
            <p class="small muted">{standings.live ? 'Live from ESPN.' : 'From the last update.'}</p>
          </>
        ) : pending)}
      <Updated data={data} />
    </>
  );
}
