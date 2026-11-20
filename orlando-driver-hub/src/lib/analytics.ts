import { CORRIDORS, EVENT_TYPES, type WeeklyGuide } from '../types';
import { TIER_WEIGHT } from './guide';

export function demandByDay(guide: WeeklyGuide) {
  return guide.days.map((d) => ({ day: d.dayName.slice(0, 3), date: d.date, score: d.demandScore, rating: d.demandRating }));
}

/** Sum of surge-tier weights (Moderate 1 … Extreme 4) per corridor. */
export function corridorIntensity(guide: WeeklyGuide) {
  return CORRIDORS.map((c) => {
    const events = guide.events.filter((e) => e.corridor === c);
    return {
      corridor: c,
      intensity: events.reduce((sum, e) => sum + TIER_WEIGHT[e.surgeTier], 0),
      events: events.length,
    };
  });
}

export function eventMix(guide: WeeklyGuide) {
  return EVENT_TYPES.map((t) => ({ type: t, count: guide.events.filter((e) => e.type === t).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}
