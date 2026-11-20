import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActiveShift, Corridor, GuideBundle, GuideEvent, Settings, Shift } from './types';
import { DEFAULT_SETTINGS } from './types';
import { KEYS, useLocalState } from './lib/storage';
import { useEtClock, useGeolocation, useOnline, type GeoState } from './lib/hooks';
import type { EtNow } from './lib/time';
import { costPerMile } from './lib/earnings';
import { weekStartOf } from './lib/earnings';
import {
  firebaseEnabled,
  loadCloudGuide,
  pushShift,
  saveCloudGuide,
  signInWithGoogle,
  signOut,
  syncShifts,
  watchAuth,
  type User,
} from './lib/firebase';

interface AppState {
  now: EtNow;
  online: boolean;
  geo: GeoState;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  cpm: number;

  bundle: GuideBundle | null;
  generating: boolean;
  generate: (weekOf: string, corridors: Corridor[], opts?: { fresh?: boolean }) => Promise<void>;
  manualEvents: GuideEvent[];
  saveManualEvent: (e: GuideEvent) => void;
  deleteManualEvent: (id: string) => void;
  allEvents: GuideEvent[];
  saved: string[];
  toggleSaved: (id: string) => void;

  shifts: Shift[]; // excludes deleted
  saveShift: (s: Shift) => void;
  deleteShift: (id: string) => void;
  activeShift: ActiveShift | null;
  startShift: () => void;
  cancelActiveShift: () => void;
  replaceAllShifts: (all: Shift[]) => void;

  user: User | null;
  firebaseEnabled: boolean;
  syncState: 'off' | 'syncing' | 'synced' | 'error';
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;

  toast: { tone: 'info' | 'bad' | 'warn'; text: string } | null;
  setToast: (t: AppState['toast']) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const now = useEtClock();
  const online = useOnline();
  const [settings, setSettings] = useLocalState<Settings>(KEYS.settings, DEFAULT_SETTINGS);
  const mergedSettings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings]);
  const geo = useGeolocation(mergedSettings.useLocation);
  const [bundle, setBundle] = useLocalState<GuideBundle | null>(KEYS.guide, null);
  const [manualEvents, setManualEvents] = useLocalState<GuideEvent[]>(KEYS.manualEvents, []);
  const [saved, setSaved] = useLocalState<string[]>(KEYS.saved, []);
  const [allShifts, setAllShifts] = useLocalState<Shift[]>(KEYS.shifts, []);
  const [activeShift, setActiveShift] = useLocalState<ActiveShift | null>(KEYS.activeShift, null);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [syncState, setSyncState] = useState<AppState['syncState']>('off');
  const [toast, setToast] = useState<AppState['toast']>(null);
  const shiftsRef = useRef(allShifts);
  shiftsRef.current = allShifts;

  // Apply theme.
  useEffect(() => {
    document.documentElement.dataset.theme = mergedSettings.theme;
  }, [mergedSettings.theme]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...DEFAULT_SETTINGS, ...s, ...patch })), [setSettings]);

  // Auth + shift sync.
  useEffect(
    () =>
      watchAuth(async (u) => {
        setUser(u);
        if (!u) {
          setSyncState('off');
          return;
        }
        setSyncState('syncing');
        try {
          const merged = await syncShifts(u.uid, shiftsRef.current);
          setAllShifts(merged);
          setSyncState('synced');
        } catch (err) {
          console.warn('Shift sync failed:', err);
          setSyncState('error');
        }
      }),
    [setAllShifts],
  );

  const push = useCallback(
    (s: Shift) => {
      if (!user) return;
      pushShift(user.uid, s)
        .then(() => setSyncState('synced'))
        .catch((err) => {
          console.warn('Shift push failed:', err);
          setSyncState('error');
        });
    },
    [user],
  );

  const saveShift = useCallback(
    (s: Shift) => {
      const next = { ...s, updatedAt: Date.now() };
      setAllShifts((all) => [...all.filter((x) => x.id !== s.id), next]);
      push(next);
    },
    [push, setAllShifts],
  );

  const deleteShift = useCallback(
    (id: string) => {
      const existing = shiftsRef.current.find((s) => s.id === id);
      if (!existing) return;
      const tomb = { ...existing, deleted: true, updatedAt: Date.now() };
      setAllShifts((all) => all.map((s) => (s.id === id ? tomb : s)));
      push(tomb);
    },
    [push, setAllShifts],
  );

  const replaceAllShifts = useCallback(
    (incoming: Shift[]) => {
      setAllShifts(incoming);
      if (user) syncShifts(user.uid, incoming).catch(() => setSyncState('error'));
    },
    [setAllShifts, user],
  );

  const generate = useCallback<AppState['generate']>(
    async (weekOf, corridors, opts = {}) => {
      setGenerating(true);
      setToast(null);
      try {
        if (user && !opts.fresh) {
          const hit = await loadCloudGuide(user.uid, weekOf).catch(() => null);
          if (hit) {
            setBundle(hit);
            setToast({ tone: 'info', text: 'Loaded your saved research for this week. Turn on "Fresh search" to redo it.' });
            return;
          }
        }
        if (!opts.fresh && bundle?.guide.weekOf === weekOf) {
          setToast({ tone: 'info', text: 'You already have research for this week. Turn on "Fresh search" to redo it.' });
          return;
        }
        const res = await fetch('/api/strategy/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(mergedSettings.accessCode ? { 'x-access-code': mergedSettings.accessCode } : {}) },
          body: JSON.stringify({ weekOf, corridors }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        const b = data as GuideBundle;
        setBundle(b);
        if (user) saveCloudGuide(user.uid, b).catch((err) => console.warn('Cloud guide save failed:', err));
        const counts = b.guide.events.reduce((m, e) => ({ ...m, [e.verification]: (m[e.verification] ?? 0) + 1 }), {} as Record<string, number>);
        setToast({
          tone: 'info',
          text: `Found ${b.guide.events.length} events: ${counts.confirmed ?? 0} confirmed, ${counts.sourced ?? 0} with a source, ${counts.unconfirmed ?? 0} unconfirmed.`,
        });
      } catch (err) {
        setToast({
          tone: 'bad',
          text: !navigator.onLine ? 'No signal. Your last week of research is still here, and everything else works offline.' : err instanceof Error ? err.message : 'Something went wrong.',
        });
      } finally {
        setGenerating(false);
      }
    },
    [bundle, mergedSettings.accessCode, setBundle, user],
  );

  const shifts = useMemo(() => allShifts.filter((s) => !s.deleted).sort((a, b) => b.start.localeCompare(a.start)), [allShifts]);

  const allEvents = useMemo(() => {
    const week = bundle?.guide.weekOf;
    const manual = week ? manualEvents.filter((e) => e.date >= week) : manualEvents;
    return [...(bundle?.guide.events ?? []), ...manual].sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '99').localeCompare(b.startTime || '99'));
  }, [bundle, manualEvents]);

  // Drop manual events older than last week so the list stays clean.
  useEffect(() => {
    const cutoff = weekStartOf(now.date);
    if (manualEvents.some((e) => e.date < cutoff)) setManualEvents((m) => m.filter((e) => e.date >= cutoff));
  }, [now.date, manualEvents, setManualEvents]);

  const value: AppState = {
    now,
    online,
    geo,
    settings: mergedSettings,
    updateSettings,
    cpm: costPerMile(mergedSettings),
    bundle,
    generating,
    generate,
    manualEvents,
    saveManualEvent: (e) => setManualEvents((m) => [...m.filter((x) => x.id !== e.id), e]),
    deleteManualEvent: (id) => setManualEvents((m) => m.filter((x) => x.id !== id)),
    allEvents,
    saved,
    toggleSaved: (id) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    shifts,
    saveShift,
    deleteShift,
    activeShift,
    startShift: () => setActiveShift({ start: new Date().toISOString() }),
    cancelActiveShift: () => setActiveShift(null),
    replaceAllShifts,
    user,
    firebaseEnabled,
    syncState,
    signIn: async () => {
      try {
        await signInWithGoogle();
      } catch (err) {
        setToast({ tone: 'bad', text: err instanceof Error ? err.message : 'Sign-in failed.' });
      }
    },
    signOut,
    toast,
    setToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
