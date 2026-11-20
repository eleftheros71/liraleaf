import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, ExternalLink, Globe, NotebookPen, Search, Star, Target, TrendingUp, Zap } from 'lucide-react';
import { CORRIDORS, EVENT_TYPES, type Corridor, type EventType, type GuideBundle, type GuideEvent } from '../types';
import { KEYS, useLocalState } from '../lib/storage';
import { isWeekend, prettyDate, type EtNow } from '../lib/time';
import { Button, Label, PageTitle, Panel, PanelHeader, RatingText, Segmented, Select, SeverityText, TierText } from '../components/ui';

type Scope = 'all' | 'today' | 'weekend' | 'saved';

export function EventsPage({
  bundle,
  now,
  bookmarks,
  onToggleBookmark,
  onOpenEvent,
  onGoSetup,
}: {
  bundle: GuideBundle | null;
  now: EtNow;
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onOpenEvent: (e: GuideEvent) => void;
  onGoSetup: () => void;
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [corridor, setCorridor] = useState<Corridor | 'all'>('all');
  const [type, setType] = useState<EventType | 'all'>('all');
  const [notes, setNotes] = useLocalState<string>(KEYS.notes, '');

  const guide = bundle?.guide;
  const eventsById = useMemo(() => new Map(guide?.events.map((e) => [e.id, e]) ?? []), [guide]);

  const filtered = useMemo(() => {
    if (!guide) return [];
    const q = query.trim().toLowerCase();
    return guide.events.filter((e) => {
      if (q && !`${e.name} ${e.venue}`.toLowerCase().includes(q)) return false;
      if (scope === 'today' && e.date !== now.date) return false;
      if (scope === 'weekend' && !isWeekend(e.date)) return false;
      if (scope === 'saved' && !bookmarks.includes(e.id)) return false;
      if (corridor !== 'all' && e.corridor !== corridor) return false;
      if (type !== 'all' && e.type !== type) return false;
      return true;
    });
  }, [guide, query, scope, corridor, type, bookmarks, now.date]);

  return (
    <>
      <PageTitle
        title="Events & Forecast"
        subtitle={guide ? `Week of ${prettyDate(guide.weekOf, { weekday: true })} · ${guide.corridors.join(', ')}` : 'No weekly guide loaded yet.'}
      />

      {guide ? (
        <div className="space-y-5">
          {/* Global strategy */}
          <Panel>
            <PanelHeader title="Global strategy" icon={<Target className="h-4 w-4 text-amber" />} />
            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/90">
              <StrategyCell icon={<TrendingUp className="h-4 w-4 text-emerald" />} label="Top earning day" value={guide.globalStrategy.topEarningDay} reason={guide.globalStrategy.topEarningDayReason} />
              <StrategyCell icon={<Target className="h-4 w-4 text-amber" />} label="Primary focus" value={guide.globalStrategy.primaryFocus} reason={guide.globalStrategy.primaryFocusReason} />
              <StrategyCell icon={<Zap className="h-4 w-4 text-crimson" />} label="Surge alert" value={guide.globalStrategy.surgeAlert} reason={guide.globalStrategy.surgeAlertReason} />
            </div>
          </Panel>

          {/* 7-day table */}
          <Panel>
            <PanelHeader title="7-day earnings potential" icon={<CalendarRange className="h-4 w-4 text-amber" />} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800/90">
                    <th className="px-4 py-2.5 font-semibold">Day</th>
                    <th className="px-4 py-2.5 font-semibold">Demand</th>
                    <th className="px-4 py-2.5 font-semibold">Surge window</th>
                    <th className="px-4 py-2.5 font-semibold min-w-[260px]">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/90">
                  {guide.days.map((d) => {
                    const isToday = d.date === now.date;
                    return (
                      <tr key={d.date} className={isToday ? 'bg-slate-800/30' : ''}>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <div className="font-semibold text-slate-100">
                            {d.dayName}
                            {isToday && <span className="ml-2 text-xs font-semibold text-emerald">Today</span>}
                          </div>
                          <div className="num text-xs text-slate-500">{prettyDate(d.date)}</div>
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <RatingText rating={d.demandRating} />
                          <div className="num text-xs text-slate-500">{d.demandScore}/100</div>
                        </td>
                        <td className="px-4 py-3 align-top num text-slate-200 whitespace-nowrap">{d.surgeWindow}</td>
                        <td className="px-4 py-3 align-top">
                          {d.eventIds.length === 0 ? (
                            <span className="text-slate-500">{d.summary || 'No major events.'}</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {d.eventIds.map((id) => {
                                const e = eventsById.get(id);
                                if (!e) return null;
                                return (
                                  <button key={id} onClick={() => onOpenEvent(e)} className="text-left text-amber hover:text-amber-300 hover:underline font-medium">
                                    {e.name}
                                    <span className="text-slate-500 font-normal"> · {e.venue}</span>
                                  </button>
                                );
                              })}
                              {d.summary && <span className="text-xs text-slate-500 mt-0.5">{d.summary}</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Events grid */}
          <Panel>
            <PanelHeader
              title="High-demand events"
              icon={<Star className="h-4 w-4 text-amber" />}
              right={<span className="num text-xs text-slate-500">{filtered.length} of {guide.events.length}</span>}
            />
            <div className="p-4 flex flex-wrap gap-2 items-center border-b border-slate-800/90">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search event or venue"
                  aria-label="Search event or venue"
                  className="w-full bg-canvas border border-slate-800/90 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber"
                />
              </div>
              <Segmented<Scope>
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'all', label: 'All Week' },
                  { value: 'today', label: 'Today' },
                  { value: 'weekend', label: 'Weekend' },
                  { value: 'saved', label: 'Saved' },
                ]}
              />
              <Select<Corridor | 'all'>
                label="Corridor"
                value={corridor}
                onChange={setCorridor}
                options={[{ value: 'all', label: 'All corridors' }, ...CORRIDORS.map((c) => ({ value: c, label: c }))]}
              />
              <Select<EventType | 'all'>
                label="Event type"
                value={type}
                onChange={setType}
                options={[{ value: 'all', label: 'All types' }, ...EVENT_TYPES.map((t) => ({ value: t, label: t }))]}
              />
            </div>
            {filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                {scope === 'saved' ? 'No saved events yet. Tap the star on any event to keep it here.' : 'No events match these filters.'}
              </p>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 overflow-hidden rounded-b-xl">
                {filtered.map((e) => {
                  const saved = bookmarks.includes(e.id);
                  return (
                    <article key={e.id} className="bg-panel p-4 flex flex-col gap-3 shadow-[1px_0_0_0_#1e293b,0_1px_0_0_#1e293b]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="num text-xs text-slate-400">
                            {prettyDate(e.date, { weekday: true })} · {e.startTime}
                          </div>
                          <button onClick={() => onOpenEvent(e)} className="text-left font-semibold text-white hover:text-amber mt-0.5">
                            {e.name}
                          </button>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {e.venue} · {e.corridor} · {e.type}
                          </div>
                        </div>
                        <button
                          onClick={() => onToggleBookmark(e.id)}
                          aria-pressed={saved}
                          aria-label={saved ? `Remove ${e.name} from saved` : `Save ${e.name}`}
                          className={`p-1.5 rounded-md hover:bg-slate-800 ${saved ? 'text-amber' : 'text-slate-500'}`}
                        >
                          <Star className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <TierText tier={e.surgeTier} />
                      <div>
                        <Label>Pickup times</Label>
                        <p className="text-sm text-slate-200 mt-1 leading-relaxed">{e.pickupTimes || '—'}</p>
                      </div>
                      <div>
                        <Label>Dispatch strategy</Label>
                        <p className="text-sm text-slate-300 mt-1 leading-relaxed">{e.dispatchStrategy || '—'}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      ) : (
        <Panel className="p-10 text-center">
          <CalendarRange className="h-8 w-8 text-slate-600 mx-auto" />
          <h2 className="text-lg font-semibold text-white mt-3">No weekly guide loaded</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Generate a strategy from Setup to see the 7-day forecast and the event grid. Your notes below still save on this device.
          </p>
          <Button variant="primary" className="mt-5" onClick={onGoSetup}>
            <Zap className="h-4 w-4" /> Go to Setup
          </Button>
        </Panel>
      )}

      {/* Driver utilities */}
      <div className="grid gap-5 lg:grid-cols-3 mt-5">
        <Panel>
          <PanelHeader title="Personal shift notes" icon={<NotebookPen className="h-4 w-4 text-amber" />} right={<span className="text-xs text-slate-500">Auto-saved locally</span>} />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Gate codes, quiet spots, rider patterns, things to try next shift…"
            aria-label="Personal shift notes"
            className="w-full min-h-[220px] bg-transparent p-4 text-sm text-slate-200 placeholder:text-slate-600 resize-y focus:outline-none"
          />
        </Panel>

        <Panel>
          <PanelHeader title="Verified search sources" icon={<Globe className="h-4 w-4 text-amber" />} right={<span className="num text-xs text-slate-500">{bundle?.sources.length ?? 0}</span>} />
          {bundle && bundle.sources.length > 0 ? (
            <ul className="divide-y divide-slate-800/90 max-h-[260px] overflow-y-auto">
              {bundle.sources.map((s) => (
                <li key={s.uri}>
                  <a href={s.uri} target="_blank" rel="noreferrer" className="flex items-start gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/40">
                    <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-500" />
                    <span className="break-words">{s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-slate-500">Sources from the grounded web search show up here.</p>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Corridor advisories & alerts" icon={<AlertTriangle className="h-4 w-4 text-amber" />} />
          {guide && guide.advisories.length > 0 ? (
            <ul className="divide-y divide-slate-800/90 max-h-[260px] overflow-y-auto">
              {guide.advisories.map((a, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">{a.title}</span>
                    <SeverityText severity={a.severity} />
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{a.corridor}</div>
                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">{a.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-slate-500">Road closures, weather and airport alerts appear here after you load a guide.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

function StrategyCell({ icon, label, value, reason }: { icon: ReactNode; label: string; value: string; reason: string }) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2">
        {icon}
        <Label>{label}</Label>
      </div>
      <div className="text-base font-semibold text-white mt-2">{value}</div>
      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{reason}</p>
    </div>
  );
}
