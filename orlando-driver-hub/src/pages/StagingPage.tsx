import { useEffect, useMemo, useState } from 'react';
import { Crosshair, MapPinned, Navigation } from 'lucide-react';
import type { GuideEvent, WeeklyGuide } from '../types';
import { HUBS, googleMapsUrl, hubById, wazeUrl, type StagingHub } from '../data/hubs';
import { minutesUntilStart, windowState, type EtNow, type WindowState } from '../lib/time';
import { Label, NavLinks, PageTitle, Panel, PanelHeader, Segmented, TierText, WindowText } from '../components/ui';

type Area = 'all' | StagingHub['area'];

const ROADS: { id: string; label: string; d: string; labelAt: [number, number]; width: number; color: string }[] = [
  { id: 'i4', label: 'I-4', d: 'M 960 30 L 760 120 L 600 230 L 470 340 L 330 470 L 200 580 L 60 690', labelAt: [870, 66], width: 7, color: '#334155' },
  { id: 'idrive', label: 'I-Drive / Universal Blvd', d: 'M 470 220 C 455 300, 450 360, 430 430 S 380 520, 350 560', labelAt: [360, 330], width: 4, color: '#475569' },
  { id: 'sr528', label: 'FL-528 Beachline', d: 'M 420 450 C 520 455, 600 470, 700 465 S 880 470, 990 480', labelAt: [600, 492], width: 5, color: '#3f4b5f' },
  { id: 'sr417', label: 'FL-417 GreeneWay', d: 'M 980 120 C 950 220, 960 380, 930 520 S 760 660, 560 670 S 260 660, 120 600', labelAt: [935, 300], width: 5, color: '#3f4b5f' },
];

function hubState(h: StagingHub, nowMin: number): WindowState {
  const sorted = [...h.primeWindows].sort((a, b) => minutesUntilStart(a.start, a.end, nowMin) - minutesUntilStart(b.start, b.end, nowMin));
  const w = sorted[0];
  return windowState(w.start, w.end, nowMin);
}

function queueLabel(state: WindowState): string {
  if (state.kind === 'active') return 'Prime now · heavy rider queue';
  if (state.kind === 'upcoming' && state.minutesUntil <= 60) return 'Building · move in soon';
  return 'Off-peak · light queue';
}

export function StagingPage({
  guide,
  now,
  focusHub,
  onFocusHub,
  onOpenEvent,
}: {
  guide: WeeklyGuide | null;
  now: EtNow;
  focusHub: string | null;
  onFocusHub: (id: string | null) => void;
  onOpenEvent: (e: GuideEvent) => void;
}) {
  const [selected, setSelected] = useState<string>(focusHub ?? 'mco-ab');
  const [area, setArea] = useState<Area>('all');
  const [pinScope, setPinScope] = useState<'week' | 'today'>('week');

  useEffect(() => {
    if (focusHub) {
      setSelected(focusHub);
      onFocusHub(null);
    }
  }, [focusHub, onFocusHub]);

  const pinEvents = useMemo(
    () => (guide?.events ?? []).filter((e) => pinScope === 'week' || e.date === now.date),
    [guide, pinScope, now.date],
  );

  /** Radial, non-overlapping pin positions around each hub. */
  const pins = useMemo(() => {
    const byHub = new Map<string, GuideEvent[]>();
    for (const e of pinEvents) byHub.set(e.stagingHubId, [...(byHub.get(e.stagingHubId) ?? []), e]);
    const out: { e: GuideEvent; x: number; y: number; hx: number; hy: number }[] = [];
    for (const [hubId, list] of byHub) {
      const hub = hubById(hubId);
      if (!hub) continue;
      // Pins fan out over the upper arc so the hub label below stays clear.
      const perRing = 5;
      list.forEach((e, i) => {
        const ring = Math.floor(i / perRing);
        const inRing = Math.min(perRing, list.length - ring * perRing);
        const slot = i % perRing;
        const angle = inRing === 1 ? -Math.PI / 2 : -Math.PI + (Math.PI * (slot + 0.5)) / inRing;
        const r = 30 + ring * 20;
        out.push({ e, x: hub.x + Math.cos(angle) * r, y: hub.y + Math.sin(angle) * r, hx: hub.x, hy: hub.y });
      });
    }
    return out;
  }, [pinEvents]);

  const hub = hubById(selected) ?? HUBS[0];
  const hubEvents = (guide?.events ?? []).filter((e) => e.stagingHubId === hub.id);
  const state = hubState(hub, now.minutes);
  const directory = HUBS.filter((h) => area === 'all' || h.area === area);

  const pinColor = (e: GuideEvent) =>
    e.surgeTier === 'Peak' || e.surgeTier === 'Extreme' ? '#EF4444' : e.surgeTier === 'High' ? '#F59E0B' : '#94A3B8';

  return (
    <>
      <PageTitle title="Staging & GPS Map" subtitle="Schematic corridor map. Tap a hub to inspect it, or an event pin to open its strategy." />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Orlando corridor map"
            icon={<MapPinned className="h-4 w-4 text-amber" />}
            right={
              guide ? (
                <Segmented
                  value={pinScope}
                  onChange={setPinScope}
                  options={[
                    { value: 'week', label: 'Week pins' },
                    { value: 'today', label: 'Today' },
                  ]}
                />
              ) : (
                <span className="text-xs text-slate-500">Load a guide to see event pins</span>
              )
            }
          />
          <svg viewBox="0 0 1000 700" className="w-full h-auto block bg-canvas" role="img" aria-label="Schematic map of Orlando staging hubs and highways">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#111827" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="1000" height="700" fill="url(#grid)" />
            {/* Area labels */}
            {[
              ['DOWNTOWN', 700, 60],
              ['UNIVERSAL / I-DRIVE', 470, 200],
              ['WALT DISNEY WORLD', 170, 470],
              ['MCO AIRPORT', 860, 400],
            ].map(([t, x, y]) => (
              <text key={t as string} x={x as number} y={y as number} fill="#334155" fontSize="13" fontWeight="700" letterSpacing="2" textAnchor="middle">
                {t}
              </text>
            ))}
            {ROADS.map((r) => (
              <g key={r.id}>
                <path d={r.d} fill="none" stroke={r.color} strokeWidth={r.width} strokeLinecap="round" />
                <text x={r.labelAt[0]} y={r.labelAt[1]} fill="#64748B" textAnchor={r.id === 'sr417' ? 'end' : 'start'} fontSize="12" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                  {r.label}
                </text>
              </g>
            ))}
            {/* Pin leader lines */}
            {pins.map((p) => (
              <line key={`l-${p.e.id}`} x1={p.hx} y1={p.hy} x2={p.x} y2={p.y} stroke="#1F2937" strokeWidth="1.5" />
            ))}
            {/* Hubs */}
            {HUBS.map((h) => {
              const active = h.id === hub.id;
              const prime = hubState(h, now.minutes).kind === 'active';
              return (
                <g
                  key={h.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${h.name} hub`}
                  onClick={() => setSelected(h.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelected(h.id)}
                  className="cursor-pointer focus:outline-none"
                >
                  <circle cx={h.x} cy={h.y} r="22" fill="transparent" />
                  <circle cx={h.x} cy={h.y} r={active ? 11 : 8} fill={prime ? '#10B981' : '#F59E0B'} stroke={active ? '#FFFFFF' : '#0B0F17'} strokeWidth={active ? 3 : 2} />
                  <text x={h.x} y={h.y + 26} fill={active ? '#FFFFFF' : '#CBD5E1'} fontSize="13" fontWeight={active ? 700 : 600} textAnchor="middle">
                    {h.short}
                  </text>
                </g>
              );
            })}
            {/* Event pins */}
            {pins.map((p) => (
              <g key={`p-${p.e.id}`} role="button" tabIndex={0} aria-label={`Event: ${p.e.name}`} onClick={() => onOpenEvent(p.e)} onKeyDown={(k) => k.key === 'Enter' && onOpenEvent(p.e)} className="cursor-pointer">
                <title>{`${p.e.name} · ${p.e.surgeTier} surge`}</title>
                <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
                <rect x={p.x - 5} y={p.y - 5} width="10" height="10" rx="2" transform={`rotate(45 ${p.x} ${p.y})`} fill={pinColor(p.e)} stroke="#0B0F17" strokeWidth="2" />
              </g>
            ))}
          </svg>
          <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 py-3 border-t border-slate-800/90 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald" /> Hub in prime window</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber" /> Hub off-peak</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-crimson" /> Peak/Extreme event</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-amber" /> High event</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-slate-400" /> Moderate event</span>
          </div>
        </Panel>

        {/* Hub inspector */}
        <Panel>
          <PanelHeader title="Hub inspector" icon={<Crosshair className="h-4 w-4 text-amber" />} right={<WindowText state={state} />} />
          <div className="p-5 border-b border-slate-800/90">
            <div className="text-xs text-slate-500">{hub.corridor} corridor</div>
            <h2 className="text-lg font-bold text-white mt-0.5">{hub.name}</h2>
            <div className="text-sm text-slate-300 mt-1">{queueLabel(state)}</div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-800/90 border-b border-slate-800/90">
            <div className="p-4">
              <Label>Surge multiplier</Label>
              <div className="num text-lg font-semibold text-emerald mt-1">{hub.surge}</div>
            </div>
            <div className="p-4">
              <Label>Prime hours</Label>
              <div className="num text-xs text-slate-200 mt-1.5 leading-relaxed">{hub.primeHours}</div>
            </div>
          </div>
          <div className="divide-y divide-slate-800/90">
            <div className="p-4">
              <Label>Exact pickup pin</Label>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">{hub.pickupPin}</p>
            </div>
            <div className="p-4">
              <Label>Staging tip</Label>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">{hub.stagingTip}</p>
            </div>
            <div className="p-4">
              <NavLinks maps={googleMapsUrl(hub.lat, hub.lng)} waze={wazeUrl(hub.lat, hub.lng)} />
            </div>
            {hubEvents.length > 0 && (
              <div className="p-4">
                <Label>This week at this hub</Label>
                <ul className="mt-2 space-y-2">
                  {hubEvents.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3">
                      <button onClick={() => onOpenEvent(e)} className="text-left text-sm text-amber hover:underline">
                        {e.name}
                      </button>
                      <TierText tier={e.surgeTier} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Directory */}
      <Panel className="mt-5">
        <PanelHeader
          title="Tactical staging directory"
          icon={<Navigation className="h-4 w-4 text-amber" />}
          right={
            <div className="overflow-x-auto max-w-[60vw]">
              <Segmented<Area>
                value={area}
                onChange={setArea}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'MCO', label: 'MCO' },
                  { value: 'OCCC', label: 'OCCC' },
                  { value: 'Universal', label: 'Universal' },
                  { value: 'Disney', label: 'Disney' },
                  { value: 'Downtown', label: 'Downtown' },
                ]}
              />
            </div>
          }
        />
        <div className="grid md:grid-cols-2 xl:grid-cols-3 overflow-hidden rounded-b-xl">
          {directory.map((h) => {
            const st = hubState(h, now.minutes);
            return (
              <article key={h.id} className="bg-panel p-4 flex flex-col gap-3 shadow-[1px_0_0_0_#1e293b,0_1px_0_0_#1e293b]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button onClick={() => setSelected(h.id)} className="text-left font-semibold text-white hover:text-amber">
                      {h.name}
                    </button>
                    <div className="text-xs text-slate-500 mt-0.5">{queueLabel(st)}</div>
                  </div>
                  <span className="num text-sm font-semibold text-emerald whitespace-nowrap">{h.surge}</span>
                </div>
                <WindowText state={st} />
                <div>
                  <Label>Prime hours</Label>
                  <p className="num text-xs text-slate-300 mt-1">{h.primeHours}</p>
                </div>
                <div>
                  <Label>Pickup pin</Label>
                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">{h.pickupPin}</p>
                </div>
                <div className="mt-auto pt-1">
                  <NavLinks maps={googleMapsUrl(h.lat, h.lng)} waze={wazeUrl(h.lat, h.lng)} />
                </div>
              </article>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
