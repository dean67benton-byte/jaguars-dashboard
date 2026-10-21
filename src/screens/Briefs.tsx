import { useEffect, useState } from 'preact/hooks';
import type { Brief, BriefIndexEntry } from '../lib/types';
import { useBrief } from '../lib/data';
import { day, kickoff, longDay, stamp } from '../lib/time';
import { Chevron, IconBrief } from '../icons';

function Scorecard({ graded }: { graded: Brief[] }) {
  if (!graded.length)
    return <p class="note">The season scorecard starts after the first postgame grade.</p>;
  const n = graded.length;
  const winners = graded.filter((b) => b.grade!.winnerCorrect).length;
  const avg = (f: (b: Brief) => number) => (graded.reduce((s, b) => s + f(b), 0) / n).toFixed(1);
  return (
    <div class="tiles">
      <div class="panel tile"><span class="label">Winners picked</span><span class="v">{winners}-{n - winners}</span></div>
      <div class="panel tile"><span class="label">Avg margin miss</span><span class="v">{avg((b) => b.grade!.marginOff)} pts</span></div>
      <div class="panel tile"><span class="label">Avg total miss</span><span class="v">{avg((b) => b.grade!.totalOff)} pts</span></div>
    </div>
  );
}

export function Briefs({ index, error }: { index: BriefIndexEntry[] | null; error: string | null }) {
  const sorted = [...(index ?? [])].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  // Load graded briefs for the scorecard (a handful of small files per season).
  const finalIds = sorted.filter((b) => b.status === 'final').map((b) => b.id).join(',');
  const [graded, setGraded] = useState<Brief[]>([]);
  useEffect(() => {
    if (!finalIds) return setGraded([]);
    Promise.all(finalIds.split(',').map((id) => fetch(`./briefs/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((all) => setGraded(all.filter((b): b is Brief => Boolean(b?.grade))));
  }, [finalIds]);

  return (
    <>
      <h1>Game Day</h1>
      <p class="muted prose">
        A Claude brief lands two days before each football game, gets a game-morning update, and is graded the night of the game.
      </p>
      <section class="section">
        <h2>Season scorecard</h2>
        <Scorecard graded={graded} />
      </section>
      <section class="section">
        <h2>Briefs</h2>
        <div class="panel list">
          {sorted.map((b) => (
            <a class="row" href={`#brief/${b.id}`} key={b.id}>
              {b.letter ? <span class="grade-letter" style="font-size:1.6rem;width:2ch">{b.letter}</span> : <IconBrief />}
              <div class="grow">
                <div class="title">{b.opponent}</div>
                <div class="small muted">{day(b.date)} · Pick {b.pick}</div>
              </div>
              <span class={`pill ${b.status === 'final' ? 'good' : 'accent'}`}>{b.status === 'final' ? 'Graded' : 'Preview'}</span>
              <Chevron />
            </a>
          ))}
          {!sorted.length && <div class="empty">{error ? "Couldn't load briefs." : 'No briefs yet.'}</div>}
        </div>
      </section>
    </>
  );
}

function Grade({ b }: { b: Brief }) {
  const g = b.grade!;
  const p = b.preview.prediction;
  return (
    <section class="section">
      <h2>Postgame grade</h2>
      <div class="panel pick">
        <span class="grade-letter">{g.letter}</span>
        <div style="display:grid;gap:4px">
          <div class="num" style="font-size:1.3rem">
            Final: USA {g.final.usa}, {b.opponent} {g.final.opp}
          </div>
          <div class="small muted">
            Picked USA {p.usa}-{p.opp} · winner {g.winnerCorrect ? 'right' : 'wrong'} · margin off {g.marginOff} · total off {g.totalOff}
          </div>
        </div>
      </div>
      <p class="prose">{g.summary}</p>
      <div class="panel list">
        {g.keys.map((k) => (
          <div class="key" key={k.key}>
            <span class={`mark ${k.hit ? 'hit' : 'miss'}`}>{k.hit ? '✓' : '✕'}</span>
            <div><div class="title">{k.key}</div><div class="small muted">{k.note}</div></div>
          </div>
        ))}
      </div>
      {g.players.length > 0 && (
        <div class="panel list">
          {g.players.map((pl) => (
            <div class="row" key={pl.name}><div class="grow"><div class="title">{pl.name}</div><div class="small muted">{pl.note}</div></div></div>
          ))}
        </div>
      )}
      <div class="panel" style="padding:14px"><span class="label">What the brief missed</span><p style="margin-top:6px">{g.missed}</p></div>
      <Sources list={g.sources} stampIso={g.generatedAt} />
    </section>
  );
}

function Sources({ list, stampIso }: { list: { title: string; url?: string }[]; stampIso: string }) {
  return (
    <p class="small muted">
      Written {stamp(stampIso)} CT. Sources:{' '}
      {list.map((s, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {s.url ? <a href={s.url} target="_blank" rel="noopener">{s.title}</a> : s.title}
        </span>
      ))}
    </p>
  );
}

export function BriefView({ id }: { id: string }) {
  const { data: b, error } = useBrief(id);
  if (error) return <div class="panel empty">Couldn't load this brief.</div>;
  if (!b) return <div class="panel empty">Loading…</div>;
  const p = b.preview;
  const opp = b.opponent;

  return (
    <>
      <a href="#briefs" class="small" style="color:var(--muted);text-decoration:none">‹ All briefs</a>
      <section class="panel hero brief-hero">
        <span class="label">{b.home ? 'vs' : 'at'} {opp} · {longDay(b.date)} · {kickoff(b.date)}{b.tv ? ` · ${b.tv}` : ''}</span>
        <h1>{p.headline}</h1>
        <p class="muted">{p.summary}</p>
        {p.records && <p class="small">USA {p.records.usa} · {opp} {p.records.opp}</p>}
      </section>

      {b.grade && <Grade b={b} />}

      {b.reminder && (
        <section class="section">
          <h2>Game-morning update</h2>
          <div class="panel" style="padding:14px">
            <ul class="bullets">{b.reminder.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            <p class="small muted" style="margin-top:8px">Updated {stamp(b.reminder.generatedAt)} CT</p>
          </div>
        </section>
      )}

      <section class="section">
        <h2>The pick</h2>
        <div class="panel pick">
          <span class="score">USA {p.prediction.usa}<span class="muted">–</span>{p.prediction.opp}</span>
          <span class="pill accent" style="justify-self:start">Confidence: {p.prediction.confidence}</span>
        </div>
        <div class="prose">
          <p>{p.prediction.reasoning}</p>
          <p class="muted"><strong>What could make it wrong:</strong> {p.prediction.risks}</p>
        </div>
      </section>

      <section class="section">
        <h2>Matchup at a glance</h2>
        <div class="panel table-wrap">
          <table>
            <thead><tr><th>Metric</th><th>USA</th><th>{opp}</th><th>Edge</th></tr></thead>
            <tbody>
              {p.matchup.map((r) => (
                <tr key={r.metric}>
                  <td><div style="font-weight:600">{r.metric}</div><div class="small muted">{r.why}</div></td>
                  <td class="num">{r.usa}</td>
                  <td class="num">{r.opp}</td>
                  <td><span class={`edge ${r.edge}`}>{r.edge === 'OPP' ? opp : r.edge}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid-2">
        <section class="section">
          <h2>Keys to the game</h2>
          <div class="panel" style="padding:14px;display:grid;gap:12px">
            <span class="label">South Alabama wins if it</span>
            <ul class="bullets">{p.keys.usa.map((k) => <li key={k}>{k}</li>)}</ul>
            <span class="label">{opp} wins if it</span>
            <ul class="bullets">{p.keys.opp.map((k) => <li key={k}>{k}</li>)}</ul>
          </div>
        </section>
        <section class="section">
          <h2>Players to watch</h2>
          <div class="panel list">
            {p.players.map((pl) => (
              <div class="row" key={pl.name} style="align-items:flex-start">
                <span class={`pill ${pl.team === 'USA' ? 'accent' : ''}`}>{pl.team === 'USA' ? 'USA' : opp}</span>
                <div class="grow"><div class="title">{pl.name}{pl.pos ? `, ${pl.pos}` : ''}</div><div class="small muted">{pl.note}</div></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div class="grid-2">
        <section class="section">
          <h2>What to watch for</h2>
          <div class="panel list">
            {p.watch.map((w) => (
              <div class="row" key={w.title} style="align-items:flex-start"><div class="grow"><div class="title">{w.title}</div><div class="small muted">{w.text}</div></div></div>
            ))}
          </div>
        </section>
        <section class="section">
          <h2>Injuries, weather, last game</h2>
          <div class="panel list">
            <div class="row" style="align-items:flex-start"><span class="label" style="width:80px">Injuries</span><div class="grow">{p.injuries.join(' ')}</div></div>
            <div class="row" style="align-items:flex-start"><span class="label" style="width:80px">Weather</span><div class="grow">{p.weather ?? 'Not available yet.'}</div></div>
            {p.lastGame && (
              <>
                <div class="row" style="align-items:flex-start"><span class="label" style="width:80px">USA last</span><div class="grow">{p.lastGame.usa}</div></div>
                <div class="row" style="align-items:flex-start"><span class="label" style="width:80px">{opp} last</span><div class="grow">{p.lastGame.opp}</div></div>
              </>
            )}
          </div>
        </section>
      </div>

      {p.context && (
        <section class="section">
          <h2>Context</h2>
          <p class="prose">{p.context}</p>
        </section>
      )}
      <Sources list={p.sources} stampIso={p.generatedAt} />
    </>
  );
}
