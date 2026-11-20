import { BarChart3, CalendarDays, Calculator, Map, Plane, Rocket, Sparkles, type LucideIcon } from 'lucide-react';
import type { Page } from '../types';

export const NAV: { id: Page; label: string; short: string; icon: LucideIcon }[] = [
  { id: 'setup', label: 'Setup & Launchpad', short: 'Setup', icon: Rocket },
  { id: 'events', label: 'Events & Forecast', short: 'Events', icon: CalendarDays },
  { id: 'staging', label: 'Staging & GPS Map', short: 'Map', icon: Map },
  { id: 'flights', label: 'MCO Flight Waves', short: 'MCO', icon: Plane },
  { id: 'egress', label: 'Park Egress', short: 'Parks', icon: Sparkles },
  { id: 'shifts', label: 'Shift Planner', short: 'Shifts', icon: Calculator },
  { id: 'analytics', label: 'Surge Analytics', short: 'Stats', icon: BarChart3 },
];

export function Sidebar({ page, onNavigate, saved, total }: { page: Page; onNavigate: (p: Page) => void; saved: number; total: number }) {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-800/90 sticky top-14 h-[calc(100vh-3.5rem)]">
      <nav className="flex-1 p-3 space-y-0.5" aria-label="Main">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-amber' : ''}`} />
              {label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-800/90 grid grid-cols-2 divide-x divide-slate-800/90">
        <div className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Saved</div>
          <div className="num text-xl font-semibold text-amber">{saved}</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Events</div>
          <div className="num text-xl font-semibold text-slate-100">{total}</div>
        </div>
      </div>
    </aside>
  );
}

export function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  return (
    <nav
      aria-label="Main"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-canvas border-t border-slate-800/90 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-7">
        {NAV.map(({ id, short, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${active ? 'text-amber' : 'text-slate-500'}`}
            >
              <Icon className="h-5 w-5" />
              {short}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
