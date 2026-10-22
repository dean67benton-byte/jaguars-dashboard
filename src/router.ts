import { useEffect, useState } from 'preact/hooks';

// Hash routes keep GitHub Pages happy (no server rewrites):
// #home, #schedule, #gameday, #more, #game/<sport>/<id>, #briefs, #brief/<id>,
// #team[/stats|roster|standings], #news, #settings, #swag
export function useRoute() {
  const read = () => (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}
