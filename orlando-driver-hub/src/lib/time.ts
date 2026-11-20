export const ET_ZONE = 'America/New_York';

export interface EtNow {
  date: string; // YYYY-MM-DD in ET
  minutes: number; // minutes since ET midnight
  weekday: number; // 0 = Sunday
  timeLabel: string; // "7:42 PM"
}

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

const labelFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: ET_ZONE,
  hour: 'numeric',
  minute: '2-digit',
});

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function etNow(d: Date = new Date()): EtNow {
  const p: Record<string, string> = {};
  for (const part of partsFmt.formatToParts(d)) p[part.type] = part.value;
  const hour = Number(p.hour) % 24;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: hour * 60 + Number(p.minute),
    weekday: WEEKDAYS.indexOf(p.weekday),
    timeLabel: labelFmt.format(d),
  };
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function formatClock(hhmm: string): string {
  const mins = toMinutes(hhmm);
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const suffix = h >= 12 ? 'p' : 'a';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export type WindowState =
  | { kind: 'active'; minutesLeft: number; label: string }
  | { kind: 'upcoming'; minutesUntil: number; label: string }
  | { kind: 'scheduled'; label: string };

/** How soon "Starts in" is shown instead of "Scheduled window". */
const UPCOMING_HORIZON = 6 * 60;

/**
 * Status of a daily window relative to the current ET minute.
 * Handles windows that wrap past midnight (e.g. 22:00–00:30).
 */
export function windowState(start: string, end: string, nowMinutes: number): WindowState {
  const s = toMinutes(start);
  let e = toMinutes(end);
  if (e <= s) e += 1440;
  // Check today's occurrence and yesterday's (for wrap-past-midnight windows).
  for (const offset of [0, -1440]) {
    const ss = s + offset;
    const ee = e + offset;
    if (nowMinutes >= ss && nowMinutes < ee) {
      const left = ee - nowMinutes;
      return { kind: 'active', minutesLeft: left, label: `Active now · ${formatDuration(left)} left` };
    }
  }
  let until = s - nowMinutes;
  if (until < 0) until += 1440;
  if (until <= UPCOMING_HORIZON) {
    return { kind: 'upcoming', minutesUntil: until, label: `Starts in ${formatDuration(until)}` };
  }
  return { kind: 'scheduled', label: 'Scheduled window' };
}

/** Minutes until the window starts (0 if active). Used to sort "next up". */
export function minutesUntilStart(start: string, end: string, nowMinutes: number): number {
  const st = windowState(start, end, nowMinutes);
  if (st.kind === 'active') return 0;
  let until = toMinutes(start) - nowMinutes;
  if (until < 0) until += 1440;
  return until;
}

// ---- Calendar-date helpers (timezone-free, on YYYY-MM-DD strings) ----

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function dayName(iso: string): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekdayOf(iso)];
}

export function prettyDate(iso: string, opts: { weekday?: boolean } = {}): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    ...(opts.weekday ? { weekday: 'short' } : {}),
  });
}

export function weekDates(weekOf: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekOf, i));
}

export function isWeekend(iso: string): boolean {
  const w = weekdayOf(iso);
  return w === 5 || w === 6 || w === 0;
}

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return addDays(s, 0) === s;
}
