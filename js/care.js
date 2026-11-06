// LiraLeaf care engine — pure functions, no DOM. Runs in the browser and in Node tests.
// Inputs mirror the parameters observed in the analysed app (pot size/material, soil,
// drainage, site light, window distance, indoor/outdoor, season/dormancy, weather),
// but the formula and weights here are our own design.

export const LIGHT = { low: 1, medium: 2, bright: 3, direct: 4 };
export const TASK_TYPES = ['water', 'fertilize', 'mist', 'repot', 'clean'];
export const TASK_LABEL = { water: 'Water', fertilize: 'Fertilize', mist: 'Mist', repot: 'Repot', clean: 'Clean leaves' };

const DAY = 86400000;
export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
// Calendar-day arithmetic (not fixed 24 h blocks) so daylight-saving changes don't shift dates.
export const addDays = (d, n) => { const x = startOfDay(d); x.setDate(x.getDate() + Math.round(n)); return x; };
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function season(date, lat = 50) {
  const m = new Date(date).getMonth();
  const north = lat >= 0;
  const winter = north ? [10, 11, 0, 1] : [4, 5, 6, 7];
  const summer = north ? [5, 6, 7] : [11, 0, 1];
  if (winter.includes(m)) return 'winter';
  if (summer.includes(m)) return 'summer';
  return 'shoulder';
}

const MATERIAL = { plastic: 1, glazed: 1, glass: 1, metal: 1, terracotta: 0.85, fabric: 0.8, concrete: 0.95, wood: 0.95 };
const SOIL = { standard: 1, cactus: 1.15, bark: 0.85, peat: 1.1 };

/** Returns {days, factors:[{label, factor}]} for watering. */
export function wateringInterval(plant, species, site = {}, ctx = {}) {
  const f = [];
  const add = (label, factor) => { if (Math.abs(factor - 1) > 0.001) f.push({ label, factor }); };

  const pot = Number(plant.potCm) || 14;
  if (plant.planting !== 'ground') add(`Pot ${pot} cm`, clamp(Math.sqrt(pot / 14), 0.6, 1.6));
  else add('Planted in ground', 1.5);

  add(`${plant.material || 'plastic'} pot`, MATERIAL[plant.material] ?? 1);
  if (plant.drainage === false) add('No drainage hole', 1.2);
  const soil = plant.soil || species.soil || 'standard';
  add(`${soil} soil`, SOIL[soil] ?? 1);

  const siteLight = LIGHT[site.light] ?? 2;
  add(`${site.light || 'medium'} light`, clamp(1 - 0.1 * (siteLight - 2), 0.75, 1.15));

  const outdoor = !!site.outdoor;
  if (!outdoor && plant.windowM != null && plant.windowM !== '') {
    const w = Number(plant.windowM);
    add(`${w} m from window`, w < 0.5 ? 0.95 : w > 2 ? 1.1 : 1);
  }

  const s = season(ctx.date || new Date(), ctx.lat);
  if (s === 'winter') add(species.dormantWinter ? 'Winter dormancy' : 'Winter', species.dormantWinter ? 2 : 1.4);
  if (s === 'summer') add('Summer', 0.9);

  if (outdoor && ctx.weather) {
    const t = ctx.weather.maxTemp;
    if (t != null) add(`Outdoor ${Math.round(t)}°C`, t >= 28 ? 0.75 : t <= 10 ? 1.4 : 1);
  }

  const raw = f.reduce((acc, x) => acc * x.factor, species.waterDays);
  return { days: clamp(Math.round(raw), 1, 60), base: species.waterDays, factors: f };
}

export function fertilizeInterval(plant, species, site, ctx = {}) {
  const s = season(ctx.date || new Date(), ctx.lat);
  if (s === 'winter' && species.dormantWinter) return null; // paused
  return s === 'winter' ? species.fertilizeDays * 2 : species.fertilizeDays;
}

export function mistInterval(plant, species, site = {}) {
  if (species.humidity !== 'high' || site.outdoor || site.humidity === 'high') return null;
  return 3;
}

export function intervalFor(type, plant, species, site, ctx) {
  switch (type) {
    case 'water': return wateringInterval(plant, species, site, ctx).days;
    case 'fertilize': return fertilizeInterval(plant, species, site, ctx);
    case 'mist': return mistInterval(plant, species, site);
    case 'repot': return plant.planting === 'ground' ? null : species.repotMonths * 30;
    case 'clean': return site?.outdoor ? null : species.cleanDays;
    default: return null;
  }
}

/** Most recent done/skip event of a type. */
export function lastEvent(plant, type) {
  let best = null;
  for (const e of plant.log || []) {
    if (e.type === type && (e.kind === 'done' || e.kind === 'skip') && (!best || e.at > best.at)) best = e;
  }
  return best;
}

function referenceDate(type, plant, site, ctx) {
  const ev = lastEvent(plant, type);
  let ref = ev ? new Date(ev.at) : null;
  if (type === 'water' && !ev && plant.lastWatered) ref = new Date(plant.lastWatered);
  if (type === 'repot' && !ev && plant.lastRepotted) ref = new Date(plant.lastRepotted);
  if (type === 'water' && site?.outdoor && ctx.weather?.rainMm24h >= 5) {
    const rainDay = startOfDay(ctx.date || new Date());
    if (!ref || rainDay > ref) ref = rainDay; // rain counts as a watering
  }
  if (!ref && type !== 'water') ref = new Date(plant.added || ctx.date || Date.now());
  return ref;
}

/** All tasks for all plants with a due date. */
export function computeTasks(state, ctx = {}) {
  const today = startOfDay(ctx.date || new Date());
  const out = [];
  for (const plant of state.plants) {
    const species = ctx.speciesById(plant.speciesId);
    if (!species) continue;
    const site = state.sites.find((s) => s.id === plant.siteId) || {};
    for (const type of TASK_TYPES) {
      const interval = intervalFor(type, plant, species, site, { ...ctx, date: today });
      if (!interval) continue;
      const ref = referenceDate(type, plant, site, { ...ctx, date: today });
      let due = ref ? addDays(ref, interval) : today;
      const snooze = plant.snooze?.[type];
      if (snooze && new Date(snooze) > due) due = startOfDay(snooze);
      out.push({ plantId: plant.id, type, interval, due, overdue: Math.max(0, daysBetween(due, today)), inDays: daysBetween(today, due) });
    }
  }
  return out.sort((a, b) => a.due - b.due);
}

// ---- Mutations (return new plant objects; caller persists) ----
export function completeTask(plant, type, at = new Date(), kind = 'done') {
  const snooze = { ...(plant.snooze || {}) }; delete snooze[type];
  const extra = type === 'repot' && kind === 'done' ? { lastRepotted: at.toISOString() } : {};
  return { ...plant, ...extra, snooze, log: [...(plant.log || []), { type, kind, at: at.toISOString() }] };
}
export const skipTask = (plant, type, at) => completeTask(plant, type, at, 'skip');
export function snoozeTask(plant, type, days = 1, from = new Date()) {
  return { ...plant, snooze: { ...(plant.snooze || {}), [type]: addDays(from, days).toISOString() } };
}
export function undoLast(plant, type) {
  const log = [...(plant.log || [])];
  for (let i = log.length - 1; i >= 0; i--) if (log[i].type === type && log[i].kind !== 'note') { log.splice(i, 1); break; }
  return { ...plant, log };
}
