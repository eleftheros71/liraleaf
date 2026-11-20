import { useMemo } from 'react';
import { ArrowRight, CalendarSearch, Clock, LocateFixed, MapPin, Play, Square, TrendingUp } from 'lucide-react';
import { useApp } from '../state';
import { absClock, absStatus, conventionDatesOf, rankOpportunities, type Opportunity } from '../lib/opportunities';
import { addDays, formatDuration, prettyDate } from '../lib/time';
import { weekStartOf } from '../lib/earnings';
import { googleMapsUrl } from '../data/hubs';
import { Button, Card, NavButtons, Notice, SectionTitle } from '../components/ui';
import type { GuideEvent, Tab } from '../types';

function strength(score: number): { label: string; cls: string } {
  if (score >= 75) return { label: 'Strong', cls: 'text-go' };
  if (score >= 58) return { label: 'Good', cls: 'text-ink' };
  return { label: 'Fair', cls: 'text-ink-3' };
}

export function NowScreen({ onEndShift, onNavigate, onOpenEvent }: { onEndShift: () => void; onNavigate: (t: Tab) => void; onOpenEvent: (e: GuideEvent) => void }) {
  const { now, allEvents, bundle, shifts, cpm, geo, settings, updateSettings, activeShift, startShift } = useApp();

  const ranked = useMemo(
    () =>
      rankOpportunities({
        now,
        guide: allEvents,
        conventionDates: conventionDatesOf(null, allEvents),
        shifts,
        costPerMile: cpm,
        position: geo.position,
      }),
    [now, allEvents, shifts, cpm, geo.position],
  );

  const soon = ranked.filter((o) => o.startAbs - now.minutes <= 180);
  const top = soon[0] ?? null;
  const alts = soon.slice(1, 4);
  const later = ranked
    .filter((o) => o.startAbs - now.minutes > 180)
    .sort((a, b) => a.startAbs - b.startAbs)
    .slice(0, 6);

  const thisWeek = weekStartOf(now.date);
  const hasCurrentResearch = bundle && bundle.guide.weekOf <= now.date && now.date < addDays(bundle.guide.weekOf, 7);

  const elapsed = activeShift ? Math.max(0, Math.round((Date.now() - Date.parse(activeShift.start)) / 60000)) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-1 pt-1">
        <div>
          <div className="num text-4xl font-extrabold tracking-tight">{now.timeLabel}</div>
          <div className="text-sm text-ink-3 mt-0.5">{prettyDate(now.date, { weekday: true })} · Orlando time</div>
        </div>
        {activeShift ? (
          <Button variant="danger" onClick={onEndShift} aria-label="End shift">
            <Square className="h-4 w-4 fill-current" /> End · <span className="num">{formatDuration(elapsed)}</span>
          </Button>
        ) : (
          <Button variant="plain" onClick={startShift}>
            <Play className="h-4 w-4 fill-current" /> Start shift
          </Button>
        )}
      </div>

      {top ? <TopPick o={top} nowMin={now.minutes} onOpenEvent={onOpenEvent} /> : (
        <Card className="p-6">
          <h2 className="font-bold text-lg">Quiet stretch</h2>
          <p className="text-sm text-ink-3 mt-1">Nothing strong in the next 3 hours. A good time for a break, gas, or a car wash.</p>
        </Card>
      )}

      {!settings.useLocation && (
        <button onClick={() => updateSettings({ useLocation: true })} className="w-full flex items-center gap-3 rounded-xl border border-dashed border-line px-4 py-3 text-left text-sm text-ink-2 hover:text-ink">
          <LocateFixed className="h-4 w-4 shrink-0 text-go" />
          Use my location to account for drive time and skip spots I can't reach in time.
        </button>
      )}
      {geo.error && <Notice tone="warn">{geo.error} Recommendations ignore drive time for now.</Notice>}

      {!hasCurrentResearch && (
        <button onClick={() => onNavigate('week')} className="w-full flex items-center gap-3 rounded-xl bg-surface border border-line px-4 py-3 text-left text-sm">
          <CalendarSearch className="h-5 w-5 shrink-0 text-warn" />
          <span className="flex-1 text-ink-2">
            No event research for the week of {prettyDate(thisWeek)}. Picks use airport and park patterns only.
          </span>
          <ArrowRight className="h-4 w-4 text-ink-3" />
        </button>
      )}

      {alts.length > 0 && (
        <>
          <SectionTitle>Also good soon</SectionTitle>
          <Card className="divide-y divide-line">
            {alts.map((o) => (
              <OppRow key={o.id} o={o} nowMin={now.minutes} onOpenEvent={onOpenEvent} />
            ))}
          </Card>
        </>
      )}

      {later.length > 0 && (
        <>
          <SectionTitle>Later today</SectionTitle>
          <Card className="divide-y divide-line">
            {later.map((o) => (
              <OppRow key={o.id} o={o} nowMin={now.minutes} compact onOpenEvent={onOpenEvent} />
            ))}
          </Card>
        </>
      )}

      <p className="text-xs text-ink-3 px-1 pt-2 leading-relaxed">
        Picks combine typical airport and park patterns, this week's events, and your own logged earnings once you have a few shifts per area.
        Times are estimates. Watch the app's surge map too.
      </p>
    </div>
  );
}

function TopPick({ o, nowMin, onOpenEvent }: { o: Opportunity; nowMin: number; onOpenEvent: (e: GuideEvent) => void }) {
  const st = absStatus(o.startAbs, o.endAbs, nowMin);
  const s = strength(o.score);
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-go">
            <TrendingUp className="h-4 w-4" /> Go here
          </span>
          <span className={`text-xs font-semibold ${s.cls}`}>{s.label} pick</span>
        </div>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight">{o.hub.name}</h2>
        {o.event ? (
          <button onClick={() => onOpenEvent(o.event!)} className="mt-1 text-[15px] text-ink-2 text-left underline decoration-line underline-offset-4">
            {o.title}
          </button>
        ) : (
          <div className="mt-1 text-[15px] text-ink-2">{o.title}</div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 px-3.5 py-3">
            <div className="text-xs text-ink-3">{st.active ? 'Happening' : 'Starts'}</div>
            <div className={`num font-bold text-lg ${st.active ? 'text-go' : ''}`}>{st.active ? st.text.replace('Now · ', '') : absClock(o.startAbs)}</div>
            {!st.active && <div className="num text-xs text-ink-3">{st.text.toLowerCase()}</div>}
            {st.active && <div className="text-xs text-ink-3">left in window</div>}
          </div>
          <div className="rounded-xl bg-surface-2 px-3.5 py-3">
            <div className="text-xs text-ink-3">{o.leaveByAbs != null ? 'Leave by' : o.etaMin != null ? 'Drive' : 'Window'}</div>
            <div className="num font-bold text-lg">
              {o.leaveByAbs != null ? absClock(o.leaveByAbs) : o.etaMin != null ? formatDuration(o.etaMin) : `${absClock(o.startAbs)}–${absClock(o.endAbs)}`}
            </div>
            <div className="num text-xs text-ink-3">{o.etaMin != null ? `~${formatDuration(o.etaMin)} away` : 'turn on location for drive time'}</div>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {o.reasons.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-2 leading-snug">
              <span className="text-go mt-0.5">•</span>
              {r}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-start gap-2 text-sm text-ink-3">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{o.hub.pickupPin}</span>
        </div>
      </div>
      <div className="p-4 mt-3 border-t border-line">
        <NavButtons lat={o.hub.lat} lng={o.hub.lng} size="lg" />
      </div>
    </Card>
  );
}

function OppRow({ o, nowMin, compact, onOpenEvent }: { o: Opportunity; nowMin: number; compact?: boolean; onOpenEvent: (e: GuideEvent) => void }) {
  const st = absStatus(o.startAbs, o.endAbs, nowMin);
  const s = strength(o.score);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button className="flex-1 min-w-0 text-left" onClick={() => o.event && onOpenEvent(o.event)} disabled={!o.event}>
        <div className="font-semibold truncate">{o.hub.short} · <span className="font-normal text-ink-2">{o.title}</span></div>
        <div className="num text-sm text-ink-3 mt-0.5 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {st.active ? <span className="text-go font-semibold">{st.text}</span> : `${absClock(o.startAbs)} · ${st.text.toLowerCase()}`}
          {!compact && <span className={`ml-1 ${s.cls}`}>· {s.label}</span>}
          {o.etaMin != null && <span>· {formatDuration(o.etaMin)} drive</span>}
        </div>
      </button>
      <a
        href={googleMapsUrl(o.hub.lat, o.hub.lng)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Navigate to ${o.hub.name}`}
        className="h-11 w-11 shrink-0 grid place-items-center rounded-xl bg-surface-2 text-ink"
      >
        <ArrowRight className="h-5 w-5" />
      </a>
    </div>
  );
}
