// Ranks where to be right now. Pure: same inputs, same output.
import type { GuideEvent, Shift, SurgeTier, WeeklyGuide } from '../types';
import { HUBS, hubById, type StagingHub } from '../data/hubs';
import { PARKS, RECURRING, TERMINALS } from '../data/ops';
import { addDays, formatClock, formatDuration, toMinutes, weekdayOf, type EtNow } from './time';
import { daypartOf, personalFactor } from './earnings';

export type OppKind = 'airport' | 'park' | 'event' | 'recurring';

export interface Opportunity {
  id: string;
  kind: OppKind;
  title: string;
  hub: StagingHub;
  /** Minutes relative to today's ET midnight (can be negative or > 1440). */
  startAbs: number;
  endAbs: number;
  score: number;
  reasons: string[];
  etaMin: number | null;
  leaveByAbs: number | null;
  event?: GuideEvent;
}

export interface RankInput {
  now: EtNow;
  guide: GuideEvent[] | null;
  conventionDates: Set<string>;
  shifts: Shift[];
  costPerMile: number;
  position: { lat: number; lng: number } | null;
  horizonMin?: number;
}

const TIER_STRENGTH: Record<SurgeTier, number> = { Moderate: 52, High: 66, Peak: 80, Extreme: 92 };

/** Daily HH:MM window occurrences around today that overlap [now, now + horizon]. */
function dailyOccurrences(start: string, end: string, nowMin: number, horizon: number, today: string, days?: number[]) {
  const s = toMinutes(start);
  let e = toMinutes(end);
  if (e <= s) e += 1440;
  const out: { startAbs: number; endAbs: number }[] = [];
  for (const offset of [-1, 0, 1]) {
    const startAbs = offset * 1440 + s;
    const endAbs = offset * 1440 + e;
    if (endAbs <= nowMin || startAbs >= nowMin + horizon) continue;
    if (days && !days.includes(weekdayOf(addDays(today, offset)))) continue;
    out.push({ startAbs, endAbs });
  }
  return out;
}

function dayOffset(today: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough drive time: straight line × 1.3 road factor at ~28 mph average, plus 3 min. */
export function etaMinutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const miles = haversineKm(from, to) * 0.621 * 1.3;
  return Math.round((miles / 28) * 60 + 3);
}

/** Events let out over ~an hour; pre-event drop-offs run 90 min before start. */
function eventWindows(e: GuideEvent, today: string): { startAbs: number; endAbs: number; label: string }[] {
  const off = dayOffset(today, e.date);
  if (off < -1 || off > 1) return [];
  const base = off * 1440;
  const out: { startAbs: number; endAbs: number; label: string }[] = [];
  if (e.endTime) {
    let end = toMinutes(e.endTime);
    if (e.startTime && end <= toMinutes(e.startTime)) end += 1440;
    out.push({ startAbs: base + end - 15, endAbs: base + end + 50, label: 'Let-out' });
  }
  if (e.startTime) {
    const st = toMinutes(e.startTime);
    out.push({ startAbs: base + st - 90, endAbs: base + st - 10, label: 'Pre-event drop-offs' });
  }
  return out;
}

export function rankOpportunities(input: RankInput): Opportunity[] {
  const { now, shifts, costPerMile: cpm, position } = input;
  const horizon = input.horizonMin ?? 8 * 60;
  const nowMin = now.minutes;
  const raw: Omit<Opportunity, 'score' | 'reasons' | 'etaMin' | 'leaveByAbs'>[] = [];
  const baseOf = new Map<string, { strength: number; reasons: string[] }>();

  const push = (o: (typeof raw)[number], strength: number, reasons: string[]) => {
    raw.push(o);
    baseOf.set(o.id, { strength, reasons });
  };

  for (const t of TERMINALS) {
    const hub = hubById(t.hubId)!;
    for (const b of t.banks) {
      for (const occ of dailyOccurrences(b.start, b.end, nowMin, horizon, now.date)) {
        push(
          { id: `air-${b.id}-${occ.startAbs}`, kind: 'airport', title: `MCO ${t.name} · ${b.label}`, hub, ...occ },
          b.strength,
          [`Pick up at ${b.bayDetail}`, `Typical lot wait ${b.queueWait}`],
        );
      }
    }
  }

  for (const p of PARKS) {
    const hub = hubById(p.hubId)!;
    const closeMin = toMinutes(p.close);
    const end = `${String(Math.floor((closeMin + 60) / 60) % 24).padStart(2, '0')}:${String((closeMin + 60) % 60).padStart(2, '0')}`;
    for (const occ of dailyOccurrences(p.show, end, nowMin, horizon, now.date)) {
      push(
        { id: `park-${p.id}-${occ.startAbs}`, kind: 'park', title: `${p.park} egress`, hub, ...occ },
        p.strength,
        [`${p.showName} ${formatClock(p.show)}, close ${formatClock(p.close)}`, p.tips[0]],
      );
    }
  }

  for (const r of RECURRING) {
    const hub = hubById(r.hubId)!;
    for (const occ of dailyOccurrences(r.start, r.end, nowMin, horizon, now.date, r.days)) {
      if (r.needsConvention) {
        const date = addDays(now.date, Math.floor(occ.startAbs / 1440));
        if (!input.conventionDates.has(date)) continue;
      }
      push({ id: `rec-${r.id}-${occ.startAbs}`, kind: 'recurring', title: r.title, hub, ...occ }, r.strength, [r.note]);
    }
  }

  for (const e of input.guide ?? []) {
    const hub = hubById(e.hubId) ?? HUBS[0];
    for (const w of eventWindows(e, now.date)) {
      if (w.endAbs <= nowMin || w.startAbs >= nowMin + horizon) continue;
      const strength = TIER_STRENGTH[e.surgeTier] - (w.label === 'Let-out' ? 0 : 14);
      const reasons = [`${w.label} · ${e.venue}`, ...(e.pickupTips ? [e.pickupTips] : [])];
      if (e.verification === 'unconfirmed') reasons.push('Unconfirmed event: no working source. Verify before you commit.');
      push(
        { id: `ev-${e.id}-${w.label}`, kind: 'event', title: `${e.name}`, hub, startAbs: w.startAbs, endAbs: w.endAbs, event: e },
        e.verification === 'unconfirmed' ? strength * 0.6 : strength,
        reasons,
      );
    }
  }

  const out: Opportunity[] = [];
  for (const o of raw) {
    const base = baseOf.get(o.id)!;
    const reasons = [...base.reasons];
    let score = base.strength;

    // Timing: active now beats later.
    const until = o.startAbs - nowMin;
    if (until > 0) {
      score *= until <= 30 ? 0.95 : until <= 90 ? 0.85 : until <= 180 ? 0.72 : 0.6;
    }

    // Personal history.
    const pf = personalFactor(shifts, cpm, o.hub.area, daypartOf(((o.startAbs % 1440) + 1440) % 1440));
    if (pf) {
      score *= pf.mult;
      reasons.push(`Your history here at this time: $${pf.rate.toFixed(0)}/hr net over ${pf.samples} shifts`);
    }

    // Distance.
    let etaMin: number | null = null;
    let leaveByAbs: number | null = null;
    if (position) {
      etaMin = etaMinutes(position, o.hub);
      if (nowMin + etaMin > o.endAbs - 10) continue; // can't make it in time
      score *= 1 - Math.min(0.35, etaMin / 150);
      if (o.startAbs - etaMin > nowMin) leaveByAbs = o.startAbs - etaMin;
      reasons.push(`About ${formatDuration(etaMin)} away`);
    }

    out.push({ ...o, score: Math.round(Math.min(100, score)), reasons, etaMin, leaveByAbs });
  }

  // One entry per hub+time slot: keep the strongest when windows collide at the same place.
  out.sort((a, b) => b.score - a.score || a.startAbs - b.startAbs);
  const seen = new Set<string>();
  return out.filter((o) => {
    const key = `${o.hub.id}-${Math.round(o.startAbs / 60)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function conventionDatesOf(guide: WeeklyGuide | null, extra: GuideEvent[] = []): Set<string> {
  const all = [...(guide?.events ?? []), ...extra];
  return new Set(all.filter((e) => e.type === 'Convention' && e.verification !== 'unconfirmed').map((e) => e.date));
}

/** Human status for an absolute window. */
export function absStatus(startAbs: number, endAbs: number, nowMin: number): { active: boolean; text: string } {
  if (nowMin >= startAbs && nowMin < endAbs) return { active: true, text: `Now · ${formatDuration(endAbs - nowMin)} left` };
  return { active: false, text: `In ${formatDuration(Math.max(0, startAbs - nowMin))}` };
}

export function absClock(abs: number): string {
  const m = ((abs % 1440) + 1440) % 1440;
  return formatClock(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
}
