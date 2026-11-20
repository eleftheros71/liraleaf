import { lazy, Suspense, useState } from 'react';
import { CalendarDays, ClipboardList, Compass, Map, Settings as Gear, Wallet, WifiOff, type LucideIcon } from 'lucide-react';
import { AppProvider, useApp } from './state';
import type { GuideEvent, Tab } from './types';
import { Notice } from './components/ui';
import { NowScreen } from './screens/NowScreen';
import { WeekScreen } from './screens/WeekScreen';
import { LogScreen } from './screens/LogScreen';
import { PlaybookScreen } from './screens/PlaybookScreen';
import { EventForm, EventSheet } from './components/EventSheets';
import { ShiftForm, type ShiftDraft } from './components/ShiftForm';
import { SettingsSheet } from './components/SettingsSheet';

// Charts are the heaviest dependency; load them only when Earnings opens.
const EarningsScreen = lazy(() => import('./screens/EarningsScreen').then((m) => ({ default: m.EarningsScreen })));

const TABS: { id: Tab; label: string; icon: LucideIcon; title: string }[] = [
  { id: 'now', label: 'Now', icon: Compass, title: 'Where to go' },
  { id: 'week', label: 'Week', icon: CalendarDays, title: 'This week' },
  { id: 'log', label: 'Log', icon: ClipboardList, title: 'Shift log' },
  { id: 'earnings', label: 'Earnings', icon: Wallet, title: 'Earnings' },
  { id: 'playbook', label: 'Playbook', icon: Map, title: 'Playbook' },
];

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { online, toast, setToast, activeShift, now } = useApp();
  const [tab, setTab] = useState<Tab>('now');
  const [openEvent, setOpenEvent] = useState<GuideEvent | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const [draft, setDraft] = useState<ShiftDraft | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const current = TABS.find((t) => t.id === tab)!;

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-2xl h-14 px-4 flex items-center gap-3">
          <h1 className="text-lg font-bold flex-1 truncate">{current.title}</h1>
          {!online && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-warn">
              <WifiOff className="h-4 w-4" /> Offline
            </span>
          )}
          {tab !== 'now' && <span className="num text-sm text-ink-3">{now.timeLabel}</span>}
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings" className="h-10 w-10 grid place-items-center rounded-full hover:bg-surface-2 text-ink-2">
            <Gear className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4 pb-32">
        {toast && (
          <div className="mb-4">
            <Notice tone={toast.tone} onClose={() => setToast(null)}>
              {toast.text}
            </Notice>
          </div>
        )}
        {tab === 'now' && (
          <NowScreen
            onEndShift={() => activeShift && setDraft({ start: activeShift.start, end: new Date().toISOString(), fromTimer: true })}
            onNavigate={go}
            onOpenEvent={setOpenEvent}
          />
        )}
        {tab === 'week' && <WeekScreen onOpenEvent={setOpenEvent} onAddEvent={() => setAddingEvent(true)} />}
        {tab === 'log' && <LogScreen onDraft={setDraft} />}
        {tab === 'earnings' && (
          <Suspense fallback={<p className="text-sm text-ink-3">Loading…</p>}>
            <EarningsScreen onOpenSettings={() => setSettingsOpen(true)} />
          </Suspense>
        )}
        {tab === 'playbook' && <PlaybookScreen />}
      </main>

      <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl grid grid-cols-5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? 'text-ink' : 'text-ink-3'}`}
              >
                <Icon className={`h-6 w-6 ${active ? 'text-go' : ''}`} strokeWidth={active ? 2.4 : 2} />
                {label}
                {id === 'log' && activeShift && <span className="absolute top-2.5 right-[calc(50%-18px)] h-2 w-2 rounded-full bg-bad" aria-label="Shift in progress" />}
              </button>
            );
          })}
        </div>
      </nav>

      <EventSheet event={openEvent} onClose={() => setOpenEvent(null)} />
      <EventForm open={addingEvent} onClose={() => setAddingEvent(false)} defaultDate={now.date} />
      <ShiftForm draft={draft} onClose={() => setDraft(null)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
