// Shapes written by scripts/fetch-data.mjs (public/data/*.json)
// and by the Claude brief routine (public/briefs/*.json).

export type SportKey = 'football' | 'mbb';

export interface TeamRef {
  id: string;
  name: string;
  short: string;
  abbr: string;
  logo?: string;
  record?: string;
}

export interface GameEvent {
  id: string;
  date: string; // ISO, UTC
  timeTbd?: boolean;
  opponent: TeamRef;
  home: boolean;
  neutral?: boolean;
  conference?: boolean;
  venue?: string;
  city?: string;
  tv?: string;
  status: 'pre' | 'in' | 'post';
  statusDetail?: string;
  usScore?: number;
  oppScore?: number;
  result?: 'W' | 'L' | 'T';
}

export interface Player {
  number?: string;
  name: string;
  pos?: string;
  cls?: string;
  ht?: string;
  wt?: string;
  hometown?: string;
  headshot?: string;
}

export interface Stat {
  name: string;
  label: string;
  value: string;
  rank?: string;
}

export interface StatCategory {
  name: string;
  stats: Stat[];
}

export interface Leader {
  category: string;
  name: string;
  value: string;
}

export interface StandingRow {
  teamId: string;
  team: string;
  conf: string;
  overall: string;
}

export interface StandingGroup {
  name: string;
  rows: StandingRow[];
}

export interface NewsItem {
  title: string;
  url: string;
  date?: string;
  source: string;
  image?: string;
}

export interface TeamData {
  sport: SportKey;
  updatedAt: string;
  source: 'espn' | 'seed';
  team: TeamRef & { confRecord?: string; standingSummary?: string };
  events: GameEvent[];
  roster: Player[];
  stats: StatCategory[];
  leaders: Leader[];
  standings: StandingGroup[];
  news: NewsItem[];
  nextOpponent?: { team: TeamRef; stats: StatCategory[] };
}

// ---- Game Day briefs ----

export interface MatchupRow {
  metric: string;
  usa: string;
  opp: string;
  edge: 'USA' | 'OPP' | 'Even';
  why: string;
}

export interface PlayerNote {
  name: string;
  team: 'USA' | 'OPP';
  pos?: string;
  note: string;
}

export interface Brief {
  id: string; // e.g. 2026-10-20-marshall
  sport: SportKey;
  eventId?: string;
  date: string; // kickoff ISO
  opponent: string;
  home: boolean;
  venue?: string;
  tv?: string;
  status: 'preview' | 'final';
  preview: {
    generatedAt: string;
    headline: string;
    summary: string;
    records?: { usa: string; opp: string };
    matchup: MatchupRow[];
    keys: { usa: string[]; opp: string[] };
    players: PlayerNote[];
    watch: { title: string; text: string }[];
    injuries: string[];
    weather?: string;
    lastGame?: { usa: string; opp: string };
    prediction: { usa: number; opp: number; confidence: 'Low' | 'Medium' | 'High'; reasoning: string; risks: string };
    context?: string;
    sources: { title: string; url?: string }[];
  };
  reminder?: { generatedAt: string; notes: string[] };
  grade?: {
    generatedAt: string;
    final: { usa: number; opp: number };
    winnerCorrect: boolean;
    marginOff: number; // |predicted margin - actual margin|
    totalOff: number; // |predicted total - actual total|
    /** South Alabama's own performance, A+ to F-. */
    performance?: { letter: string; summary: string };
    /** How accurate the brief was, 0 to 100, with the rubric parts that add up to it. */
    accuracyPct?: number;
    accuracy?: { part: string; points: number; max: number; note: string }[];
    /** What South Alabama has to fix before the next game. */
    fixes?: { title: string; text: string }[];
    letter?: string; // older grades only: one letter for brief accuracy
    summary: string;
    keys: { key: string; hit: boolean; note: string }[];
    players: { name: string; note: string }[];
    missed: string;
    sources: { title: string; url?: string }[];
  };
}

export interface BriefIndexEntry {
  id: string;
  sport: SportKey;
  date: string;
  opponent: string;
  status: 'preview' | 'final';
  pick: string; // "USA 35, MRSH 28"
  letter?: string; // performance grade, A+ to F-
  accuracyPct?: number;
}
