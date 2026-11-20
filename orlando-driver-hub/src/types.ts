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

export interface GlobalStrategy {
  topEarningDay: string;
  topEarningDayReason: string;
  primaryFocus: string;
  primaryFocusReason: string;
  surgeAlert: string;
  surgeAlertReason: string;
}

export interface DayForecast {
  date: string; // YYYY-MM-DD
  dayName: string;
  demandRating: DemandRating;
  demandScore: number; // 0-100
  surgeWindow: string;
  summary: string;
  eventIds: string[];
}

export interface GuideEvent {
  id: string;
  name: string;
  venue: string;
  corridor: Corridor;
  type: EventType;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  pickupTimes: string;
  dispatchStrategy: string;
  surgeTier: SurgeTier;
  expectedAttendance: string;
  stagingHubId: string;
  sourceUrl: string;
}

export interface Advisory {
  title: string;
  detail: string;
  severity: Severity;
  corridor: Corridor;
}

export interface WeeklyGuide {
  weekOf: string;
  corridors: Corridor[];
  generatedAt: string;
  globalStrategy: GlobalStrategy;
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

export type Page = 'setup' | 'events' | 'staging' | 'flights' | 'egress' | 'shifts' | 'analytics';
