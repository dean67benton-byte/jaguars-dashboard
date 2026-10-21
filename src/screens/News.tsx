import { day } from '../lib/time';
import { Loading, TeamState, Updated } from './parts';

const SOURCES = [
  { name: 'usajaguars.com', note: 'Official athletics site', url: 'https://usajaguars.com' },
  { name: 'AL.com', note: 'South Alabama coverage', url: 'https://www.al.com/usa/' },
  { name: 'Diehard Sports Network', note: 'Previews, rapid reactions, postgame reports', url: 'https://www.diehardsportsnetwork.com/south-alabama' },
  { name: 'ESPN', note: 'Scores, stats, wire stories', url: 'https://www.espn.com/college-football/team/_/id/6/south-alabama-jaguars' },
];

export function News({ team }: { team: TeamState }) {
  const data = team.data;
  if (!data) return <Loading team={team} />;
  return (
    <>
      <h1>News</h1>
      <div class="panel list">
        {data.news.map((n) => (
          <a class="row" href={n.url} target="_blank" rel="noopener" key={n.url} style="align-items:flex-start">
            <div class="grow">
              <div class="title">{n.title}</div>
              <div class="small muted">{n.source}{n.date ? `, ${day(n.date)}` : ''}</div>
            </div>
          </a>
        ))}
        {!data.news.length && <div class="empty">No headlines yet.</div>}
      </div>
      <section class="section">
        <h2>Sources</h2>
        <div class="panel list">
          {SOURCES.map((src) => (
            <a class="row" href={src.url} target="_blank" rel="noopener" key={src.name}>
              <div class="grow">
                <div class="title">{src.name}</div>
                <div class="small muted">{src.note}</div>
              </div>
            </a>
          ))}
        </div>
      </section>
      <Updated data={data} />
    </>
  );
}
