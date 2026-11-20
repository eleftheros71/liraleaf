import type { ReactNode } from 'react';
import { BarChart3, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeeklyGuide } from '../types';
import { corridorIntensity, demandByDay, eventMix } from '../lib/analytics';
import { Button, PageTitle, Panel, PanelHeader } from '../components/ui';

const AXIS = { stroke: '#64748B', fontSize: 12, tickLine: false, axisLine: false } as const;
const GRID = '#1F2937';

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-slate-700 bg-canvas px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-100">{label}</div>
      <div className="num text-slate-300 mt-0.5">
        {p.value} {unit}
        {typeof p.payload.rating === 'string' ? ` · ${p.payload.rating}` : ''}
        {typeof p.payload.events === 'number' ? ` · ${p.payload.events} events` : ''}
      </div>
    </div>
  );
}

function ChartPanel({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <Panel>
      <PanelHeader title={title} icon={<BarChart3 className="h-4 w-4 text-amber" />} />
      <div className="px-2 pt-4 h-72">{children}</div>
      <p className="px-4 py-3 border-t border-slate-800/90 text-xs text-slate-500">{caption}</p>
    </Panel>
  );
}

export function AnalyticsPage({ guide, onGoSetup }: { guide: WeeklyGuide | null; onGoSetup: () => void }) {
  if (!guide) {
    return (
      <>
        <PageTitle title="Surge Analytics" />
        <Panel className="p-10 text-center">
          <BarChart3 className="h-8 w-8 text-slate-600 mx-auto" />
          <h2 className="text-lg font-semibold text-white mt-3">Nothing to chart yet</h2>
          <p className="text-sm text-slate-400 mt-1">Load a weekly guide to see demand by day, corridor intensity and the event mix.</p>
          <Button variant="primary" className="mt-5" onClick={onGoSetup}>
            <Zap className="h-4 w-4" /> Go to Setup
          </Button>
        </Panel>
      </>
    );
  }

  const days = demandByDay(guide);
  const corridors = corridorIntensity(guide);
  const mix = eventMix(guide);
  const cursor = { fill: 'rgba(148,163,184,0.08)' };

  return (
    <>
      <PageTitle title="Surge Analytics" subtitle={`${guide.events.length} events across ${guide.corridors.length} corridors`} />
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Weekly demand score by day" caption="0–100 demand index from the grounded forecast.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="day" {...AXIS} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} {...AXIS} />
              <Tooltip cursor={cursor} content={<ChartTooltip unit="/ 100" />} />
              <Bar dataKey="score" name="Demand score" fill="#F59E0B" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Weighted corridor intensity" caption="Sum of event surge tiers per corridor: Moderate 1 · High 2 · Peak 3 · Extreme 4.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={corridors} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="corridor" {...AXIS} interval={0} tickFormatter={(v: string) => (v === 'Sports/Concerts' ? 'Sports' : v)} />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip cursor={cursor} content={<ChartTooltip unit="pts" />} />
              <Bar dataKey="intensity" name="Intensity" fill="#10B981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <Panel className="mt-5">
        <PanelHeader title="Weekly event mix" icon={<BarChart3 className="h-4 w-4 text-amber" />} />
        {mix.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No events in this guide.</p>
        ) : (
          <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:divide-x divide-slate-800/90">
            <div className="px-2 pt-4" style={{ height: Math.max(180, mix.length * 44 + 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mix} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 8 }} barCategoryGap="30%">
                  <CartesianGrid horizontal={false} stroke={GRID} />
                  <XAxis type="number" allowDecimals={false} {...AXIS} />
                  <YAxis type="category" dataKey="type" width={90} {...AXIS} />
                  <Tooltip cursor={cursor} content={<ChartTooltip unit="events" />} />
                  <Bar dataKey="count" name="Events" fill="#F59E0B" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-sm self-start">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800/90">
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Events</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/90">
                {mix.map((m) => (
                  <tr key={m.type}>
                    <td className="px-4 py-2.5 text-slate-200">{m.type}</td>
                    <td className="px-4 py-2.5 num text-right text-slate-100">{m.count}</td>
                    <td className="px-4 py-2.5 num text-right text-slate-400">{Math.round((m.count / guide.events.length) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
