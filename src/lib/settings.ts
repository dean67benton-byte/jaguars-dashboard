import { useEffect, useState } from 'preact/hooks';

export interface Settings {
  liveScores: boolean; // poll ESPN every 30s during a live game
  autoRefresh: boolean; // reload data files every 10 min while the app is open
  showBasketball: boolean;
  showSwag: boolean; // Jag Swag shopping page in More
}

const KEY = 'jags.settings.v1';
const DEFAULTS: Settings = { liveScores: true, autoRefresh: true, showBasketball: true, showSwag: true };

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

let current = load();
const listeners = new Set<(s: Settings) => void>();

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  current = { ...current, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // private mode: keep in memory only
  }
  listeners.forEach((l) => l(current));
}

export function useSettings() {
  const [s, set] = useState(current);
  useEffect(() => {
    listeners.add(set);
    return () => void listeners.delete(set);
  }, []);
  return s;
}
