import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowState, etNow, addDays, isIsoDate } from '../src/lib/time.ts';
import { normalizeGuide, extractSources, parseJsonLoose } from '../src/lib/guide.ts';
import { corridorIntensity } from '../src/lib/analytics.ts';
import { shiftEarnings, SHIFTS } from '../src/data/ops.ts';

test('windowState handles active, upcoming, scheduled and midnight wrap', () => {
  assert.deepEqual(windowState('09:30', '11:30', 600), { kind: 'active', minutesLeft: 90, label: 'Active now · 1h 30m left' });
  assert.equal(windowState('09:30', '11:30', 540).label, 'Starts in 30m');
  assert.equal(windowState('22:00', '00:30', 10).kind, 'active'); // 00:10, yesterday's window
  assert.equal(windowState('22:00', '00:30', 1430).kind, 'active');
  assert.equal(windowState('21:00', '22:00', 300).label, 'Scheduled window');
});

test('etNow converts to America/New_York', () => {
  const n = etNow(new Date('2026-11-20T15:05:00Z')); // EST = UTC-5
  assert.equal(n.date, '2026-11-20');
  assert.equal(n.minutes, 10 * 60 + 5);
  assert.equal(n.weekday, 5);
});

test('date helpers', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.ok(isIsoDate('2026-02-28'));
  assert.ok(!isIsoDate('2026-02-30'));
});

test('normalizeGuide fills 7 days, drops out-of-week events, fixes enums and hubs', () => {
  const g = normalizeGuide(
    {
      events: [
        { name: 'Big Show', date: '2026-11-21', corridor: 'occc', type: 'convention', surgeTier: 'peak', stagingHubId: 'nope' },
        { name: 'Big Show', date: '2026-11-21', corridor: 'OCCC' },
        { name: 'Old', date: '2026-10-01' },
      ],
      days: [{ date: '2026-11-21', demandRating: 'Extreme' }],
    },
    '2026-11-20',
    ['OCCC'],
  );
  assert.equal(g.days.length, 7);
  assert.equal(g.events.length, 2);
  assert.notEqual(g.events[0].id, g.events[1].id);
  assert.equal(g.events[0].corridor, 'OCCC');
  assert.equal(g.events[0].surgeTier, 'Peak');
  assert.equal(g.events[0].stagingHubId, 'occc-west');
  assert.equal(g.days[1].demandScore, 95);
  assert.equal(g.days[1].eventIds.length, 2);
  assert.deepEqual(corridorIntensity(g).find((c) => c.corridor === 'OCCC'), { corridor: 'OCCC', intensity: 4, events: 2 });
});

test('extractSources dedupes by uri', () => {
  const s = extractSources([{ web: { uri: 'https://a.com/x', title: 'A' } }, { web: { uri: 'https://a.com/x' } }, { web: { uri: 'https://b.com' } }, {}]);
  assert.deepEqual(s, [{ uri: 'https://a.com/x', title: 'A' }, { uri: 'https://b.com', title: 'b.com' }]);
});

test('parseJsonLoose reads fenced JSON', () => {
  assert.deepEqual(parseJsonLoose('here:\n```json\n{"a":1}\n```'), { a: 1 });
});

test('shiftEarnings scales by tier and subtracts costs', () => {
  const s = SHIFTS[0];
  const e = shiftEarnings(s, 1.42, 40);
  assert.equal(e.gross, Math.round(s.baseGross * 1.42));
  assert.equal(e.net, e.gross - 40);
  assert.equal(e.perHour, e.net / s.hours);
});
