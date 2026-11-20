import { useMemo, useState } from 'react';
import { CalendarPlus, ChevronDown, ExternalLink, Loader2, Search, Star, TriangleAlert } from 'lucide-react';
import { useApp } from '../state';
import { CORRIDORS, type DemandRating, type GuideEvent } from '../types';
import { addDays, formatClock, prettyDate, weekDates } from '../lib/time';
import { weekStartOf } from '../lib/earnings';
import { Button, Card, Chip, EmptyState, Field, SectionTitle, VerifyBadge, inputCls } from '../components/ui';

const CORRIDOR_HINT: Record<string, string> = {
  OCCC: 'Convention Center',
  Disney: 'Parks & Springs',
  Universal: 'Universal & Epic',
  'Sports/Concerts': 'Arenas & stadiums',
  Other: 'MCO & Downtown',
};

function ratingCls(r: DemandRating): string {
  return r === 'Peak' || r === 'Extreme' ? 'text-bad' : r === 'High' ? 'text-warn' : 'text-ink-3';
}

export function WeekScreen({ onOpenEvent, onAddEvent }: { onOpenEvent: (e: GuideEvent) => void; onAddEvent: () => void }) {
  const { now, bundle, generating, generate, allEvents, saved, toggleSaved, settings, updateSettings } = useApp();
  const [weekOf, setWeekOf] = useState(() => bundle?.guide.weekOf ?? weekStartOf(now.date));
  const [fresh, setFresh] = useState(false);
  const [day, setDay] = useState<string>('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [hideUnconfirmed, setHideUnconfirmed] = useState(false);
  const [query, setQuery] = useState('');

  const guide = bundle?.guide;
  const dates = guide ? weekDates(guide.weekOf) : [];

  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEvents.filter(
      (e) =>
        (!guide || dates.includes(e.date) || e.verification === 'manual') &&
        (day === 'all' || e.date === day) &&
        (!savedOnly || saved.includes(e.id)) &&
        (!hideUnconfirmed || e.verification !== 'unconfirmed') &&
        (!q || `${e.name} ${e.venue}`.toLowerCase().includes(q)),
    );
  }, [allEvents, guide, dates, day, savedOnly, saved, hideUnconfirmed, query]);

  const toggleCorridor = (c: (typeof CORRIDORS)[number]) =>
    updateSettings({ corridors: settings.corridors.includes(c) ? settings.corridors.filter((x) => x !== c) : [...settings.corridors, c] });

  return (
    <div>
      <Card className="p-4 space-y-4">
        <div>
          <Field label="Week starting">
            <input type="date" value={weekOf} onChange={(e) => e.target.value && setWeekOf(e.target.value)} className={inputCls} />
          </Field>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => setWeekOf(weekStartOf(now.date))}>This week</Button>
            <Button size="sm" onClick={() => setWeekOf(addDays(weekStartOf(now.date), 7))}>Next week</Button>
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-ink-2 mb-2">Focus on</div>
          <div className="flex flex-wrap gap-2">
            {CORRIDORS.map((c) => (
              <Chip key={c} on={settings.corridors.includes(c)} onClick={() => toggleCorridor(c)}>
                {c} <span className="font-normal text-ink-3 hidden sm:inline">· {CORRIDOR_HINT[c]}</span>
              </Chip>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm">
            <span className="font-medium">Fresh search</span>
            <span className="block text-ink-3">Redo the research even if this week is already saved.</span>
          </span>
          <input type="checkbox" checked={fresh} onChange={(e) => setFresh(e.target.checked)} className="h-6 w-6 accent-[var(--go)]" />
        </label>
        <Button variant="go" size="lg" className="w-full" disabled={generating || settings.corridors.length === 0} onClick={() => generate(weekOf, settings.corridors, { fresh })}>
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          {generating ? 'Searching and checking sources…' : `Research week of ${prettyDate(weekOf)}`}
        </Button>
        {generating && <p className="text-xs text-ink-3 text-center -mt-2">Usually 30–90 seconds. Each event's source page gets checked before it shows up.</p>}
      </Card>

      {guide ? (
        <>
          <SectionTitle>
            Week of {prettyDate(guide.weekOf)}
          </SectionTitle>
          {guide.headline && <p className="px-1 text-[15px] leading-relaxed text-ink">{guide.headline}</p>}

          <div className="mt-3 -mx-4 px-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Day">
            <DayChip active={day === 'all'} onClick={() => setDay('all')} top="All" bottom={`${allEvents.filter((e) => dates.includes(e.date)).length} events`} />
            {guide.days.map((d) => (
              <DayChip
                key={d.date}
                active={day === d.date}
                onClick={() => setDay(d.date)}
                top={`${d.dayName.slice(0, 3)} ${Number(d.date.slice(8))}`}
                bottom={d.demandRating}
                bottomCls={ratingCls(d.demandRating)}
                today={d.date === now.date}
              />
            ))}
          </div>

          {day !== 'all' && (() => {
            const d = guide.days.find((x) => x.date === day);
            return d && (d.bestWindow || d.summary) ? (
              <Card className="mt-3 px-4 py-3">
                {d.bestWindow && <div className="text-sm"><span className="text-ink-3">Best window </span><span className="num font-semibold">{d.bestWindow}</span></div>}
                {d.summary && <p className="text-sm text-ink-2 mt-1">{d.summary}</p>}
              </Card>
            ) : null;
          })()}
        </>
      ) : (
        <div className="mt-4">
          <EmptyState icon={<Search className="h-5 w-5" />} title="No research yet">
            Research a week to see confirmed events. You can also add events you already know about.
          </EmptyState>
        </div>
      )}

      <SectionTitle right={<Button size="sm" variant="ghost" onClick={onAddEvent}><CalendarPlus className="h-4 w-4" /> Add event</Button>}>Events</SectionTitle>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search event or venue" aria-label="Search events" className={`${inputCls} h-10 pl-9`} />
        </div>
        <Chip on={savedOnly} onClick={() => setSavedOnly(!savedOnly)}>Saved</Chip>
        <Chip on={hideUnconfirmed} onClick={() => setHideUnconfirmed(!hideUnconfirmed)}>Hide unconfirmed</Chip>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-ink-3 px-1 py-4">No events match.</p>
      ) : (
        <Card className="divide-y divide-line">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-2 px-4 py-3">
              <button className="flex-1 min-w-0 text-left" onClick={() => onOpenEvent(e)}>
                <div className="num text-xs text-ink-3">
                  {prettyDate(e.date, { weekday: true })}
                  {e.startTime && ` · ${formatClock(e.startTime)}`}
                  {e.endTime && ` – ${formatClock(e.endTime)}`}
                </div>
                <div className="font-semibold mt-0.5 leading-snug">{e.name}</div>
                <div className="text-sm text-ink-3 truncate">{e.venue}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <VerifyBadge v={e.verification} />
                  <span className={`text-xs font-semibold ${e.surgeTier === 'Peak' || e.surgeTier === 'Extreme' ? 'text-bad' : e.surgeTier === 'High' ? 'text-warn' : 'text-ink-3'}`}>
                    {e.surgeTier} demand
                  </span>
                </div>
              </button>
              <button
                onClick={() => toggleSaved(e.id)}
                aria-pressed={saved.includes(e.id)}
                aria-label={saved.includes(e.id) ? `Unsave ${e.name}` : `Save ${e.name}`}
                className={`h-11 w-11 grid place-items-center rounded-xl ${saved.includes(e.id) ? 'text-warn' : 'text-ink-3'}`}
              >
                <Star className={`h-5 w-5 ${saved.includes(e.id) ? 'fill-current' : ''}`} />
              </button>
            </div>
          ))}
        </Card>
      )}

      {guide && guide.advisories.length > 0 && (
        <>
          <SectionTitle>Heads up</SectionTitle>
          <Card className="divide-y divide-line">
            {guide.advisories.map((a, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-2 font-semibold">
                  {a.severity !== 'Info' && <TriangleAlert className={`h-4 w-4 ${a.severity === 'Critical' ? 'text-bad' : 'text-warn'}`} />}
                  {a.title}
                  {a.severity !== 'Info' && <span className={`text-xs ${a.severity === 'Critical' ? 'text-bad' : 'text-warn'}`}>{a.severity}</span>}
                </div>
                <p className="text-sm text-ink-2 mt-0.5">{a.detail}</p>
              </div>
            ))}
          </Card>
        </>
      )}

      {bundle && (
        <details className="mt-6 group">
          <summary className="flex items-center gap-2 px-1 text-sm text-ink-3 cursor-pointer list-none">
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            {bundle.sources.length} search sources · researched {new Date(bundle.guide.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} with {bundle.guide.model}
          </summary>
          <Card className="mt-2 divide-y divide-line">
            {bundle.sources.map((s) => (
              <a key={s.uri} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-2 hover:text-ink">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{s.title}</span>
              </a>
            ))}
          </Card>
        </details>
      )}
    </div>
  );
}

function DayChip({ active, onClick, top, bottom, bottomCls = 'text-ink-3', today }: { active: boolean; onClick: () => void; top: string; bottom: string; bottomCls?: string; today?: boolean }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 min-w-[76px] rounded-xl border px-3 py-2 text-left transition ${active ? 'border-go bg-go-soft' : 'border-line bg-surface'}`}
    >
      <div className="text-sm font-semibold">
        {top}
        {today && <span className="ml-1 text-go">•</span>}
      </div>
      <div className={`text-xs font-semibold ${bottomCls}`}>{bottom}</div>
    </button>
  );
}
