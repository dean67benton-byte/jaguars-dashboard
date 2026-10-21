const TZ = 'America/Chicago'; // Mobile, AL

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts });
const dayFmt = fmt({ weekday: 'short', month: 'short', day: 'numeric' });
const longDayFmt = fmt({ weekday: 'long', month: 'long', day: 'numeric' });
const timeFmt = fmt({ hour: 'numeric', minute: '2-digit' });
const stampFmt = fmt({ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const day = (iso: string) => dayFmt.format(new Date(iso));
export const longDay = (iso: string) => longDayFmt.format(new Date(iso));
export const kickoff = (iso: string, tbd?: boolean) => (tbd ? 'Time TBA' : `${timeFmt.format(new Date(iso))} CT`);
export const stamp = (iso: string) => stampFmt.format(new Date(iso));

export function ago(iso: string, now = Date.now()) {
  const mins = Math.round((now - Date.parse(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return stamp(iso);
}

export function countdown(iso: string, now = Date.now()) {
  const ms = Math.max(0, Date.parse(iso) - now);
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  const s = Math.floor((ms % 6e4) / 1e3);
  return { d, h, m, s, done: ms === 0 };
}
