import { setSetting, useSettings, Settings } from '../lib/settings';

const ROWS: { key: keyof Settings; title: string; text: string }[] = [
  { key: 'liveScores', title: 'Live scores', text: 'During a game, refresh the score from ESPN every 30 seconds while the app is open.' },
  { key: 'autoRefresh', title: 'Auto-refresh while open', text: 'Reload schedules, stats and news every 10 minutes while the app is open. Off means only when you tap refresh.' },
  { key: 'showBasketball', title: 'Show basketball', text: "Adds the Football / Basketball switch at the top." },
];

export function SettingsScreen() {
  const s = useSettings();
  return (
    <>
      <h1>Settings</h1>
      <section class="section">
        <span class="label">On this iPhone</span>
        <div class="panel list">
          {ROWS.map((r) => (
            <label class="toggle" key={r.key} for={`set-${r.key}`}>
              <div class="grow" style="flex:1">
                <div class="title">{r.title}</div>
                <div class="small muted">{r.text}</div>
              </div>
              <input id={`set-${r.key}`} type="checkbox" role="switch" checked={s[r.key]} onChange={(e) => setSetting(r.key, (e.target as HTMLInputElement).checked)} />
            </label>
          ))}
        </div>
      </section>
      <section class="section">
        <span class="label">Background updates</span>
        <div class="panel" style="padding:14px;display:grid;gap:10px" >
          <p><strong>Data refresh</strong> runs on GitHub, hourly on game days and every 2 hours otherwise. To stop it, open the repo's Actions tab, pick “Update data”, and choose Disable workflow.</p>
          <p><strong>Game Day briefs</strong> are written by a scheduled Claude routine for football only. Basketball briefs are off until you ask Claude to turn them on. Pause the routine in Claude to stop all Claude usage.</p>
        </div>
      </section>
      <section class="section">
        <span class="label">Install on iPhone</span>
        <p class="panel" style="padding:14px">Open this page in Safari, tap Share, then Add to Home Screen.</p>
      </section>
    </>
  );
}
