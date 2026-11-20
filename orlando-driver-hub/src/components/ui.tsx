import type { ReactNode } from 'react';
import type { DemandRating, Severity, SurgeTier } from '../types';
import type { WindowState } from '../lib/time';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`bg-panel border border-slate-800/90 rounded-xl ${className}`}>{children}</section>;
}

export function PanelHeader({ title, icon, right }: { title: string; icon?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800/90">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        {icon}
        {title}
      </h2>
      {right}
    </header>
  );
}

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</div>;
}

type Tone = 'neutral' | 'amber' | 'emerald' | 'crimson';
const toneClass: Record<Tone, string> = {
  neutral: 'text-slate-300',
  amber: 'text-amber',
  emerald: 'text-emerald',
  crimson: 'text-crimson',
};

/** Inline status text (no pill). Crimson always carries an explicit word label. */
export function StatusText({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`text-xs font-semibold ${toneClass[tone]}`}>{children}</span>;
}

export function ratingTone(r: DemandRating): Tone {
  if (r === 'Peak' || r === 'Extreme') return 'crimson';
  if (r === 'High') return 'amber';
  if (r === 'Moderate') return 'neutral';
  return 'neutral';
}

export function RatingText({ rating }: { rating: DemandRating }) {
  const tone = ratingTone(rating);
  const label = rating === 'Peak' ? 'PEAK SURGE' : rating === 'Extreme' ? 'EXTREME SURGE' : rating;
  return <StatusText tone={tone}>{label}</StatusText>;
}

export function TierText({ tier }: { tier: SurgeTier }) {
  const tone: Tone = tier === 'Peak' || tier === 'Extreme' ? 'crimson' : tier === 'High' ? 'amber' : 'neutral';
  const label = tier === 'Peak' || tier === 'Extreme' ? `${tier.toUpperCase()} SURGE` : `${tier} surge`;
  return <StatusText tone={tone}>{label}</StatusText>;
}

export function SeverityText({ severity }: { severity: Severity }) {
  const tone: Tone = severity === 'Critical' ? 'crimson' : severity === 'Caution' ? 'amber' : 'neutral';
  return <StatusText tone={tone}>{severity.toUpperCase()}</StatusText>;
}

export function WindowText({ state }: { state: WindowState }) {
  const tone: Tone = state.kind === 'active' ? 'emerald' : state.kind === 'upcoming' ? 'amber' : 'neutral';
  return (
    <span className={`num text-xs font-medium ${toneClass[tone]}`}>{state.label}</span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  className = '',
  type = 'button',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold px-3.5 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber';
  const styles = {
    primary: 'bg-amber text-slate-950 hover:bg-amber-400',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
    ghost: 'text-slate-300 hover:text-white hover:bg-slate-800/70',
  }[variant];
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function NavLinks({ maps, waze }: { maps: string; waze: string }) {
  return (
    <div className="flex gap-2">
      <a href={maps} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100">
        Google Maps
      </a>
      <a href={waze} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100">
        Waze
      </a>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-canvas border border-slate-800/90 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            value === o.value ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-canvas border border-slate-800/90 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
