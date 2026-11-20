import { useState } from 'react';
import { Calculator, Check, MapPin, RotateCcw, Route } from 'lucide-react';
import { SHIFTS, VEHICLE_TIERS, shiftEarnings, type VehicleTierId } from '../data/ops';
import { hubById } from '../data/hubs';
import { KEYS, useLocalState } from '../lib/storage';
import { formatClock, windowState, type EtNow } from '../lib/time';
import { Button, Label, PageTitle, Panel, PanelHeader, Segmented, WindowText } from '../components/ui';

interface Costs {
  fuel: number;
  tier: VehicleTierId;
}

const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function ShiftsPage({ now, onGoToHub }: { now: EtNow; onGoToHub: (hubId: string) => void }) {
  const [shiftId, setShiftId] = useState(SHIFTS[0].id);
  const [costs, setCosts] = useLocalState<Costs>(KEYS.costs, { fuel: 38, tier: 'x' });
  const [checks, setChecks] = useLocalState<Record<string, number[]>>(KEYS.checklist, {});
  const [fuelText, setFuelText] = useState(String(costs.fuel));

  const shift = SHIFTS.find((s) => s.id === shiftId) ?? SHIFTS[0];
  const tier = VEHICLE_TIERS.find((t) => t.id === costs.tier) ?? VEHICLE_TIERS[0];
  const done = checks[shift.id] ?? [];

  const toggleStep = (i: number) =>
    setChecks((c) => {
      const cur = c[shift.id] ?? [];
      return { ...c, [shift.id]: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] };
    });

  return (
    <>
      <PageTitle title="Shift Planner & Net Margin" subtitle="Pick a blueprint, set your vehicle tier and costs, then work the legs in order." />

      <div className="grid gap-px bg-slate-800/90 border border-slate-800/90 rounded-xl overflow-hidden md:grid-cols-3 mb-5">
        {SHIFTS.map((s) => {
          const e = shiftEarnings(s, tier.mult, costs.fuel);
          const active = s.id === shift.id;
          return (
            <button
              key={s.id}
              onClick={() => setShiftId(s.id)}
              aria-pressed={active}
              className={`text-left p-4 transition-colors ${active ? 'bg-slate-800' : 'bg-panel hover:bg-slate-800/50'}`}
            >
              <div className={`text-sm font-semibold ${active ? 'text-amber' : 'text-slate-100'}`}>{s.name}</div>
              <div className="text-xs text-slate-500 mt-1">{s.tagline}</div>
              <div className="num text-xs text-slate-400 mt-2">
                {s.hours}h · net <span className="text-emerald font-semibold">{money(e.net)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel>
          <PanelHeader title="Net margin calculator" icon={<Calculator className="h-4 w-4 text-amber" />} />
          <div className="p-4 border-b border-slate-800/90 space-y-4">
            <div>
              <Label>Vehicle tier</Label>
              <div className="mt-2 overflow-x-auto">
                <Segmented<VehicleTierId>
                  value={costs.tier}
                  onChange={(t) => setCosts((c) => ({ ...c, tier: t }))}
                  options={VEHICLE_TIERS.map((t) => ({ value: t.id, label: `${t.label} ${t.mult.toFixed(2)}x` }))}
                />
              </div>
            </div>
            <div>
              <label htmlFor="fuel">
                <Label>Fuel & tolls ($)</Label>
              </label>
              <input
                id="fuel"
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={fuelText}
                onChange={(e) => {
                  setFuelText(e.target.value);
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0) setCosts((c) => ({ ...c, fuel: n }));
                }}
                className="num mt-2 w-40 bg-canvas border border-slate-800/90 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber"
              />
            </div>
          </div>
          {(() => {
            const e = shiftEarnings(shift, tier.mult, costs.fuel);
            return (
              <div className="grid grid-cols-3 divide-x divide-slate-800/90">
                <div className="p-4">
                  <Label>Est. gross</Label>
                  <div className="num text-xl font-semibold text-slate-100 mt-1">{money(e.gross)}</div>
                  <div className="num text-[11px] text-slate-500 mt-0.5">
                    {money(shift.baseGross)} × {tier.mult.toFixed(2)}
                  </div>
                </div>
                <div className="p-4">
                  <Label>Net after costs</Label>
                  <div className={`num text-xl font-semibold mt-1 ${e.net >= 0 ? 'text-emerald' : 'text-crimson'}`}>{money(e.net)}</div>
                  <div className="num text-[11px] text-slate-500 mt-0.5">− {money(costs.fuel)} fuel & tolls</div>
                </div>
                <div className="p-4">
                  <Label>Avg net /hr</Label>
                  <div className={`num text-xl font-semibold mt-1 ${e.perHour >= 0 ? 'text-emerald' : 'text-crimson'}`}>${e.perHour.toFixed(2)}</div>
                  <div className="num text-[11px] text-slate-500 mt-0.5">over {shift.hours}h</div>
                </div>
              </div>
            );
          })()}
          <p className="px-4 py-3 border-t border-slate-800/90 text-xs text-slate-500">
            Baselines are UberX estimates for a typical week. Big events push these up. Slow weeks pull them down.
          </p>
        </Panel>

        <Panel>
          <PanelHeader
            title="Shift legs"
            icon={<Route className="h-4 w-4 text-amber" />}
            right={
              <div className="flex items-center gap-3">
                <span className="num text-xs text-slate-500">
                  {done.length}/{shift.steps.length} done
                </span>
                {done.length > 0 && (
                  <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setChecks((c) => ({ ...c, [shift.id]: [] }))}>
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                )}
              </div>
            }
          />
          <ol className="divide-y divide-slate-800/90">
            {shift.steps.map((s, i) => {
              const st = windowState(s.start, s.end, now.minutes);
              const isDone = done.includes(i);
              const live = st.kind === 'active';
              const hub = hubById(s.hubId);
              return (
                <li key={i} className={`flex gap-3 p-4 ${live ? 'bg-amber/10' : ''}`} aria-current={live ? 'step' : undefined}>
                  <button
                    onClick={() => toggleStep(i)}
                    role="checkbox"
                    aria-checked={isDone}
                    aria-label={`Mark ${s.title} done`}
                    className={`mt-0.5 grid place-items-center h-5 w-5 shrink-0 rounded border ${isDone ? 'bg-emerald border-emerald text-slate-950' : 'border-slate-600 hover:border-slate-400'}`}
                  >
                    {isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className={`text-sm font-semibold ${isDone ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{s.title}</div>
                      <span className="num text-xs text-slate-400">
                        {formatClock(s.start)} – {formatClock(s.end)}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      {live ? <span className="text-xs font-semibold text-amber">Current leg · </span> : null}
                      <WindowText state={st} />
                    </div>
                    <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{s.detail}</p>
                    {hub && (
                      <button onClick={() => onGoToHub(hub.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber hover:underline">
                        <MapPin className="h-3.5 w-3.5" /> {hub.name}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>
    </>
  );
}
