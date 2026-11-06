import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wateringInterval, computeTasks, completeTask, skipTask, snoozeTask, undoLast, season, addDays } from '../js/care.js';
import { byId } from '../js/species.js';
import { diagnose } from '../js/doctor.js';

const JUNE = new Date('2026-06-15T10:00:00');
const JAN = new Date('2026-01-15T10:00:00');
const basePlant = { id: 'p1', speciesId: 'pothos', siteId: 's1', potCm: 14, material: 'plastic', drainage: true, planting: 'pot', windowM: 1, log: [], snooze: {}, added: '2026-01-01T00:00:00Z' };
const site = { id: 's1', name: 'Living', light: 'medium', humidity: 'normal', outdoor: false };
const ctx = (date, extra = {}) => ({ date, lat: 50, speciesById: byId, ...extra });

test('season respects hemisphere', () => {
  assert.equal(season(JAN, 50), 'winter');
  assert.equal(season(JAN, -33), 'summer');
  assert.equal(season(JUNE, -33), 'winter');
});

test('baseline plant in summer waters slightly more often than species base', () => {
  const w = wateringInterval(basePlant, byId('pothos'), site, ctx(JUNE));
  assert.equal(w.base, 8);
  assert.equal(w.days, 7); // 8 × 0.9 summer = 7.2
});

test('terracotta, bright light and small pot shorten the interval; no drainage lengthens it', () => {
  const sp = byId('pothos');
  const fast = wateringInterval({ ...basePlant, material: 'terracotta', potCm: 9 }, sp, { ...site, light: 'bright' }, ctx(JUNE)).days;
  const slow = wateringInterval({ ...basePlant, drainage: false, potCm: 25 }, sp, site, ctx(JUNE)).days;
  assert.ok(fast < 7, `fast=${fast}`);
  assert.ok(slow > 7, `slow=${slow}`);
});

test('dormant species in winter waters much less and stops fertilizing', () => {
  const plant = { ...basePlant, speciesId: 'snake' };
  const w = wateringInterval(plant, byId('snake'), site, ctx(JAN));
  assert.equal(w.days, 36); // 18 × 2
  const tasks = computeTasks({ plants: [plant], sites: [site] }, ctx(JAN));
  assert.ok(!tasks.some((t) => t.type === 'fertilize'));
});

test('outdoor heat speeds watering; rain resets the watering clock', () => {
  const out = { ...site, outdoor: true, light: 'direct' };
  const plant = { ...basePlant, speciesId: 'tomato', siteId: 's1', lastWatered: addDays(JUNE, -5).toISOString() };
  const hot = wateringInterval(plant, byId('tomato'), out, ctx(JUNE, { weather: { maxTemp: 31, rainMm24h: 0 } })).days;
  assert.equal(hot, 1);
  const dry = computeTasks({ plants: [plant], sites: [out] }, ctx(JUNE, { weather: { maxTemp: 20, rainMm24h: 0 } })).find((t) => t.type === 'water');
  const wet = computeTasks({ plants: [plant], sites: [out] }, ctx(JUNE, { weather: { maxTemp: 20, rainMm24h: 8 } })).find((t) => t.type === 'water');
  assert.ok(dry.overdue > 0);
  assert.equal(wet.overdue, 0);
  assert.ok(wet.inDays >= 1);
});

test('complete / skip / snooze / undo lifecycle', () => {
  const plant = { ...basePlant, lastWatered: addDays(JUNE, -10).toISOString() };
  const s = (p) => computeTasks({ plants: [p], sites: [site] }, ctx(JUNE)).find((t) => t.type === 'water');
  assert.ok(s(plant).overdue > 0);
  const done = completeTask(plant, 'water', JUNE);
  assert.equal(s(done).inDays, 7);
  const skipped = skipTask(plant, 'water', JUNE);
  assert.equal(s(skipped).inDays, 7);
  assert.equal(skipped.log.at(-1).kind, 'skip');
  const snoozed = snoozeTask(plant, 'water', 2, JUNE);
  assert.equal(s(snoozed).inDays, 2);
  assert.ok(s(undoLast(done, 'water')).overdue > 0);
  assert.equal(completeTask(snoozed, 'water', JUNE).snooze.water, undefined);
});

test('addDays is calendar-based across daylight-saving changes', () => {
  for (const [start, expected] of [['2026-10-28T12:00:00', '2026-11-03'], ['2026-03-05T12:00:00', '2026-03-11']]) {
    const d = addDays(new Date(start), 6);
    assert.equal(d.getHours(), 0);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    assert.equal(ymd, expected);
  }
});

test('misting only for humidity-loving indoor plants in dry rooms', () => {
  const cal = { ...basePlant, speciesId: 'calathea' };
  const types = (st) => computeTasks({ plants: [cal], sites: [st] }, ctx(JUNE)).map((t) => t.type);
  assert.ok(types(site).includes('mist'));
  assert.ok(!types({ ...site, humidity: 'high' }).includes('mist'));
});

test('doctor ranks overwatering first for yellow leaves without drainage', () => {
  const r = diagnose('yellow', { ...basePlant, drainage: false }, byId('pothos'), site, JUNE);
  assert.match(r[0].cause, /Overwatering/);
  const leggy = diagnose('leggy', basePlant, byId('aloe'), { ...site, light: 'low' }, JUNE);
  assert.match(leggy[0].cause, /light/);
});
