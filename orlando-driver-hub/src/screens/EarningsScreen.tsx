import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Lightbulb, Wallet } from 'lucide-react';
import { useApp } from '../state';
import { AREAS, type Shift } from '../types';
import { MIN_SAMPLE, bestBucket, byArea, byDaypart, byWeekday, money, shiftDateEt, totals, weekStartOf, type Bucket } from '../lib/earnings';
import { addDays, prettyDate } from '../lib/time';
import { Card, EmptyState, SectionTitle, Segmented } from '../components/ui';

type Period = 'week' | '4w' | 'all';

export function EarningsScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { shifts, cpm, now, settings } = useApp();
  const [period, setPeriod] = useState<Period>('week');
  const thisWeek = weekStartOf(now.date);

  const inPeriod = useMemo(() => {
    const from = period === 'week' ? thisWeek : period === '4w' ? addDays(thisWeek, -21) : '0000-00-00';
    return shifts.filter((s) => shiftDateEt(s) >= from);
  }, [shifts, period, thisWeek]);

  const t = totals(inPeriod, cpm);
  const weekTotals = totals(shifts.filter((s) => shiftDateEt(s) >= thisWeek), cpm);
  const goalPct = settings.weeklyGoal > 0 ? Math.min(100, (weekTotals.net / settings.weeklyGoal) * 100) : 0;

  // Insights come from all history: one week is too little to compare days.
  const weekday = byWeekday(shifts, cpm);
  const daypart = byDaypart(shifts, cpm);
  const area = byArea(shifts, cpm, AREAS);
  const insights = buildInsights(shifts, weekday, daypart, area, totals(shifts, cpm).netPerHour);

  const weekly = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const start = addDays(thisWeek, -7 * (7 - i));
      const end = addDays(start, 7);
      const tt = totals(shifts.filter((s) => { const d = shiftDateEt(s); return d >= start && d < end; }), cpm);
      return { label: prettyDate(start), net: Math.round(tt.net), hours: tt.hours };
    });
  }, [shifts, cpm, thisWeek]);

  if (shifts.length === 0) {
    return (
      <EmptyState icon={<Wallet className="h-5 w-5" />} title="Log a shift to see your real numbers">
        Net per hour after gas, wear and tolls, by day, time and area. Start a shift from the Now or Log tab.
      </EmptyState>
    );
  }

  return (
    <div>
      <Segmented<Period> full value={period} onChange={setPeriod} options={[{ value: 'week', label: 'This week' }, { value: '4w', label: '4 weeks' }, { value: 'all', label: 'All time' }]} />

      <Card className="mt-3 p-5">
        <div className="text-sm text-ink-3">Net after costs</div>
        <div className={`num text-5xl font-extrabold tracking-tight mt-1 ${t.net >= 0 ? 'text-go' : 'text-bad'}`}>{money(t.net)}</div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <Stat label="Net / hour" value={money(t.netPerHour, true)} />
          <Stat label="Hours" value={t.hours.toFixed(1)} />
          <Stat label="Net / mile" value={money(t.netPerMile, true)} />
        </div>
        <div className="mt-5 pt-4 border-t border-line grid grid-cols-2 gap-y-1.5 text-sm">
          <span className="text-ink-3">Earnings + tips</span>
          <span className="num text-right">{money(t.gross)}</span>
          <span className="text-ink-3">Tolls + vehicle cost</span>
          <span className="num text-right">{money(-t.costs)}</span>
          <span className="text-ink-3">Trips · miles</span>
          <span className="num text-right">{t.trips} · {Math.round(t.miles)} mi</span>
        </div>
        <button onClick={onOpenSettings} className="mt-3 text-xs text-ink-3 underline underline-offset-2">
          Vehicle cost: {money(cpm, true)}/mile ({settings.mpg} mpg, ${settings.gasPrice.toFixed(2)}/gal, {money(settings.maintenancePerMile, true)} wear). Change
        </button>
      </Card>

      {settings.weeklyGoal > 0 && (
        <Card className="mt-3 p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">Weekly goal</span>
            <span className="num text-ink-2">{money(weekTotals.net)} of {money(settings.weeklyGoal)}</span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={Math.round(goalPct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-go" style={{ width: `${Math.max(0, goalPct)}%` }} />
          </div>
          {weekTotals.netPerHour > 0 && weekTotals.net < settings.weeklyGoal && (
            <p className="text-xs text-ink-3 mt-2 num">About {((settings.weeklyGoal - weekTotals.net) / weekTotals.netPerHour).toFixed(1)} more hours at this week's pace.</p>
          )}
        </Card>
      )}

      <SectionTitle>What your history says</SectionTitle>
      <Card className="divide-y divide-line">
        {insights.map((i, n) => (
          <div key={n} className="flex gap-3 px-4 py-3 text-sm">
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-warn" />
            <span className="text-ink-2 leading-relaxed">{i}</span>
          </div>
        ))}
      </Card>

      <SectionTitle>Net per hour by day</SectionTitle>
      <Card className="p-3 pt-4">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekday.map((b) => ({ day: b.key, rate: Math.round(b.netPerHour), shifts: b.shifts }))} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Tip fmt={(p) => `$${p.rate}/hr · ${p.shifts} shift${p.shifts === 1 ? '' : 's'}`} />} />
              <Bar dataKey="rate" fill="var(--go)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-ink-3 px-1">All logged shifts, by the day they started.</p>
      </Card>

      <SectionTitle>Net by week</SectionTitle>
      <Card className="p-3 pt-4">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} interval={1} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Tip fmt={(p) => `${money(p.net)} net · ${Number(p.hours).toFixed(1)}h`} />} />
              <Bar dataKey="net" fill="var(--go)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>By time of day</SectionTitle>
      <BucketTable buckets={daypart} />
      <SectionTitle>By area</SectionTitle>
      <BucketTable buckets={area} note="A shift counts toward every area you tagged on it." />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-3">{label}</div>
      <div className="num text-lg font-bold">{value}</div>
    </div>
  );
}

function Tip({ active, payload, label, fmt }: { active?: boolean; payload?: { payload: Record<string, number> }[]; label?: string; fmt: (p: Record<string, number>) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold">{label}</div>
      <div className="num text-ink-2">{fmt(payload[0].payload)}</div>
    </div>
  );
}

function BucketTable({ buckets, note }: { buckets: Bucket[]; note?: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.netPerHour));
  return (
    <Card className="divide-y divide-line">
      {buckets.map((b) => (
        <div key={b.key} className="px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{b.key}</span>
            <span className="num text-sm">
              {b.shifts > 0 ? (
                <>
                  <span className="font-semibold">{money(b.netPerHour)}/hr</span>
                  <span className="text-ink-3"> · {b.shifts} shift{b.shifts === 1 ? '' : 's'}</span>
                </>
              ) : (
                <span className="text-ink-3">No data</span>
              )}
            </span>
          </div>
          {b.shifts > 0 && (
            <div className="mt-1.5 h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div className={`h-full rounded-full ${b.shifts >= MIN_SAMPLE ? 'bg-go' : 'bg-ink-3'}`} style={{ width: `${Math.max(2, (b.netPerHour / max) * 100)}%` }} />
            </div>
          )}
        </div>
      ))}
      {note && <p className="px-4 py-2.5 text-xs text-ink-3">{note} Gray bars have fewer than {MIN_SAMPLE} shifts.</p>}
    </Card>
  );
}

function buildInsights(shifts: Shift[], weekday: Bucket[], daypart: Bucket[], area: Bucket[], overall: number): string[] {
  const out: string[] = [];
  if (shifts.length < 4) {
    out.push(`You have ${shifts.length} shift${shifts.length === 1 ? '' : 's'} logged. Comparisons get useful after about 8–10 shifts across different days and times.`);
  }
  const bd = bestBucket(weekday);
  if (bd) out.push(`Best day so far: ${bd.key}, at ${money(bd.netPerHour)}/hr net over ${bd.shifts} shifts.`);
  const bp = bestBucket(daypart);
  if (bp) out.push(`Best time of day: ${bp.key.toLowerCase()}, at ${money(bp.netPerHour)}/hr net.`);
  const ba = bestBucket(area);
  if (ba) out.push(`Best area: ${ba.key}, at ${money(ba.netPerHour)}/hr net. The Now screen weighs this in once an area has 3+ shifts at a given time of day.`);
  const weak = daypart.filter((b) => b.shifts >= MIN_SAMPLE && overall > 0 && b.netPerHour < overall * 0.75);
  for (const w of weak) out.push(`${w.key} shifts run ${Math.round((1 - w.netPerHour / overall) * 100)}% below your average. Worth trimming or moving those hours.`);
  const untagged = shifts.filter((s) => s.areas.length === 0).length;
  if (untagged > 0) out.push(`${untagged} shift${untagged === 1 ? ' has' : 's have'} no area tagged. Tag them so area comparisons stay accurate.`);
  if (out.length === 0) out.push('Keep logging. Patterns show up once you have at least 2 shifts in each day and time slot.');
  return out;
}
