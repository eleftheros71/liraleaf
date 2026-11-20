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
  type GuideEvent,
  type Source,
  type WeeklyGuide,
} from '../types';
import { DEFAULT_HUB_BY_CORRIDOR, HUB_IDS } from '../data/hubs';
import { dayName, isIsoDate, weekDates } from './time';

type Loose = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v.trim() : fallback);

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return allowed.find((a) => a.toLowerCase() === v.trim().toLowerCase()) ?? fallback;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/** Accepts "19:30", "7:30 PM", "7 pm". Returns HH:MM (24h) or ''. */
export function parseTime(v: unknown): string {
  if (typeof v !== 'string') return '';
  const m = v.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return '';
  let h = Number(m[1]);
  const min = Number(m[2] ?? '0');
  const ap = m[3]?.toLowerCase().replace(/\./g, '');
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Coerce untrusted model output into a complete WeeklyGuide:
 * exactly 7 days, unique ids, valid enums, known hubs, 24h times.
 * Events outside the requested week are dropped. Verification is set later.
 */
export function normalizeGuide(raw: unknown, weekOf: string, corridors: Corridor[], model: string): WeeklyGuide {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Loose;
  const dates = weekDates(weekOf);

  const seen = new Set<string>();
  const events: GuideEvent[] = [];
  for (const e of Array.isArray(r.events) ? (r.events as Loose[]) : []) {
    if (!e || typeof e !== 'object') continue;
    const name = str(e.name);
    const date = isIsoDate(e.date) && dates.includes(e.date) ? e.date : null;
    if (!name || !date) continue;
    const corridor = pick(e.corridor, CORRIDORS, 'Other');
    let id = slug(`${name}-${date}`) || `event-${events.length}`;
    while (seen.has(id)) id = `${id}-x`;
    seen.add(id);
    const hub = str(e.hubId ?? e.stagingHubId);
    const sourceUrl = str(e.sourceUrl);
    events.push({
      id,
      name,
      venue: str(e.venue, 'TBA'),
      corridor,
      type: pick(e.type, EVENT_TYPES, 'Other'),
      date,
      startTime: parseTime(e.startTime),
      endTime: parseTime(e.endTime),
      pickupTips: str(e.pickupTips),
      surgeTier: pick(e.surgeTier, SURGE_TIERS, 'Moderate'),
      attendance: str(e.attendance),
      hubId: HUB_IDS.includes(hub) ? hub : DEFAULT_HUB_BY_CORRIDOR[corridor],
      sourceUrl: /^https?:\/\//i.test(sourceUrl) ? sourceUrl : '',
      verification: 'unconfirmed',
      verificationNote: 'Not checked yet.',
    });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '99').localeCompare(b.startTime || '99'));

  const rawDays = Array.isArray(r.days) ? (r.days as Loose[]) : [];
  const days: DayForecast[] = dates.map((date, i) => {
    const d = rawDays.find((x) => x && x.date === date) ?? rawDays[i] ?? {};
    return {
      date,
      dayName: dayName(date),
      demandRating: pick(d.demandRating, DEMAND_RATINGS, 'Moderate'),
      bestWindow: str(d.bestWindow),
      summary: str(d.summary),
    };
  });

  const advisories: Advisory[] = (Array.isArray(r.advisories) ? (r.advisories as Loose[]) : [])
    .filter((a) => a && str(a.title))
    .slice(0, 12)
    .map((a) => ({ title: str(a.title), detail: str(a.detail), severity: pick(a.severity, SEVERITIES, 'Info') }));

  return {
    weekOf,
    corridors,
    generatedAt: new Date().toISOString(),
    model,
    headline: str(r.headline),
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
    let title = typeof web?.title === 'string' ? web.title : '';
    if (!title) {
      try {
        title = new URL(uri).hostname;
      } catch {
        title = uri;
      }
    }
    out.push({ uri, title });
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

const STOP = new Set(['the', 'and', 'with', 'tour', 'live', 'presents', 'orlando', 'night', 'event', 'show', 'from', 'featuring', '2026', '2027']);

/** Significant words of an event name, for matching against a source page. */
export function keyTerms(name: string): string[] {
  return [...new Set(name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/))].filter(
    (w) => w.length >= 3 && !STOP.has(w),
  );
}

/** True when most key terms of the name appear in the page text. */
export function pageMentions(pageText: string, name: string): boolean {
  const terms = keyTerms(name);
  if (terms.length === 0) return false;
  const text = pageText.toLowerCase();
  const hits = terms.filter((t) => text.includes(t)).length;
  return hits / terms.length >= (terms.length <= 2 ? 1 : 0.6);
}

/** Strip tags/scripts so we match visible text, not markup. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ');
}
