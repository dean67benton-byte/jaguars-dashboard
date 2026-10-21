import { day } from '../lib/time';
import { Loading, TeamState, Updated } from './parts';

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
              <div class="small muted">{n.source}{n.date ? ` · ${day(n.date)}` : ''}</div>
            </div>
          </a>
        ))}
        {!data.news.length && <div class="empty">No headlines yet.</div>}
      </div>
      <Updated data={data} />
    </>
  );
}
