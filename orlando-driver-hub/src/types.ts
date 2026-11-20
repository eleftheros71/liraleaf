// ---------- Weekly guide (AI research) ----------

export const CORRIDORS = ['OCCC', 'Disney', 'Universal', 'Sports/Concerts', 'Other'] as const;
export type Corridor = (typeof CORRIDORS)[number];

export const EVENT_TYPES = ['Convention', 'Concert', 'Sports', 'Theme Park', 'Festival', 'Nightlife', 'Other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const DEMAND_RATINGS = ['Low', 'Moderate', 'High', 'Peak', 'Extreme'] as const;
export type DemandRating = (typeof DEMAND_RATINGS)[number];

export const SURGE_TIERS = ['Moderate', 'High', 'Peak', 'Extreme'] as const;
export type SurgeTier = (typeof SURGE_TIERS)[number];

export const SEVERITIES = ['Info', 'Caution', 'Critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

/**
 * How much we trust an event:
 * - confirmed: the source page loads and mentions the event
 * - sourced: has a source link, but we couldn't confirm the page mentions it
 * - unconfirmed: no working source. Treat as a rumor.
 * - manual: you added it yourself
 */
export type Verification = 'confirmed' | 'sourced' | 'unconfirmed' | 'manual';

export interface GuideEvent {
  id: string;
  name: string;
  venue: string;
  corridor: Corridor;
  type: EventType;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM 24h, or '' if unknown
  endTime: string; // HH:MM 24h, or '' if unknown
  pickupTips: string;
  surgeTier: SurgeTier;
  attendance: string;
  hubId: string;
  sourceUrl: string;
  verification: Verification;
  verificationNote: string;
}

export interface DayForecast {
  date: string;
  dayName: string;
  demandRating: DemandRating;
  bestWindow: string;
  summary: string;
}

export interface Advisory {
  title: string;
  detail: string;
  severity: Severity;
}

export interface WeeklyGuide {
  weekOf: string;
  corridors: Corridor[];
  generatedAt: string;
  model: string;
  headline: string;
  days: DayForecast[];
  events: GuideEvent[];
  advisories: Advisory[];
}

export interface Source {
  title: string;
  uri: string;
}

export interface GuideBundle {
  guide: WeeklyGuide;
  sources: Source[];
}

// ---------- Shift log ----------

export const AREAS = ['MCO', 'OCCC', 'Universal', 'Disney', 'Downtown', 'Other'] as const;
export type Area = (typeof AREAS)[number];

export const PLATFORMS = ['Uber', 'Lyft', 'Both', 'Other'] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface Shift {
  id: string;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  platform: Platform;
  earnings: number; // fares + bonuses paid out, before tips
  tips: number;
  trips: number;
  miles: number;
  tolls: number;
  areas: Area[];
  notes: string;
  updatedAt: number; // ms epoch, for sync merging
  deleted?: boolean; // tombstone so deletes sync across devices
}

export interface ActiveShift {
  start: string;
}

// ---------- Settings ----------

export interface Settings {
  theme: 'auto' | 'dark' | 'light';
  mpg: number;
  gasPrice: number;
  maintenancePerMile: number;
  weeklyGoal: number;
  useLocation: boolean;
  accessCode: string;
  corridors: Corridor[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  mpg: 30,
  gasPrice: 3.2,
  maintenancePerMile: 0.1,
  weeklyGoal: 1200,
  useLocation: false,
  accessCode: '',
  corridors: [...CORRIDORS],
};

export type Tab = 'now' | 'week' | 'log' | 'earnings' | 'playbook';
