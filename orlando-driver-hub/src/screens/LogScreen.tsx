import { ClipboardList, Play, Plus, Square } from 'lucide-react';
import { useApp } from '../state';
import { money, shiftMath } from '../lib/earnings';
import { formatDuration } from '../lib/time';
import { Button, Card, EmptyState, SectionTitle } from '../components/ui';
import type { ShiftDraft } from '../components/ShiftForm';

export function LogScreen({ onDraft }: { onDraft: (d: ShiftDraft) => void }) {
  const { shifts, activeShift, startShift, cpm } = useApp();
  const elapsed = activeShift ? Math.max(0, Math.round((Date.now() - Date.parse(activeShift.start)) / 60000)) : 0;

  return (
    <div>
      <Card className="p-5">
        {activeShift ? (
          <>
            <div className="text-sm text-ink-3">On shift since {new Date(activeShift.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            <div className="num text-4xl font-extrabold mt-1">{formatDuration(elapsed)}</div>
            <Button variant="danger" size="lg" className="w-full mt-4" onClick={() => onDraft({ start: activeShift.start, end: new Date().toISOString(), fromTimer: true })}>
              <Square className="h-4 w-4 fill-current" /> End shift and log earnings
            </Button>
          </>
        ) : (
          <>
            <div className="font-semibold">Track your next shift</div>
            <p className="text-sm text-ink-3 mt-1">Tap start when you go online. When you end, enter what the app paid and your miles. Takes 30 seconds.</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="go" size="lg" onClick={startShift}>
                <Play className="h-4 w-4 fill-current" /> Start shift
              </Button>
              <Button size="lg" onClick={() => onDraft({})}>
                <Plus className="h-4 w-4" /> Log past shift
              </Button>
            </div>
          </>
        )}
      </Card>

      <SectionTitle>History</SectionTitle>
      {shifts.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No shifts logged yet">
          After a few shifts, the Earnings tab shows your real net per hour by day, time and area. The Now screen starts using it too.
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line">
          {shifts.map((s) => {
            const m = shiftMath(s, cpm);
            const d = new Date(s.start);
            return (
              <button key={s.id} onClick={() => onDraft({ shift: s })} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/50">
                <div className="w-12 shrink-0 text-center">
                  <div className="text-xs text-ink-3 uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="num text-lg font-bold leading-tight">{d.getDate()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="num font-semibold">
                    {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {m.hours.toFixed(1)}h · {s.trips} trips
                  </div>
                  <div className="text-sm text-ink-3 truncate">{s.areas.length ? s.areas.join(', ') : 'No area tagged'} · {s.platform}</div>
                </div>
                <div className="text-right">
                  <div className={`num font-bold ${m.net >= 0 ? 'text-go' : 'text-bad'}`}>{money(m.net)}</div>
                  <div className="num text-xs text-ink-3">{money(m.netPerHour)}/hr</div>
                </div>
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}
