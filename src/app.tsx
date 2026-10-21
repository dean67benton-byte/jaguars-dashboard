import { useEffect, useState } from 'preact/hooks';
import { useRoute } from './router';
import { useBriefIndex, useTeam, SPORT_LABEL } from './lib/data';
import { useSettings } from './lib/settings';
import type { SportKey } from './lib/types';
import { IconBrief, IconCalendar, IconGear, IconHome, IconNews, IconRefresh, IconTeam } from './icons';
import { Home } from './screens/Home';
import { Schedule } from './screens/Schedule';
import { Game } from './screens/Game';
import { Briefs, BriefView } from './screens/Briefs';
import { Team } from './screens/Team';
import { News } from './screens/News';
import { SettingsScreen } from './screens/Settings';

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
  { id: 'briefs', label: 'Game Day', Icon: IconBrief },
  { id: 'team', label: 'Team', Icon: IconTeam },
  { id: 'news', label: 'News', Icon: IconNews },
];

export function App() {
  const route = useRoute();
  const settings = useSettings();
  const [sportPref, setSportPref] = useState<SportKey>(readSport);
  const sport: SportKey = settings.showBasketball ? sportPref : 'football';
  const team = useTeam(sport, settings.autoRefresh ? 10 * 60e3 : 0);
  const briefs = useBriefIndex();

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
  };

  const [page, a, b] = route;
  const active = page === 'game' ? 'schedule' : page === 'brief' ? 'briefs' : page;

  let body;
  if (page === 'schedule') body = <Schedule sport={sport} team={team} briefs={briefs.data} />;
  else if (page === 'game') body = <Game sport={(a as SportKey) || sport} id={b} team={team} briefs={briefs.data} />;
  else if (page === 'briefs') body = <Briefs index={briefs.data} error={briefs.error} />;
  else if (page === 'brief') body = <BriefView id={a} />;
  else if (page === 'team') body = <Team sport={sport} team={team} />;
  else if (page === 'news') body = <News team={team} />;
  else if (page === 'settings') body = <SettingsScreen />;
  else body = <Home sport={sport} team={team} briefs={briefs.data} />;

  return (
    <div class="shell">
      <header class="topbar">
        <div class="topbar-inner">
          <a class="brand" href="#home" aria-label="Jaguars Hub home">
            <span class="brand-mark">USA</span>
            <span class="brand-name">Jaguars</span>
          </a>
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
          <a class="icon-btn" href="#settings" aria-label="Settings">
            <IconGear />
          </a>
        </div>
      </header>

      <div class="tabbar">
        <nav aria-label="Main">
          {TABS.map(({ id, label, Icon }) => (
            <a key={id} href={`#${id}`} aria-current={active === id ? 'page' : undefined}>
              <Icon />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </div>

      <main class="main">{body}</main>
    </div>
  );
}
