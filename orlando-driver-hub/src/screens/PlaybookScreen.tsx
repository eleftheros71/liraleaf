import { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { useApp } from '../state';
import { MCO_RULES, PARKS, TERMINALS } from '../data/ops';
import { HUBS, type StagingHub } from '../data/hubs';
import { formatClock, formatDuration, toMinutes, windowState, type WindowState } from '../lib/time';
import { etaMinutes } from '../lib/opportunities';
import { Card, NavButtons, SectionTitle, Segmented } from '../components/ui';

type View = 'airport' | 'parks' | 'spots' | 'rules';

function StatusText({ st }: { st: WindowState }) {
  const cls = st.kind === 'active' ? 'text-go' : st.kind === 'upcoming' ? 'text-warn' : 'text-ink-3';
  return <span className={`num text-sm font-semibold ${cls}`}>{st.kind === 'scheduled' ? 'Later' : st.label}</span>;
}

export function PlaybookScreen() {
  const [view, setView] = useState<View>('airport');
  return (
    <div>
      <Segmented<View>
        full
        value={view}
        onChange={setView}
        options={[
          { value: 'airport', label: 'Airport' },
          { value: 'parks', label: 'Parks' },
          { value: 'spots', label: 'Spots' },
          { value: 'rules', label: 'MCO rules' },
        ]}
      />
      {view === 'airport' && <Airport />}
      {view === 'parks' && <Parks />}
      {view === 'spots' && <Spots />}
      {view === 'rules' && <Rules />}
      <p className="text-xs text-ink-3 px-1 mt-6 leading-relaxed">
        Typical patterns, not live data. Flight schedules, park hours and airport signage change by season. Confirm before a long deadhead.
      </p>
    </div>
  );
}

function Airport() {
  const { now } = useApp();
  return (
    <>
      {TERMINALS.map((t) => (
        <div key={t.id}>
          <SectionTitle>{t.name}</SectionTitle>
          <Card className="divide-y divide-line">
            {t.banks.map((b) => {
              const st = windowState(b.start, b.end, now.minutes);
              return (
                <details key={b.id} className="group" open={st.kind === 'active'}>
                  <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{b.label}</div>
                      <div className="num text-sm text-ink-3">
                        {formatClock(b.start)}–{formatClock(b.end)} · {b.bay} · wait {b.queueWait}
                      </div>
                    </div>
                    <StatusText st={st} />
                    <ChevronDown className="h-4 w-4 text-ink-3 transition group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4 space-y-2 text-sm text-ink-2">
                    <p>{b.bayDetail}. {b.note}</p>
                    <p className="text-ink-3">Carriers: {b.carriers}</p>
                  </div>
                </details>
              );
            })}
          </Card>
          <div className="mt-2">
            <NavButtons lat={t.lat} lng={t.lng} />
          </div>
        </div>
      ))}
    </>
  );
}

function Parks() {
  const { now } = useApp();
  return (
    <>
      {PARKS.map((p) => {
        const end = toMinutes(p.close) + 60;
        const endStr = `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
        const st = windowState(p.show, endStr, now.minutes);
        return (
          <div key={p.id}>
            <SectionTitle right={<StatusText st={st} />}>{p.park}</SectionTitle>
            <Card className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-2 py-2">
                  <div className="text-xs text-ink-3">Show</div>
                  <div className="num font-bold">{formatClock(p.show)}</div>
                </div>
                <div className="rounded-xl bg-surface-2 py-2">
                  <div className="text-xs text-ink-3">Close</div>
                  <div className="num font-bold">{formatClock(p.close)}</div>
                </div>
                <div className="rounded-xl bg-surface-2 py-2">
                  <div className="text-xs text-ink-3">Surge</div>
                  <div className="num font-bold">{p.surge}</div>
                </div>
              </div>
              <p className="text-sm text-ink-2">{p.staging}</p>
              <ul className="space-y-1.5">
                {p.tips.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-2">
                    <span className="text-go">•</span>
                    {t}
                  </li>
                ))}
              </ul>
              <NavButtons lat={p.lat} lng={p.lng} />
            </Card>
          </div>
        );
      })}
    </>
  );
}

function Spots() {
  const { geo, settings, updateSettings } = useApp();
  const list: (StagingHub & { eta: number | null })[] = HUBS.map((h) => ({ ...h, eta: geo.position ? etaMinutes(geo.position, h) : null }));
  if (geo.position) list.sort((a, b) => (a.eta ?? 0) - (b.eta ?? 0));
  return (
    <>
      {!settings.useLocation && (
        <button onClick={() => updateSettings({ useLocation: true })} className="mt-3 w-full rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-2 text-left">
          Turn on location to sort spots by drive time.
        </button>
      )}
      <Card className="mt-3 divide-y divide-line">
        {list.map((h) => (
          <details key={h.id} className="group">
            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{h.name}</div>
                <div className="num text-sm text-ink-3">{h.primeHours}</div>
              </div>
              {h.eta != null && <span className="num text-sm text-ink-2">{formatDuration(h.eta)}</span>}
              <ChevronDown className="h-4 w-4 text-ink-3 transition group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 space-y-3 text-sm">
              <p><span className="text-ink-3">Pickup: </span>{h.pickupPin}</p>
              <p><span className="text-ink-3">Tip: </span>{h.stagingTip}</p>
              <p className="num"><span className="text-ink-3">Typical surge: </span>{h.surge}</p>
              <NavButtons lat={h.lat} lng={h.lng} />
            </div>
          </details>
        ))}
      </Card>
    </>
  );
}

function Rules() {
  return (
    <Card className="mt-3 divide-y divide-line">
      <div className="flex items-center gap-2 px-4 py-3 font-semibold">
        <ShieldCheck className="h-5 w-5 text-go" /> MCO ground transportation
      </div>
      {MCO_RULES.map((r, i) => (
        <div key={i} className="flex gap-3 px-4 py-3 text-sm text-ink-2">
          <span className="num text-ink-3 w-4 shrink-0">{i + 1}</span>
          {r}
        </div>
      ))}
    </Card>
  );
}
