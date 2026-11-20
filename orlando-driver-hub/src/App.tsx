import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { User } from 'firebase/auth';
import type { Corridor, GuideBundle, GuideEvent, Page } from './types';
import { CORRIDORS } from './types';
import { KEYS, readLocal, useLocalState, writeLocal } from './lib/storage';
import { useEtClock } from './lib/useEtClock';
import { prettyDate } from './lib/time';
import {
  firebaseEnabled,
  loadCachedGuide,
  saveCachedGuide,
  saveProfile,
  signInWithGoogle,
  signOut,
  watchAuth,
} from './lib/firebase';
import { TopBar } from './components/TopBar';
import { Sidebar, BottomNav } from './components/Nav';
import { EventModal } from './components/EventModal';
import { SetupPage } from './pages/SetupPage';
import { EventsPage } from './pages/EventsPage';
import { StagingPage } from './pages/StagingPage';
import { FlightsPage } from './pages/FlightsPage';
import { EgressPage } from './pages/EgressPage';
import { ShiftsPage } from './pages/ShiftsPage';
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));

interface SetupPrefs {
  weekOf: string;
  corridors: Corridor[];
}

export default function App() {
  const now = useEtClock();
  const [page, setPage] = useState<Page>('setup');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseEnabled);
  const [bundle, setBundle] = useState<GuideBundle | null>(null);
  const [cached, setCached] = useState<GuideBundle | null>(() => readLocal<GuideBundle | null>(KEYS.lastGuide, null));
  const [prefs, setPrefs] = useLocalState<SetupPrefs>(KEYS.setup, { weekOf: now.date, corridors: [...CORRIDORS] });
  const [forceFresh, setForceFresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [bookmarks, setBookmarks] = useLocalState<string[]>(KEYS.bookmarks, []);
  const [openEvent, setOpenEvent] = useState<GuideEvent | null>(null);
  const [focusHub, setFocusHub] = useState<string | null>(null);

  useEffect(
    () =>
      watchAuth((u) => {
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );

  const applyBundle = useCallback((b: GuideBundle) => {
    setBundle(b);
    setCached(b);
    writeLocal(KEYS.lastGuide, b);
  }, []);

  const generate = useCallback(
    async (opts: { force?: boolean } = {}) => {
      const force = opts.force ?? forceFresh;
      if (prefs.corridors.length === 0) {
        setStatus({ kind: 'error', text: 'Pick at least one corridor first.' });
        return;
      }
      setLoading(true);
      setStatus(null);
      try {
        if (user && !force) {
          try {
            const hit = await loadCachedGuide(user.uid, prefs.weekOf);
            const sameCorridors =
              hit && hit.corridors.length === prefs.corridors.length && prefs.corridors.every((c) => hit.corridors.includes(c));
            if (hit && sameCorridors) {
              applyBundle({ guide: hit.guide, sources: hit.sources });
              setStatus({ kind: 'info', text: 'Loaded your saved guide for this week from the cloud.' });
              setPage('events');
              return;
            }
          } catch (err) {
            console.warn('Firestore cache read failed, generating fresh:', err);
          }
        }
        const res = await fetch('/api/strategy/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekOf: prefs.weekOf, corridors: prefs.corridors }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        const b = data as GuideBundle;
        applyBundle(b);
        if (user) {
          saveCachedGuide(user.uid, b).catch((err) => console.warn('Could not save guide to Firestore:', err));
        }
        setStatus({ kind: 'info', text: `Fresh strategy generated with ${b.sources.length} web sources.` });
        setPage('events');
      } catch (err) {
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        setStatus({
          kind: 'error',
          text: offline
            ? 'No signal. Use Resume Week to open your last cached guide, or the tactical tools.'
            : err instanceof Error
              ? err.message
              : 'Something went wrong.',
        });
      } finally {
        setLoading(false);
      }
    },
    [applyBundle, forceFresh, prefs.corridors, prefs.weekOf, user],
  );

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Sign-in failed.' });
    }
  }, []);

  // Keep the profile in sync with chosen corridors (debounced).
  useEffect(() => {
    if (!user || prefs.corridors.length === 0) return;
    const t = setTimeout(() => saveProfile(user, prefs.corridors).catch((e) => console.warn('Profile save failed:', e)), 800);
    return () => clearTimeout(t);
  }, [user, prefs.corridors]);

  const guide = bundle?.guide ?? null;
  const toggleBookmark = useCallback(
    (id: string) => setBookmarks((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id])),
    [setBookmarks],
  );

  const savedCount = useMemo(
    () => (guide ? guide.events.filter((e) => bookmarks.includes(e.id)).length : 0),
    [guide, bookmarks],
  );

  const goToHub = useCallback((hubId: string) => {
    setFocusHub(hubId);
    setOpenEvent(null);
    setPage('staging');
  }, []);

  const weekLabel = prettyDate(guide?.weekOf ?? prefs.weekOf);

  return (
    <div className="min-h-screen bg-canvas text-slate-200">
      <TopBar
        weekLabel={weekLabel}
        timeLabel={now.timeLabel}
        canRegenerate={Boolean(guide) && !loading}
        loading={loading}
        onRegenerate={() => generate({ force: true })}
        onSetup={() => setPage('setup')}
        user={user}
        firebaseEnabled={firebaseEnabled}
        onSignIn={handleSignIn}
        onSignOut={() => signOut()}
      />
      <div className="flex">
        <Sidebar page={page} onNavigate={setPage} saved={savedCount} total={guide?.events.length ?? 0} />
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pb-28 lg:pb-10 max-w-[1400px]">
          {status && (
            <div
              role={status.kind === 'error' ? 'alert' : 'status'}
              className={`mb-5 rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-4 ${
                status.kind === 'error' ? 'border-crimson/40 text-red-200 bg-crimson/10' : 'border-slate-800/90 text-slate-300 bg-panel'
              }`}
            >
              <span>
                {status.kind === 'error' && <strong className="text-crimson mr-1">Error:</strong>}
                {status.text}
              </span>
              <button onClick={() => setStatus(null)} className="text-slate-400 hover:text-white text-xs font-semibold">
                Dismiss
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              {page === 'setup' && (
                <SetupPage
                  now={now}
                  weekOf={prefs.weekOf}
                  corridors={prefs.corridors}
                  onWeekOf={(weekOf) => setPrefs((p) => ({ ...p, weekOf }))}
                  onCorridors={(corridors) => setPrefs((p) => ({ ...p, corridors }))}
                  forceFresh={forceFresh}
                  onForceFresh={setForceFresh}
                  loading={loading}
                  onGenerate={() => generate()}
                  onOpenTools={() => setPage('staging')}
                  cached={cached}
                  onResume={() => {
                    if (cached) {
                      setBundle(cached);
                      setPage('events');
                    }
                  }}
                  user={user}
                  authReady={authReady}
                  firebaseEnabled={firebaseEnabled}
                  onSignIn={handleSignIn}
                  onNavigate={setPage}
                />
              )}
              {page === 'events' && (
                <EventsPage
                  bundle={bundle}
                  now={now}
                  bookmarks={bookmarks}
                  onToggleBookmark={toggleBookmark}
                  onOpenEvent={setOpenEvent}
                  onGoSetup={() => setPage('setup')}
                />
              )}
              {page === 'staging' && (
                <StagingPage
                  guide={guide}
                  now={now}
                  focusHub={focusHub}
                  onFocusHub={setFocusHub}
                  onOpenEvent={setOpenEvent}
                />
              )}
              {page === 'flights' && <FlightsPage now={now} onGoToHub={goToHub} />}
              {page === 'egress' && <EgressPage now={now} onGoToHub={goToHub} />}
              {page === 'shifts' && <ShiftsPage now={now} onGoToHub={goToHub} />}
              {page === 'analytics' && (
                <Suspense fallback={<p className="text-sm text-slate-500">Loading charts…</p>}>
                  <AnalyticsPage guide={guide} onGoSetup={() => setPage('setup')} />
                </Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav page={page} onNavigate={setPage} />
      <EventModal
        event={openEvent}
        bookmarked={openEvent ? bookmarks.includes(openEvent.id) : false}
        onToggleBookmark={toggleBookmark}
        onClose={() => setOpenEvent(null)}
        onGoToHub={goToHub}
      />
    </div>
  );
}
