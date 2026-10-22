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

// ---- Sun Belt power rankings (public/data/rankings.json) ----

export interface RankingRow {
  rank: number;
  formulaRank: number;
  teamId: string;
  team: string;
  logo?: string;
  record: string;
  conf: string;
  last?: { result: 'W' | 'L' | 'T'; score: string; opp: string; at: 'vs' | 'at'; date: string };
  score: number;
  /** Written by the Sunday Claude routine. */
  blurb?: string;
  /** Why Claude moved this team from its formula spot (at most 2 spots). */
  adjust?: string;
}

export interface RankingWeek {
  id: string; // posting date, Central (YYYY-MM-DD)
  postedAt: string;
  updatedAt?: string;
  source: 'formula' | 'claude';
  rows: RankingRow[];
}

export type Rankings = { updatedAt?: string } & Partial<Record<SportKey, { weeks: RankingWeek[] }>>;

// ---- Jaguars in the NFL (public/data/nfl.json, scripts/nfl.mjs) ----

export interface NflStat {
  label: string;
  value: string;
}

export interface NflPlayer {
  id: string;
  name: string;
  pos?: string;
  jersey?: string;
  age?: number;
  years?: number;
  headshot?: string;
  group: 'active' | 'practice' | 'reserve' | 'free';
  status?: string;
  team?: { abbr: string; name: string; logo?: string };
  lastTeam?: string;
  statsSeason?: string; // e.g. "2026 Regular Season"
  games: number;
  lastGame?: { date: string; opp?: string; at?: string; result?: string; score?: string; week?: number };
  stats: { season: NflStat[]; career: NflStat[] };
  facts: string[];
  contract?: { summary: string; capHit?: string; career?: string; source?: string };
  sources: string[];
  /** Written by the Sunday Claude routine for the NFL week just finished. */
  grade?: { letter: string; note: string; week: number; gradedAt: string };
  espn: string;
}

export interface NflData {
  updatedAt: string;
  players: NflPlayer[];
}

// ---- Transfer portal (public/data/portal.json, scripts/portal.mjs) ----

export type Level = 'P4' | 'G5' | 'FCS' | 'D2' | 'D3' | 'NAIA' | 'JUCO' | 'Intl';

export interface PortalPlayer {
  id?: string;
  name: string;
  pos?: string;
  cls?: string;
  headshot?: string;
  from?: string;
  level?: Level;
  games: number;
  starts?: number;
  stats: { season: NflStat[]; last: NflStat[] };
}

export interface PortalSport {
  season: string;
  lastSeason: string;
  rosterSize: number;
  returners: number;
  newcomers: number;
  otherNew: number;
  incoming: PortalPlayer[];
  starters: PortalPlayer[];
  startersNote?: string;
  departures: { name: string; pos?: string; to?: string }[];
  sources: string[];
}

export interface PortalData {
  updatedAt: string;
  football?: PortalSport;
  mbb?: PortalSport;
}

// ---- Coaching outlook (public/data/outlook.json, Sunday routine) ----

export type Risk = 'low' | 'medium' | 'high';

export interface Coach {
  name: string;
  role: string;
  unit: 'hc' | 'oc' | 'dc';
  since?: string;
  record?: string;
  stayPct: number;
  hotSeat: Risk;
  poach: Risk;
  note: string;
}

export interface OutlookData {
  updatedAt: string;
  source: 'seed' | 'claude';
  football?: { asOf?: string; staff: Coach[] };
  mbb?: { asOf?: string; staff: Coach[] };
  history: {
    summary: string;
    items: { year: number; school: string; coach: string; outcome: 'fired' | 'hired'; to?: string; note?: string }[];
    sources: string[];
  };
}

// ---- Jag Swag (public/data/swag.json, scripts/swag.mjs) ----

export type SwagType = 'tee' | 'hoodie' | 'polo' | 'coach' | 'hat' | 'other';

export interface SwagItem {
  id: string;
  store: string;
  title: string;
  url: string;
  img?: string;
  price: number;
  was?: number; // regular price when on sale
  off?: number; // percent off
  type: SwagType;
  who: 'men' | 'women' | 'unisex';
  sizes?: string[]; // which of M, L, XL are in stock; missing = store doesn't say
  created?: string;
  seen?: string;
  isNew?: boolean;
  low: number; // lowest price seen
  lowAt: string;
  dropFrom?: number; // price before a drop in the last week
  dropAt?: string;
}

export interface SwagData {
  updatedAt: string;
  stores: Record<string, { name: string; count: number; ok: boolean; checkedAt: string; okAt?: string }>;
  items: SwagItem[];
}
