import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowState, etNow, addDays, isIsoDate } from '../src/lib/time.ts';
import { normalizeGuide, extractSources, parseJsonLoose, parseTime, pageMentions, htmlToText } from '../src/lib/guide.ts';
import { byWeekday, costPerMile, daypartOf, personalFactor, shiftMath, totals, weekStartOf } from '../src/lib/earnings.ts';
import { conventionDatesOf, etaMinutes, rankOpportunities } from '../src/lib/opportunities.ts';
import type { GuideEvent, Shift } from '../src/types.ts';

const at = (iso: string) => etNow(new Date(iso));

test('windowState handles active, upcoming, scheduled and midnight wrap', () => {
  assert.equal(windowState('09:30', '11:30', 600).label, 'Active now · 1h 30m left');
  assert.equal(windowState('09:30', '11:30', 540).label, 'Starts in 30m');
  assert.equal(windowState('22:00', '00:30', 10).kind, 'active');
  assert.equal(windowState('21:00', '22:00', 300).label, 'Scheduled window');
});

test('etNow converts to America/New_York', () => {
  const n = at('2026-11-20T15:05:00Z'); // EST = UTC-5
  assert.equal(n.date, '2026-11-20');
  assert.equal(n.minutes, 10 * 60 + 5);
  assert.equal(n.weekday, 5);
  assert.equal(at('2026-07-04T03:30:00Z').date, '2026-07-03'); // EDT
});

test('date helpers', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.ok(isIsoDate('2026-02-28'));
  assert.ok(!isIsoDate('2026-02-30'));
  assert.equal(weekStartOf('2026-11-22'), '2026-11-16'); // Sunday -> Monday before
  assert.equal(weekStartOf('2026-11-23'), '2026-11-23');
});

test('parseTime accepts 24h and 12h formats', () => {
  assert.equal(parseTime('19:30'), '19:30');
  assert.equal(parseTime('7:30 PM'), '19:30');
  assert.equal(parseTime('12 am'), '00:00');
  assert.equal(parseTime('TBA'), '');
});

test('normalizeGuide keeps 7 days, drops out-of-week events, fixes enums and hubs', () => {
  const g = normalizeGuide(
    {
      events: [
        { name: 'Big Show', date: '2026-11-21', corridor: 'occc', type: 'convention', surgeTier: 'peak', hubId: 'nope', startTime: '9:00 AM', endTime: '17:00' },
        { name: 'Big Show', date: '2026-11-21', corridor: 'OCCC' },
        { name: 'Old', date: '2026-10-01' },
      ],
      days: [{ date: '2026-11-21', demandRating: 'Extreme' }],
    },
    '2026-11-20',
    ['OCCC'],
    'test-model',
  );
  assert.equal(g.days.length, 7);
  assert.equal(g.events.length, 2);
  assert.notEqual(g.events[0].id, g.events[1].id);
  assert.equal(g.events[0].corridor, 'OCCC');
  assert.equal(g.events[0].surgeTier, 'Peak');
  assert.equal(g.events[0].hubId, 'occc-west');
  assert.equal(g.events[0].startTime, '09:00');
  assert.equal(g.events[0].verification, 'unconfirmed');
  assert.equal(g.days[1].demandRating, 'Extreme');
});

test('extractSources dedupes by uri; parseJsonLoose reads fenced JSON', () => {
  const s = extractSources([{ web: { uri: 'https://a.com/x', title: 'a.com' } }, { web: { uri: 'https://a.com/x' } }, { web: { uri: 'https://b.com' } }, {}]);
  assert.deepEqual(s, [{ uri: 'https://a.com/x', title: 'a.com' }, { uri: 'https://b.com', title: 'b.com' }]);
  assert.deepEqual(parseJsonLoose('here:\n```json\n{"a":1}\n```'), { a: 1 });
});

test('pageMentions matches visible text, not markup', () => {
  const page = htmlToText('<html><script>var x="Celtics"</script><h1>Orlando Magic vs. Boston Celtics</h1></html>');
  assert.ok(pageMentions(page, 'Orlando Magic vs. Boston Celtics'));
  assert.ok(!pageMentions(htmlToText('<script>Boston Celtics Magic</script><p>Tickets</p>'), 'Magic vs Celtics'));
  assert.ok(!pageMentions('Some other concert', 'Taylor Swift The Eras Tour'));
});

const shift = (start: string, hours: number, over: Partial<Shift> = {}): Shift => ({
  id: start,
  start,
  end: new Date(Date.parse(start) + hours * 3_600_000).toISOString(),
  platform: 'Uber',
  earnings: 200,
  tips: 20,
  trips: 10,
  miles: 100,
  tolls: 5,
  areas: ['MCO'],
  notes: '',
  updatedAt: 1,
  ...over,
});

test('shift math: net = earnings + tips - tolls - miles × cost per mile', () => {
  const cpm = costPerMile({ mpg: 25, gasPrice: 3, maintenancePerMile: 0.1 }); // 0.12 + 0.10
  assert.ok(Math.abs(cpm - 0.22) < 1e-9);
  const m = shiftMath(shift('2026-11-20T22:00:00Z', 5), cpm);
  assert.equal(m.hours, 5);
  assert.ok(Math.abs(m.net - (220 - 5 - 22)) < 1e-9);
  assert.ok(Math.abs(m.netPerHour - 193 / 5) < 1e-9);
  const t = totals([shift('2026-11-20T22:00:00Z', 5), shift('2026-11-21T22:00:00Z', 5)], cpm);
  assert.equal(t.shifts, 2);
  assert.ok(Math.abs(t.net - 386) < 1e-9);
});

test('buckets use the ET weekday and daypart of the shift start', () => {
  // 2026-11-21 02:00Z = Fri 9:00 PM ET
  const b = byWeekday([shift('2026-11-21T02:00:00Z', 4)], 0.2);
  assert.equal(b.find((x) => x.key === 'Fri')!.shifts, 1);
  assert.equal(daypartOf(21 * 60), 'Late night');
  assert.equal(daypartOf(17 * 60), 'Evening');
});

test('personalFactor needs 3 matching shifts and is clamped', () => {
  const evening = (d: string, earnings: number, area: Shift['areas'][number]) => shift(`${d}T22:00:00Z`, 4, { earnings, areas: [area] }); // 5 PM ET
  const few = [evening('2026-11-02', 400, 'Disney'), evening('2026-11-03', 400, 'Disney')];
  assert.equal(personalFactor(few, 0.2, 'Disney', 'Evening'), null);
  const many = [...few, evening('2026-11-04', 400, 'Disney'), evening('2026-11-05', 50, 'MCO'), evening('2026-11-06', 50, 'MCO')];
  const pf = personalFactor(many, 0.2, 'Disney', 'Evening')!;
  assert.equal(pf.samples, 3);
  assert.equal(pf.mult, 1.25);
});

const ev = (over: Partial<GuideEvent>): GuideEvent => ({
  id: 'e1',
  name: 'Arena Show',
  venue: 'Kia Center',
  corridor: 'Sports/Concerts',
  type: 'Concert',
  date: '2026-11-20',
  startTime: '19:30',
  endTime: '22:30',
  pickupTips: '',
  surgeTier: 'Extreme',
  attendance: '',
  hubId: 'kia',
  sourceUrl: 'https://example.com',
  verification: 'confirmed',
  verificationNote: '',
  ...over,
});

test('rankOpportunities puts an active extreme let-out on top and respects reachability', () => {
  const now = at('2026-11-21T03:20:00Z'); // Fri 10:20 PM ET
  const base = { now, conventionDates: new Set<string>(), shifts: [], costPerMile: 0.2, position: null };
  const ranked = rankOpportunities({ ...base, guide: [ev({})] });
  assert.equal(ranked[0].kind, 'event');
  assert.equal(ranked[0].hub.id, 'kia');

  const unconfirmed = rankOpportunities({ ...base, guide: [ev({ verification: 'unconfirmed' })] });
  const u = unconfirmed.find((o) => o.kind === 'event')!;
  assert.ok(u.score < ranked[0].score);
  assert.ok(u.reasons.some((r) => r.includes('Unconfirmed')));

  // From Disney Springs, the let-out (ends ~11:20 PM) is ~30 min away: still reachable, with ETA.
  const springs = { lat: 28.3709, lng: -81.5194 };
  const withPos = rankOpportunities({ ...base, guide: [ev({})], position: springs }).find((o) => o.kind === 'event')!;
  assert.ok(withPos.etaMin! > 15);
  assert.ok(etaMinutes(springs, { lat: 28.5392, lng: -81.3839 }) < 60);
});

test('convention windows only appear on convention dates', () => {
  const now = at('2026-11-20T21:00:00Z'); // 4 PM ET Friday
  const base = { now, guide: [], shifts: [], costPerMile: 0.2, position: null };
  const none = rankOpportunities({ ...base, conventionDates: new Set<string>() });
  assert.ok(!none.some((o) => o.id.startsWith('rec-occc')));
  const conv = conventionDatesOf(null, [ev({ type: 'Convention', date: '2026-11-20' })]);
  const some = rankOpportunities({ ...base, conventionDates: conv });
  assert.ok(some.some((o) => o.id.startsWith('rec-occc-close')));
});
