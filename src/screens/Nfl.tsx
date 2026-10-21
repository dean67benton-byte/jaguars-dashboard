import type { NflData, NflPlayer } from '../lib/types';
import { day, longDay } from '../lib/time';
import { Headshot } from './parts';

const GROUPS: { key: NflPlayer['group']; title: string }[] = [
  { key: 'active', title: 'On active rosters' },
  { key: 'practice', title: 'On practice squads' },
  { key: 'reserve', title: 'On reserve' },
  { key: 'free', title: 'Free agents' },
];

// "$3.65M 2026 cap hit (est.)" -> 3.65
const millions = (s?: string) => Number(s?.match(/\$([\d.]+)M/)?.[1] ?? 0);

function Player({ p }: { p: NflPlayer }) {
  const season = p.statsSeason?.replace(' Regular Season', '');
  const thisYear = String(new Date().getFullYear());
  return (
    <li class="nfl-card">
      <div class="nfl-top">
        <Headshot src={p.headshot} size={56} />
        <div class="grow">
          <div class="title">{p.name}</div>
          <div class="small muted nfl-team">
            {p.team?.logo && <img class="logo" src={p.team.logo} width={18} height={18} alt="" loading="lazy" />}
            {[p.pos, p.team?.name ?? (p.lastTeam ? `last with ${p.lastTeam}` : undefined), p.years ? `${p.years} yrs in NFL` : undefined]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        {p.grade ? (
          <div class="nfl-grade" title={`Week ${p.grade.week} grade`}>
            <span class="grade-letter">{p.grade.letter}</span>
            <span class="label">Wk {p.grade.week}</span>
          </div>
        ) : (
          p.group !== 'active' && <span class="pill">{p.group === 'practice' ? 'Practice squad' : p.group === 'reserve' ? 'Reserve' : 'Free agent'}</span>
        )}
      </div>

      {p.grade && <p class="small">{p.grade.note}</p>}

      <div class="small muted">
        {p.games > 0
          ? `${p.games} game${p.games === 1 ? '' : 's'} in ${season ?? thisYear}`
          : season === thisYear || !season
            ? `No game action in ${thisYear} yet`
            : `Last played in ${season}`}
        {p.lastGame && season === thisYear && `. Last: week ${p.lastGame.week} ${p.lastGame.at ?? ''} ${p.lastGame.opp ?? ''}, ${p.lastGame.result ?? ''} ${p.lastGame.score ?? ''}`}
      </div>

      {p.stats.season.length > 0 && (
        <div class="nfl-stats">
          {p.stats.season.map((s) => (
            <span key={s.label}>
              <b>{s.value}</b> {s.label}
            </span>
          ))}
          {season && season !== thisYear && <span class="muted">({season})</span>}
        </div>
      )}
      {p.stats.career.length > 0 && (
        <div class="small muted">Career: {p.stats.career.map((s) => `${s.value} ${s.label}`).join(', ')}</div>
      )}

      {p.contract && (
        <div class="small">
          <span class="label">Contract</span>{' '}
          {[p.contract.summary, p.contract.capHit, p.contract.career].filter(Boolean).join('. ')}
          {p.contract.source && (
            <>
              {' '}
              <a class="muted" href={p.contract.source} target="_blank" rel="noopener">Spotrac</a>
            </>
          )}
        </div>
      )}

      {p.facts.length > 0 && (
        <ul class="bullets small">
          {p.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      <a class="small muted" href={p.espn} target="_blank" rel="noopener">ESPN player page ›</a>
    </li>
  );
}

export function Nfl({ data, error }: { data: NflData | null; error: string | null }) {
  if (!data) return <div class="card empty">{error ? "Couldn't load the NFL list yet. It fills in after the next data update." : 'Loading…'}</div>;
  const players = data.players;
  const top = [...players].sort((a, b) => millions(b.contract?.capHit) - millions(a.contract?.capHit))[0];
  const graded = players.filter((p) => p.grade).sort((a, b) => b.grade!.week - a.grade!.week)[0];
  const cells = [
    { k: 'Alumni', v: players.length },
    { k: 'Active', v: players.filter((p) => p.group === 'active').length },
    { k: 'Practice', v: players.filter((p) => p.group === 'practice').length },
  ];
  return (
    <>
      <div class="page-head">
        <span class="label">South Alabama alumni</span>
        <h1>Jaguars in the NFL</h1>
        <p class="small muted">
          Updated {day(data.updatedAt)} from ESPN rosters.
          {graded ? ` Grades for week ${graded.grade!.week}, written ${longDay(graded.grade!.gradedAt)}.` : ' Weekly grades start with the Sunday analysis.'}
        </p>
      </div>
      <div class="strip">
        {cells.map((c) => (
          <div key={c.k}>
            <span class="label">{c.k}</span>
            <span class="v">{c.v}</span>
          </div>
        ))}
      </div>
      {top && millions(top.contract?.capHit) > 0 && (
        <p class="small muted">
          Highest paid this season: <strong style="color:var(--fg)">{top.name}</strong>, {top.contract!.capHit}.
        </p>
      )}

      {GROUPS.map(({ key, title }) => {
        const list = players.filter((p) => p.group === key);
        if (!list.length) return null;
        return (
          <section class="section" key={key}>
            <h2>{title}</h2>
            <ul class="panel list nfl-list">
              {list.map((p) => (
                <Player p={p} key={p.id} />
              ))}
            </ul>
          </section>
        );
      })}
      <p class="small muted">
        Stats and rosters from ESPN. Contracts from Spotrac where found. Grades (A+ to F-) are Claude's read of each player's last
        game, written Sundays for the NFL week that ended the Monday before.
      </p>
    </>
  );
}
