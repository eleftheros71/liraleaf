import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleAlert, CircleCheck, CircleHelp, Link2, Navigation, PencilLine, X } from 'lucide-react';
import type { Verification } from '../types';
import { googleMapsUrl, wazeUrl } from '../data/hubs';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`bg-surface rounded-2xl border border-line ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mt-7 mb-2.5 px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">{children}</h2>
      {right}
    </div>
  );
}

type BtnVariant = 'go' | 'plain' | 'ghost' | 'danger';
const btnStyle: Record<BtnVariant, string> = {
  go: 'bg-go text-go-ink hover:brightness-110',
  plain: 'bg-surface-2 text-ink hover:brightness-110',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2',
  danger: 'bg-bad-soft text-bad hover:brightness-110',
};

export function Button({
  children,
  onClick,
  variant = 'plain',
  disabled,
  className = '',
  type = 'button',
  size = 'md',
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  size?: 'md' | 'lg' | 'sm';
  'aria-label'?: string;
  title?: string;
}) {
  const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-[15px]', lg: 'h-14 px-5 text-base' }[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition disabled:opacity-40 disabled:cursor-not-allowed ${sizes} ${btnStyle[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function NavButtons({ lat, lng, size = 'md' }: { lat: number; lng: number; size?: 'md' | 'lg' }) {
  const h = size === 'lg' ? 'h-14 text-base' : 'h-11 text-[15px]';
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={googleMapsUrl(lat, lng)} target="_blank" rel="noreferrer" className={`${h} rounded-xl bg-go text-go-ink font-semibold inline-flex items-center justify-center gap-2`}>
        <Navigation className="h-4 w-4" /> Google Maps
      </a>
      <a href={wazeUrl(lat, lng)} target="_blank" rel="noreferrer" className={`${h} rounded-xl bg-surface-2 text-ink font-semibold inline-flex items-center justify-center gap-2`}>
        <Navigation className="h-4 w-4" /> Waze
      </a>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, full }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; full?: boolean }) {
  return (
    <div role="tablist" className={`${full ? 'flex w-full' : 'inline-flex'} rounded-xl bg-surface-2 p-1 gap-1`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`${full ? 'flex-1' : ''} h-9 px-3 rounded-lg text-sm font-semibold transition ${value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={`h-10 px-3.5 rounded-full text-sm font-semibold border transition ${on ? 'bg-go-soft border-go text-ink' : 'border-line text-ink-2 hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

const VERIFY: Record<Verification, { label: string; icon: typeof CircleCheck; cls: string }> = {
  confirmed: { label: 'Confirmed', icon: CircleCheck, cls: 'text-go' },
  sourced: { label: 'Source found', icon: Link2, cls: 'text-info' },
  unconfirmed: { label: 'Unconfirmed', icon: CircleHelp, cls: 'text-warn' },
  manual: { label: 'Added by you', icon: PencilLine, cls: 'text-ink-2' },
};

export function VerifyBadge({ v }: { v: Verification }) {
  const { label, icon: Icon, cls } = VERIFY[v];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

export function Notice({ tone = 'info', children, onClose }: { tone?: 'info' | 'bad' | 'warn'; children: ReactNode; onClose?: () => void }) {
  const cls = { info: 'bg-surface border-line text-ink-2', bad: 'bg-bad-soft border-bad/40 text-ink', warn: 'bg-warn-soft border-warn/40 text-ink' }[tone];
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      {tone !== 'info' && <CircleAlert className={`h-4 w-4 mt-0.5 shrink-0 ${tone === 'bad' ? 'text-bad' : 'text-warn'}`} />}
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="text-ink-3 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Bottom sheet on phones, centered dialog on wide screens. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-surface sm:rounded-2xl rounded-t-3xl border border-line pb-[env(safe-area-inset-bottom)]"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line z-10">
              <h2 className="text-lg font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-2 text-ink-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-2 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-3 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full h-12 rounded-xl bg-bg border border-line px-3.5 text-ink placeholder:text-ink-3 focus:outline-none focus:border-go num';

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto h-12 w-12 grid place-items-center rounded-full bg-surface-2 text-ink-3">{icon}</div>
      <h3 className="mt-3 font-semibold text-ink">{title}</h3>
      {children && <p className="mt-1 text-sm text-ink-3 max-w-sm mx-auto">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
