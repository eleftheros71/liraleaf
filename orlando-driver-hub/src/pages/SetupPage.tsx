import { ArrowRight, Check, Clock, History, Loader2, LogIn, Plane, Sparkles, Wrench, Zap } from 'lucide-react';
import type { User } from 'firebase/auth';
import { CORRIDORS, type Corridor, type GuideBundle, type Page } from '../types';
import type { EtNow } from '../lib/time';
import { formatClock, prettyDate } from '../lib/time';
import { nextFlightWave, nextParkEgress } from '../lib/live';
import { Button, Label, PageTitle, Panel, PanelHeader, WindowText } from '../components/ui';

const CORRIDOR_HINT: Record<Corridor, string> = {
  OCCC: 'Convention Center · I-Drive',
  Disney: 'Parks · Disney Springs',
  Universal: 'Studios · Epic · CityWalk',
  'Sports/Concerts': 'Kia Center · Camping World',
  Other: 'MCO · Downtown nightlife',
};

export function SetupPage(props: {
  now: EtNow;
  weekOf: string;
  corridors: Corridor[];
  onWeekOf: (d: string) => void;
  onCorridors: (c: Corridor[]) => void;
  forceFresh: boolean;
  onForceFresh: (v: boolean) => void;
  loading: boolean;
  onGenerate: () => void;
  onOpenTools: () => void;
  cached: GuideBundle | null;
  onResume: () => void;
  user: User | null;
  authReady: boolean;
  firebaseEnabled: boolean;
  onSignIn: () => void;
  onNavigate: (p: Page) => void;
}) {
  const { now } = props;
  const wave = nextFlightWave(now.minutes);
  const egress = nextParkEgress(now.minutes);

  const toggle = (c: Corridor) =>
    props.onCorridors(props.corridors.includes(c) ? props.corridors.filter((x) => x !== c) : [...props.corridors, c]);

  return (
    <>
      <PageTitle title="Setup & Live Dispatch" subtitle="Pick your week and corridors, then load a grounded strategy. Tactical tools work without it." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Left: configuration */}
        <Panel>
          <PanelHeader title="Weekly strategy" icon={<Zap className="h-4 w-4 text-amber" />} />
          <div className="divide-y divide-slate-800/90">
            <div className="p-4">
              <label htmlFor="week" className="block">
                <Label>Week start date</Label>
              </label>
              <input
                id="week"
                type="date"
                value={props.weekOf}
                onChange={(e) => e.target.value && props.onWeekOf(e.target.value)}
                className="num mt-2 w-full sm:w-56 bg-canvas border border-slate-800/90 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber"
              />
              <p className="text-xs text-slate-500 mt-2">Covers 7 days from {prettyDate(props.weekOf, { weekday: true })}.</p>
            </div>

            <fieldset className="p-4">
              <legend className="contents">
                <Label>Target corridors</Label>
              </legend>
              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                {CORRIDORS.map((c) => {
                  const on = props.corridors.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(c)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        on ? 'border-amber/70 bg-amber/10' : 'border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      <span className={`grid place-items-center h-4 w-4 rounded border ${on ? 'bg-amber border-amber text-slate-950' : 'border-slate-600'}`}>
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-100">{c}</span>
                        <span className="block text-xs text-slate-500">{CORRIDOR_HINT[c]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Label>Cloud sync</Label>
                <p className="text-sm text-slate-300 mt-1">
                  {!props.firebaseEnabled
                    ? 'Firebase not configured. Guides stay on this device.'
                    : !props.authReady
                      ? 'Checking sign-in…'
                      : props.user
                        ? `Signed in as ${props.user.displayName ?? props.user.email}. Guides cache to your account.`
                        : 'Sign in to cache weekly guides in your private Firestore space.'}
                </p>
              </div>
              {props.firebaseEnabled && props.authReady && !props.user && (
                <Button onClick={props.onSignIn}>
                  <LogIn className="h-4 w-4" /> Sign in with Google
                </Button>
              )}
            </div>

            <label className="p-4 flex items-center justify-between gap-4 cursor-pointer">
              <span>
                <span className="block text-sm font-semibold text-slate-100">Force fresh web search</span>
                <span className="block text-xs text-slate-500">Skip the Firestore cache and run a new grounded search.</span>
              </span>
              <span className="relative inline-flex">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={props.forceFresh}
                  onChange={(e) => props.onForceFresh(e.target.checked)}
                />
                <span className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-amber transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-amber" />
                <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
              </span>
            </label>

            <div className="p-4 flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <Button variant="primary" onClick={props.onGenerate} disabled={props.loading || props.corridors.length === 0} className="sm:flex-1 py-2.5">
                {props.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {props.loading ? 'Searching the web…' : 'Generate / Load Strategy'}
              </Button>
              <Button onClick={props.onOpenTools} className="py-2.5">
                <Wrench className="h-4 w-4" /> Open Tactical Tools
              </Button>
              {props.cached && (
                <Button onClick={props.onResume} className="py-2.5" title="Open the last guide saved on this device">
                  <History className="h-4 w-4" /> Resume Week of {prettyDate(props.cached.guide.weekOf)}
                </Button>
              )}
            </div>
            {props.loading && (
              <p className="px-4 pb-4 text-xs text-slate-500">Grounded searches usually take 30–90 seconds.</p>
            )}
          </div>
        </Panel>

        {/* Right: live dispatch */}
        <Panel>
          <PanelHeader title="Live dispatch" icon={<Clock className="h-4 w-4 text-amber" />} right={<span className="text-xs text-slate-500">Orlando · ET</span>} />
          <div className="p-5 border-b border-slate-800/90">
            <div className="num text-4xl font-semibold text-white">{now.timeLabel}</div>
            <div className="text-sm text-slate-400 mt-1">{prettyDate(now.date, { weekday: true })} · America/New_York · updates every 30s</div>
          </div>

          <div className="divide-y divide-slate-800/90">
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <Label>
                  <span className="inline-flex items-center gap-1.5">
                    <Plane className="h-3.5 w-3.5" /> MCO flight wave
                  </span>
                </Label>
                <WindowText state={wave.state} />
              </div>
              <div className="mt-2 text-base font-semibold text-slate-100">
                {wave.terminal.name} · {wave.bank.label}
              </div>
              <div className="num text-sm text-slate-400 mt-0.5">
                {formatClock(wave.bank.start)} – {formatClock(wave.bank.end)} · {wave.bank.bay} · queue {wave.bank.queueWait}
              </div>
              <button onClick={() => props.onNavigate('flights')} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber hover:text-amber-300">
                All terminal banks <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <Label>
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Park egress
                  </span>
                </Label>
                <WindowText state={egress.state} />
              </div>
              <div className="mt-2 text-base font-semibold text-slate-100">{egress.park.park}</div>
              <div className="num text-sm text-slate-400 mt-0.5">
                {egress.park.showName} {formatClock(egress.park.show)} · close {formatClock(egress.park.close)} · {egress.park.surge}
              </div>
              <button onClick={() => props.onNavigate('egress')} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber hover:text-amber-300">
                All park closings <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-3 gap-2">
              {(
                [
                  ['staging', 'Staging'],
                  ['shifts', 'Shifts'],
                  ['analytics', 'Analytics'],
                ] as const
              ).map(([id, label]) => (
                <Button key={id} variant="secondary" onClick={() => props.onNavigate(id)}>
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
