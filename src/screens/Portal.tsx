import { useState } from 'preact/hooks';
import type { Coach, Level, OutlookData, PortalData, PortalPlayer, Risk, SportKey, TeamData } from '../lib/types';
import { SPORT_LABEL } from '../lib/data';
import { day, longDay } from '../lib/time';
import { Headshot } from './parts';

const LEVELS: { key: Level; label: string }[] = [
  { key: 'P4', label: 'Power 4' },
  { key: 'G5', label: 'Group of 5' },
  { key: 'FCS', label: 'FCS' },
  { key: 'D2', label: 'Division II' },
  { key: 'D3', label: 'Division III' },
  { key: 'NAIA', label: 'NAIA' },
  { key: 'JUCO', label: 'Junior college' },
  { key: 'Intl', label: 'Overseas and Canada' },
];
const RISK_CLASS: Record<Risk, string> = { low: 'good', medium: 'warn', high: 'bad' };

type View = 'players' | 'coaches';

function Stats({ list }: { list: PortalPlayer['stats']['season'] }) {
  return (
    <div class="nfl-stats">
      {list.map((s) => (
        <span key={s.label}>
          <b>{s.value}</b> {s.label}
        </span>
      ))}
    </div>
  );
}

function PlayerRow({ p, season, lastSeason, transfer }: { p: PortalPlayer; season: string; lastSeason: string; transfer?: boolean }) {
  return (
    <li class="nfl-card">
      <div class="nfl-top">
        <Headshot src={p.headshot} size={48} />
        <div class="grow">
          <div class="title">{p.name}</div>
          <div class="small muted">
            {[p.pos, p.cls, transfer && p.from ? `from ${p.from}` : undefined].filter(Boolean).join(' · ')}
          </div>
        </div>
        {transfer && p.level && <span class="pill">{p.level}</span>}
      </div>
      {p.stats.season.length > 0 ? (
        <>
          <div class="small muted">
            {p.games} game{p.games === 1 ? '' : 's'} in {season}
          </div>
          <Stats list={p.stats.season} />
        </>
      ) : (
        <div class="small muted">{p.games > 0 ? `${p.games} game${p.games === 1 ? '' : 's'} in ${season}, no stats yet` : `No ${season} stats yet`}</div>
      )}
      {p.stats.last.length > 0 && (
        <div class="small muted">
          {lastSeason}
          {transfer && p.from ? ` at ${p.from}` : ''}: {p.stats.last.map((s) => `${s.value} ${s.label}`).join(', ')}
        </div>
      )}
    </li>
  );
}

function Players({ sport, data }: { sport: SportKey; data: PortalData }) {
  const d = data[sport];
  if (!d) return <div class="card empty">No {SPORT_LABEL[sport].toLowerCase()} portal data yet.</div>;
  const counts = LEVELS.map((l) => ({ ...l, n: d.incoming.filter((p) => p.level === l.key).length })).filter((l) => l.n);
  const max = Math.max(...counts.map((c) => c.n), 1);
  // Most-used first, so the ones playing a role lead.
  const incoming = [...d.incoming].sort((a, b) => b.games - a.games || b.stats.season.length - a.stats.season.length);
  const cells = [
    { k: 'Transfers in', v: d.incoming.length },
    { k: 'Starters back', v: d.starters.length },
    { k: `Back from ${d.lastSeason}`, v: d.returners },
  ];
  return (
    <>
      <div class="strip">
        {cells.map((c) => (
          <div key={c.k}>
            <span class="label">{c.k}</span>
            <span class="v">{c.v}</span>
          </div>
        ))}
      </div>
      <p class="small muted">
        {d.rosterSize} on the ESPN roster: {d.newcomers} new, {d.returners} back.
        {d.otherNew > 0 && ` ${d.otherNew} of the newcomers are freshmen or walk-ons.`}
      </p>

      <section class="section">
        <h2>Where the transfers came from</h2>
        <ul class="level-bars">
          {counts.map((c) => (
            <li key={c.key}>
              <span class="small">{c.label}</span>
              <span class="meter">
                <span style={`width:${(c.n / max) * 100}%`} />
              </span>
              <b>{c.n}</b>
            </li>
          ))}
        </ul>
      </section>

      <section class="section">
        <h2>Transfers in</h2>
        <ul class="panel list nfl-list">
          {incoming.map((p) => (
            <PlayerRow key={p.name} p={p} season={d.season} lastSeason={d.lastSeason} transfer />
          ))}
        </ul>
      </section>

      <section class="section">
        <h2>Returning starters</h2>
        {d.startersNote && <p class="small muted">{d.startersNote}</p>}
        {d.starters.length ? (
          <ul class="panel list nfl-list">
            {d.starters.map((p) => (
              <PlayerRow key={p.name} p={p} season={d.season} lastSeason={d.lastSeason} />
            ))}
          </ul>
        ) : (
          <div class="panel empty small">No returning starters found.</div>
        )}
      </section>

      {d.departures.length > 0 && (
        <section class="section">
          <h2>Notable departures</h2>
          <ul class="panel list">
            {d.departures.map((p) => (
              <li class="row" key={p.name}>
                <div class="grow">
                  <div class="title">{p.name}</div>
                  <div class="small muted">{[p.pos, p.to && `to ${p.to}`].filter(Boolean).join(' · ')}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p class="small muted">
        Updated {day(data.updatedAt)}. Rosters, stats and starts from ESPN; previous schools from usajaguars.com.
        {sport === 'mbb' && ' ESPN tracks only games against Division I teams, so lines from lower levels can be partial or missing.'}
      </p>
    </>
  );
}

// "4-3, 31.6 scored and 24.9 allowed per game" from the season so far.
function unitLine(c: Coach, team?: TeamData | null) {
  const done = team?.events.filter((e) => e.status === 'post' && e.usScore != null) ?? [];
  if (!done.length) return undefined;
  const avg = (k: 'usScore' | 'oppScore') => (done.reduce((n, e) => n + (e[k] ?? 0), 0) / done.length).toFixed(1);
  const w = done.filter((e) => e.result === 'W').length;
  if (c.unit === 'hc') return `${w}-${done.length - w} this season. ${avg('usScore')} points scored and ${avg('oppScore')} allowed per game.`;
  if (c.unit === 'oc') return `Offense: ${avg('usScore')} points per game this season.`;
  return `Defense: ${avg('oppScore')} points allowed per game this season.`;
}

function CoachCard({ c, team }: { c: Coach; team?: TeamData | null }) {
  const live = unitLine(c, team);
  return (
    <li class="coach-card">
      <div class="coach-top">
        <div class="grow">
          <div class="title">{c.name}</div>
          <div class="small muted">{c.role}</div>
        </div>
        <div class="coach-stay">
          <span class="grade-letter">{c.stayPct}%</span>
          <span class="label">Back next year</span>
        </div>
      </div>
      <div class="coach-pills">
        <span class={`pill ${RISK_CLASS[c.hotSeat]}`}>Hot seat: {c.hotSeat}</span>
        <span class={`pill ${RISK_CLASS[c.poach]}`}>Poach risk: {c.poach}</span>
      </div>
      <span class="meter" aria-hidden="true">
        <span style={`width:${c.stayPct}%`} />
      </span>
      <p class="small">{c.note}</p>
      {live && <div class="small">{live}</div>}
      <div class="small muted">{[c.since, c.record].filter(Boolean).join(' ')}</div>
    </li>
  );
}

function Coaches({ sport, data, team }: { sport: SportKey; data: OutlookData; team?: TeamData | null }) {
  const s = data[sport];
  const fired = data.history.items.filter((i) => i.outcome === 'fired').length;
  const hired = data.history.items.length - fired;
  return (
    <>
      <p class="small muted">
        {s?.asOf && `${s.asOf}. `}
        {data.source === 'claude' ? `Claude's read, updated ${longDay(data.updatedAt)} after the week's games.` : 'Claude\'s read. The Sunday analysis updates it after each week of games.'}
      </p>
      {s?.staff.length ? (
        <ul class="panel list nfl-list">
          {s.staff.map((c) => (
            <CoachCard key={c.name} c={c} team={team?.sport === sport ? team : null} />
          ))}
        </ul>
      ) : (
        <div class="panel empty small">No outlook yet for {SPORT_LABEL[sport].toLowerCase()}.</div>
      )}

      <section class="section">
        <h2>How Sun Belt football jobs open</h2>
        <div class="strip">
          <div>
            <span class="label">Hired away</span>
            <span class="v">{hired}</span>
          </div>
          <div>
            <span class="label">Fired</span>
            <span class="v">{fired}</span>
          </div>
          <div>
            <span class="label">Since</span>
            <span class="v">{Math.min(...data.history.items.map((i) => i.year))}</span>
          </div>
        </div>
        <p class="small">{data.history.summary}</p>
        <ul class="panel list">
          {data.history.items.map((i) => (
            <li class="row" key={`${i.year}${i.school}${i.coach}`}>
              <span class="rank-n small muted">{i.year}</span>
              <div class="grow">
                <div class="title">
                  {i.coach}, {i.school}
                </div>
                <div class="small muted">{[i.outcome === 'hired' ? `Left for ${i.to}` : 'Fired', i.note].filter(Boolean).join('. ')}</div>
              </div>
              <span class={`pill ${i.outcome === 'hired' ? 'good' : 'bad'}`}>{i.outcome === 'hired' ? 'Hired away' : 'Fired'}</span>
            </li>
          ))}
        </ul>
      </section>
      <p class="small muted">
        Percentages are Claude's estimate of the coach being on this staff next season, weighing results so far, contract
        and the Sun Belt history above. Not a prediction about players.
      </p>
    </>
  );
}

export function Portal({
  sport,
  portal,
  outlook,
  team,
  initial,
}: {
  sport: SportKey;
  portal: { data: PortalData | null; error: string | null };
  outlook: { data: OutlookData | null; error: string | null };
  team?: TeamData | null;
  initial?: string;
}) {
  const [view, setView] = useState<View>(initial === 'coaches' ? 'coaches' : 'players');
  const d = portal.data?.[sport];
  return (
    <>
      <div class="page-head">
        <span class="label">{SPORT_LABEL[sport]}{d ? ` · ${d.season}` : ''}</span>
        <h1>Portal and coaching outlook</h1>
      </div>
      <div class="seg" role="group" aria-label="Portal view">
        <button aria-pressed={view === 'players'} onClick={() => setView('players')}>
          Who came and stayed
        </button>
        <button aria-pressed={view === 'coaches'} onClick={() => setView('coaches')}>
          Coaching outlook
        </button>
      </div>
      {view === 'players' ? (
        portal.data ? (
          <Players sport={sport} data={portal.data} />
        ) : (
          <div class="card empty">{portal.error ? "Couldn't load the portal data yet." : 'Loading…'}</div>
        )
      ) : outlook.data ? (
        <Coaches sport={sport} data={outlook.data} team={team} />
      ) : (
        <div class="card empty">{outlook.error ? "Couldn't load the coaching outlook yet." : 'Loading…'}</div>
      )}
    </>
  );
}
