// Pure earnings math over the shift log. No React, no storage.
import type { Area, Settings, Shift } from '../types';
import { etNow } from './time';

export const DAYPARTS = ['Morning', 'Midday', 'Evening', 'Late night'] as const;
export type Daypart = (typeof DAYPARTS)[number];

/** Morning 5–11, Midday 11–16, Evening 16–21, Late night 21–5 (ET). */
export function daypartOf(minutes: number): Daypart {
  const h = Math.floor(minutes / 60) % 24;
  if (h >= 5 && h < 11) return 'Morning';
  if (h >= 11 && h < 16) return 'Midday';
  if (h >= 16 && h < 21) return 'Evening';
  return 'Late night';
}

export function costPerMile(s: Pick<Settings, 'mpg' | 'gasPrice' | 'maintenancePerMile'>): number {
  const fuel = s.mpg > 0 ? s.gasPrice / s.mpg : 0;
  return fuel + Math.max(0, s.maintenancePerMile);
}

export interface ShiftMath {
  hours: number;
  gross: number; // earnings + tips
  vehicleCost: number;
  net: number; // gross - tolls - vehicle cost
  netPerHour: number;
  grossPerMile: number;
  startEt: ReturnType<typeof etNow>;
}

export function shiftMath(s: Shift, cpm: number): ShiftMath {
  const hours = Math.max(0, (Date.parse(s.end) - Date.parse(s.start)) / 3_600_000);
  const gross = s.earnings + s.tips;
  const vehicleCost = s.miles * cpm;
  const net = gross - s.tolls - vehicleCost;
  return {
    hours,
    gross,
    vehicleCost,
    net,
    netPerHour: hours > 0 ? net / hours : 0,
    grossPerMile: s.miles > 0 ? gross / s.miles : 0,
    startEt: etNow(new Date(s.start)),
  };
}

export interface Totals {
  shifts: number;
  hours: number;
  gross: number;
  tips: number;
  miles: number;
  trips: number;
  costs: number; // tolls + vehicle
  net: number;
  netPerHour: number;
  netPerMile: number;
}

export function totals(shifts: Shift[], cpm: number): Totals {
  const t = { shifts: shifts.length, hours: 0, gross: 0, tips: 0, miles: 0, trips: 0, costs: 0, net: 0 };
  for (const s of shifts) {
    const m = shiftMath(s, cpm);
    t.hours += m.hours;
    t.gross += m.gross;
    t.tips += s.tips;
    t.miles += s.miles;
    t.trips += s.trips;
    t.costs += s.tolls + m.vehicleCost;
    t.net += m.net;
  }
  return { ...t, netPerHour: t.hours > 0 ? t.net / t.hours : 0, netPerMile: t.miles > 0 ? t.net / t.miles : 0 };
}

export interface Bucket {
  key: string;
  shifts: number;
  hours: number;
  net: number;
  netPerHour: number;
}

function bucketize(shifts: Shift[], cpm: number, keysOf: (s: Shift, m: ShiftMath) => string[], order: readonly string[]): Bucket[] {
  const map = new Map<string, { shifts: number; hours: number; net: number }>();
  for (const s of shifts) {
    const m = shiftMath(s, cpm);
    for (const k of keysOf(s, m)) {
      const b = map.get(k) ?? { shifts: 0, hours: 0, net: 0 };
      b.shifts += 1;
      b.hours += m.hours;
      b.net += m.net;
      map.set(k, b);
    }
  }
  return order.map((key) => {
    const b = map.get(key) ?? { shifts: 0, hours: 0, net: 0 };
    return { key, ...b, netPerHour: b.hours > 0 ? b.net / b.hours : 0 };
  });
}

export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** By the weekday the shift started (ET). */
export function byWeekday(shifts: Shift[], cpm: number): Bucket[] {
  return bucketize(shifts, cpm, (_s, m) => [WEEKDAY_NAMES[m.startEt.weekday]], WEEKDAY_NAMES);
}

/** By the daypart the shift started in (ET). */
export function byDaypart(shifts: Shift[], cpm: number): Bucket[] {
  return bucketize(shifts, cpm, (_s, m) => [daypartOf(m.startEt.minutes)], DAYPARTS);
}

/** Each shift counts toward every area it was tagged with. */
export function byArea(shifts: Shift[], cpm: number, areas: readonly Area[]): Bucket[] {
  return bucketize(shifts, cpm, (s) => s.areas, areas);
}

export const MIN_SAMPLE = 2;

export function bestBucket(buckets: Bucket[], min = MIN_SAMPLE): Bucket | null {
  const ok = buckets.filter((b) => b.shifts >= min && b.hours > 0);
  if (ok.length === 0) return null;
  return ok.reduce((a, b) => (b.netPerHour > a.netPerHour ? b : a));
}

/**
 * Your own net $/hr in an area during a daypart, relative to your overall average.
 * Returns null until there is enough history to say anything.
 */
export function personalFactor(
  shifts: Shift[],
  cpm: number,
  area: Area,
  daypart: Daypart,
): { mult: number; rate: number; samples: number } | null {
  const overall = totals(shifts, cpm);
  if (overall.hours <= 0 || overall.netPerHour <= 0) return null;
  const matching = shifts.filter((s) => s.areas.includes(area) && daypartOf(etNow(new Date(s.start)).minutes) === daypart);
  if (matching.length < 3) return null;
  const t = totals(matching, cpm);
  if (t.hours <= 0) return null;
  const mult = Math.min(1.25, Math.max(0.8, t.netPerHour / overall.netPerHour));
  return { mult, rate: t.netPerHour, samples: matching.length };
}

/** Monday 00:00 ET of the week containing `iso` date, as YYYY-MM-DD. */
export function weekStartOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  const back = dow === 0 ? 6 : dow - 1;
  dt.setUTCDate(dt.getUTCDate() - back);
  return dt.toISOString().slice(0, 10);
}

export function shiftDateEt(s: Shift): string {
  return etNow(new Date(s.start)).date;
}

export function money(n: number, cents = false): string {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;
}
