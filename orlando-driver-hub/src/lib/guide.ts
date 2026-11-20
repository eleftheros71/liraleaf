// Pure guide helpers shared by server.ts and the client. No SDK imports here.
import {
  CORRIDORS,
  DEMAND_RATINGS,
  EVENT_TYPES,
  SEVERITIES,
  SURGE_TIERS,
  type Advisory,
  type Corridor,
  type DayForecast,
  type DemandRating,
  type GuideEvent,
  type Source,
  type SurgeTier,
  type WeeklyGuide,
} from '../types';
import { DEFAULT_HUB_BY_CORRIDOR, HUB_IDS } from '../data/hubs';
import { dayName, isIsoDate, weekDates } from './time';

type Loose = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v.trim() : fallback);

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  const hit = allowed.find((a) => a.toLowerCase() === v.trim().toLowerCase());
  return hit ?? fallback;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

const SCORE_BY_RATING: Record<DemandRating, number> = { Low: 25, Moderate: 45, High: 65, Peak: 82, Extreme: 95 };

export const TIER_WEIGHT: Record<SurgeTier, number> = { Moderate: 1, High: 2, Peak: 3, Extreme: 4 };

/**
 * Coerce untrusted model output into a complete WeeklyGuide:
 * exactly 7 days starting at weekOf, unique event ids, valid enums,
 * staging hubs that exist on the map.
 */
export function normalizeGuide(raw: unknown, weekOf: string, corridors: Corridor[]): WeeklyGuide {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Loose;
  const dates = weekDates(weekOf);

  const seen = new Set<string>();
  const rawEvents = Array.isArray(r.events) ? (r.events as Loose[]) : [];
  const events: GuideEvent[] = [];
  for (const e of rawEvents) {
    if (!e || typeof e !== 'object') continue;
    const name = str(e.name);
    if (!name) continue;
    const corridor = pick(e.corridor, CORRIDORS, 'Other');
    const date = isIsoDate(e.date) && dates.includes(e.date) ? e.date : null;
    if (!date) continue; // drop events outside the requested week
    let id = slug(str(e.id) || `${name}-${date}`) || `event-${events.length}`;
    while (seen.has(id)) id = `${id}-x`;
    seen.add(id);
    const hub = str(e.stagingHubId);
    const sourceUrl = str(e.sourceUrl);
    events.push({
      id,
      name,
      venue: str(e.venue, 'TBA'),
      corridor,
      type: pick(e.type, EVENT_TYPES, 'Other'),
      date,
      startTime: str(e.startTime, 'TBA'),
      endTime: str(e.endTime, 'TBA'),
      pickupTimes: str(e.pickupTimes),
      dispatchStrategy: str(e.dispatchStrategy),
      surgeTier: pick(e.surgeTier, SURGE_TIERS, 'Moderate'),
      expectedAttendance: str(e.expectedAttendance),
      stagingHubId: HUB_IDS.includes(hub) ? hub : DEFAULT_HUB_BY_CORRIDOR[corridor],
      sourceUrl: /^https?:\/\//i.test(sourceUrl) ? sourceUrl : '',
    });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const rawDays = Array.isArray(r.days) ? (r.days as Loose[]) : [];
  const days: DayForecast[] = dates.map((date, i) => {
    const d = rawDays.find((x) => x && x.date === date) ?? rawDays[i] ?? {};
    const rating = pick(d.demandRating, DEMAND_RATINGS, 'Moderate');
    const scoreRaw = typeof d.demandScore === 'number' ? d.demandScore : Number(d.demandScore);
    const score = Number.isFinite(scoreRaw) ? Math.round(Math.min(100, Math.max(0, scoreRaw))) : SCORE_BY_RATING[rating];
    return {
      date,
      dayName: dayName(date),
      demandRating: rating,
      demandScore: score,
      surgeWindow: str(d.surgeWindow, '—'),
      summary: str(d.summary),
      eventIds: events.filter((e) => e.date === date).map((e) => e.id),
    };
  });

  const gs = (r.globalStrategy && typeof r.globalStrategy === 'object' ? r.globalStrategy : {}) as Loose;
  const advisories: Advisory[] = (Array.isArray(r.advisories) ? (r.advisories as Loose[]) : [])
    .filter((a) => a && str(a.title))
    .map((a) => ({
      title: str(a.title),
      detail: str(a.detail),
      severity: pick(a.severity, SEVERITIES, 'Info'),
      corridor: pick(a.corridor, CORRIDORS, 'Other'),
    }));

  return {
    weekOf,
    corridors,
    generatedAt: new Date().toISOString(),
    globalStrategy: {
      topEarningDay: str(gs.topEarningDay, '—'),
      topEarningDayReason: str(gs.topEarningDayReason),
      primaryFocus: str(gs.primaryFocus, '—'),
      primaryFocusReason: str(gs.primaryFocusReason),
      surgeAlert: str(gs.surgeAlert, '—'),
      surgeAlertReason: str(gs.surgeAlertReason),
    },
    days,
    events,
    advisories,
  };
}

/** Pull web citations out of Gemini grounding metadata, de-duplicated by URI. */
export function extractSources(groundingChunks: unknown): Source[] {
  if (!Array.isArray(groundingChunks)) return [];
  const out: Source[] = [];
  const seen = new Set<string>();
  for (const chunk of groundingChunks) {
    const web = (chunk as { web?: { uri?: unknown; title?: unknown } })?.web;
    const uri = typeof web?.uri === 'string' ? web.uri : '';
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    out.push({ uri, title: typeof web?.title === 'string' && web.title ? web.title : new URL(uri).hostname });
  }
  return out;
}

/** Find the first JSON object in free text (fallback when schema mode is unavailable). */
export function parseJsonLoose(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model response');
  return JSON.parse(body.slice(start, end + 1));
}
