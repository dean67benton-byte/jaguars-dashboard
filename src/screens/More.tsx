import { Chevron, IconBrief, IconCalendar, IconGear, IconNews, IconTeam, IconTrophy } from '../icons';

export const MORE_LINKS: { href: string; title: string; text: string; Icon: typeof IconTeam }[] = [
  { href: '#rankings', title: 'Power rankings', text: 'Our weekly Sun Belt 1 to 14, posted Sundays', Icon: IconTrophy },
  { href: '#team/roster', title: 'Roster', text: 'Players, positions and hometowns', Icon: IconTeam },
  { href: '#team/stats', title: 'Season stats', text: 'Team leaders and stat ranks', Icon: IconCalendar },
  { href: '#team/standings', title: 'Sun Belt standings', text: 'Both divisions, live on game days', Icon: IconCalendar },
  { href: '#news', title: 'News and analysis', text: 'Headlines and sources', Icon: IconNews },
  { href: '#briefs', title: 'Game Day briefs', text: 'Every preview and postgame grade', Icon: IconBrief },
  { href: '#settings', title: 'Settings', text: 'Live scores, auto-refresh, sports', Icon: IconGear },
];

export function More() {
  return (
    <>
      <h1>More</h1>
      <div class="panel list">
        {MORE_LINKS.map(({ href, title, text, Icon }) => (
          <a class="row more-row" href={href} key={href}>
            <Icon />
            <div class="grow">
              <div class="title">{title}</div>
              <div class="small muted">{text}</div>
            </div>
            <Chevron />
          </a>
        ))}
      </div>
    </>
  );
}
