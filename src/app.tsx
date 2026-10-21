import { useEffect, useState } from 'preact/hooks';
import { useRoute } from './router';
import { useBriefIndex, useNfl, useRankings, useTeam, SPORT_LABEL } from './lib/data';
import { useSettings } from './lib/settings';
import type { GameEvent, SportKey } from './lib/types';
import { IconCalendar, IconGameDay, IconHome, IconMore, IconRefresh } from './icons';
import { Home } from './screens/Home';
import { Schedule } from './screens/Schedule';
import { Game } from './screens/Game';
import { Briefs, BriefView } from './screens/Briefs';
import { Team } from './screens/Team';
import { News } from './screens/News';
import { SettingsScreen } from './screens/Settings';
import { GameDay } from './screens/GameDay';
import { More, MORE_LINKS } from './screens/More';
import { Rankings } from './screens/Rankings';
import { Nfl } from './screens/Nfl';

const SPORT_KEY = 'jags.sport';
const readSport = (): SportKey => {
  try {
    return localStorage.getItem(SPORT_KEY) === 'mbb' ? 'mbb' : 'football';
  } catch {
    return 'football';
  }
};

const TABS = [
  { id: 'home', label: 'Home', Icon: IconHome },
  { id: 'schedule', label: 'Schedule', Icon: IconCalendar },
  { id: 'gameday', label: 'Game Day', Icon: IconGameDay },
  { id: 'more', label: 'More', Icon: IconMore },
];

// Which tab a page belongs to.
const TAB_OF: Record<string, string> = { game: 'schedule', brief: 'gameday', briefs: 'gameday', team: 'more', news: 'more', settings: 'more', rankings: 'more', nfl: 'more' };

// Game Day gets a red dot from 6 hours before kickoff until the game ends.
const isGameDay = (events: GameEvent[] = [], now = Date.now()) =>
  events.some((e) => e.status === 'in' || (e.status === 'pre' && Date.parse(e.date) - now < 6 * 36e5 && Date.parse(e.date) - now > -6 * 36e5));

export function App() {
  const route = useRoute();
  const settings = useSettings();
  const [sportPref, setSportPref] = useState<SportKey>(readSport);
  const sport: SportKey = settings.showBasketball ? sportPref : 'football';
  const team = useTeam(sport, settings.autoRefresh ? 10 * 60e3 : 0);
  const briefs = useBriefIndex();
  const rankings = useRankings();
  const nfl = useNfl(route[0] === 'nfl');

  useEffect(() => {
    try {
      localStorage.setItem(SPORT_KEY, sportPref);
    } catch {
      /* ignore */
    }
  }, [sportPref]);

  const refresh = () => {
    team.reload(true);
    briefs.reload(true);
    rankings.reload(true);
  };

  const [page, a, b] = route;
  const active = TAB_OF[page] ?? page;
  const dot = isGameDay(team.data?.events);

  let body;
  if (page === 'schedule') body = <Schedule sport={sport} team={team} briefs={briefs.data} />;
  else if (page === 'game') body = <Game sport={(a as SportKey) || sport} id={b} team={team} briefs={briefs.data} />;
  else if (page === 'briefs') body = <Briefs index={briefs.data} error={briefs.error} />;
  else if (page === 'brief') body = <BriefView id={a} />;
  else if (page === 'gameday') body = <GameDay sport={sport} team={team} briefs={briefs.data} />;
  else if (page === 'more') body = <More />;
  else if (page === 'nfl') body = <Nfl data={nfl.data} error={nfl.error} />;
  else if (page === 'rankings') body = <Rankings sport={sport} data={rankings.data} error={rankings.error} />;
  else if (page === 'team') body = <Team sport={sport} team={team} initial={a} />;
  else if (page === 'news') body = <News team={team} />;
  else if (page === 'settings') body = <SettingsScreen />;
  else body = <Home sport={sport} team={team} briefs={briefs.data} rankings={rankings.data} />;

  return (
    <div class="shell">
      <header class="topbar">
        <div class="topbar-inner">
          <a class="brand" href="#home" aria-label="Jaguars Hub home">
            <span class="brand-mark">USA</span>
            <span class="brand-name">Jaguars</span>
          </a>
          <nav class="topnav" aria-label="Main">
            {TABS.filter((t) => t.id !== 'more').map(({ id, label }) => (
              <a key={id} href={`#${id}`} aria-current={active === id ? 'page' : undefined}>
                {label}
                {id === 'gameday' && dot && <span class="live-dot" aria-label="Game today" />}
              </a>
            ))}
            <details data-current={active === 'more' ? '' : undefined}>
              <summary>More</summary>
              <div class="menu" onClick={(e) => (e.currentTarget.parentElement as HTMLDetailsElement).removeAttribute('open')}>
                {MORE_LINKS.map((l) => (
                  <a key={l.href} href={l.href}>{l.title}</a>
                ))}
              </div>
            </details>
          </nav>
          {settings.showBasketball && (
            <div class="sport-switch" role="group" aria-label="Sport">
              {(['football', 'mbb'] as SportKey[]).map((s) => (
                <button key={s} aria-pressed={sport === s} onClick={() => setSportPref(s)}>
                  {SPORT_LABEL[s]}
                </button>
              ))}
            </div>
          )}
          <button class={`icon-btn${team.loading ? ' spin' : ''}`} onClick={refresh} aria-label="Refresh now">
            <IconRefresh />
          </button>
        </div>
      </header>

      <div class="tabbar">
        <nav aria-label="Main">
          {TABS.map(({ id, label, Icon }) => (
            <a key={id} href={`#${id}`} aria-current={active === id ? 'page' : undefined}>
              <Icon />
              <span>{label}</span>
              {id === 'gameday' && dot && <span class="live-dot" aria-label="Game today" />}
            </a>
          ))}
        </nav>
      </div>

      <main class="main">{body}</main>
    </div>
  );
}
