import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../state';
import { AREAS, PLATFORMS, type Area, type Platform, type Shift } from '../types';
import { money, shiftMath } from '../lib/earnings';
import { Button, Chip, Field, Sheet, inputCls } from './ui';

export interface ShiftDraft {
  shift?: Shift; // editing an existing one
  start?: string; // ISO, e.g. from the live timer
  end?: string;
  fromTimer?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function numOr0(v: string): number {
  const n = Number(v.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function ShiftForm({ draft, onClose }: { draft: ShiftDraft | null; onClose: () => void }) {
  const { saveShift, deleteShift, cancelActiveShift, cpm } = useApp();
  const [f, setF] = useState({
    date: '',
    startTime: '',
    endTime: '',
    platform: 'Uber' as Platform,
    earnings: '',
    tips: '',
    trips: '',
    miles: '',
    tolls: '',
    areas: [] as Area[],
    notes: '',
  });

  useEffect(() => {
    if (!draft) return;
    const s = draft.shift;
    const start = new Date(s?.start ?? draft.start ?? Date.now() - 4 * 3_600_000);
    const end = new Date(s?.end ?? draft.end ?? Date.now());
    setF({
      date: localDate(start),
      startTime: localTime(start),
      endTime: localTime(end),
      platform: s?.platform ?? 'Uber',
      earnings: s ? String(s.earnings) : '',
      tips: s ? String(s.tips) : '',
      trips: s ? String(s.trips) : '',
      miles: s ? String(s.miles) : '',
      tolls: s ? String(s.tolls) : '',
      areas: s?.areas ?? [],
      notes: s?.notes ?? '',
    });
  }, [draft]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const built = useMemo((): Shift | null => {
    if (!f.date || !f.startTime || !f.endTime) return null;
    const start = new Date(`${f.date}T${f.startTime}`);
    const end = new Date(`${f.date}T${f.endTime}`);
    if (end <= start) end.setDate(end.getDate() + 1); // shift ran past midnight
    if (Number.isNaN(start.getTime())) return null;
    return {
      id: draft?.shift?.id ?? `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      start: start.toISOString(),
      end: end.toISOString(),
      platform: f.platform,
      earnings: numOr0(f.earnings),
      tips: numOr0(f.tips),
      trips: Math.round(numOr0(f.trips)),
      miles: numOr0(f.miles),
      tolls: numOr0(f.tolls),
      areas: f.areas,
      notes: f.notes.trim(),
      updatedAt: Date.now(),
    };
  }, [f, draft]);

  const preview = built ? shiftMath(built, cpm) : null;
  const tooLong = preview ? preview.hours > 16 : false;

  const save = () => {
    if (!built || tooLong) return;
    saveShift(built);
    if (draft?.fromTimer) cancelActiveShift();
    onClose();
  };

  return (
    <Sheet open={Boolean(draft)} onClose={onClose} title={draft?.shift ? 'Edit shift' : draft?.fromTimer ? 'End shift' : 'Log a shift'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <input type="date" required value={f.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Start">
            <input type="time" required value={f.startTime} onChange={(e) => set('startTime', e.target.value)} className={inputCls} />
          </Field>
          <Field label="End">
            <input type="time" required value={f.endTime} onChange={(e) => set('endTime', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Earnings ($)" hint="Fares + bonuses, before tips">
            <input inputMode="decimal" value={f.earnings} onChange={(e) => set('earnings', e.target.value)} className={inputCls} placeholder="0" />
          </Field>
          <Field label="Tips ($)">
            <input inputMode="decimal" value={f.tips} onChange={(e) => set('tips', e.target.value)} className={inputCls} placeholder="0" />
          </Field>
          <Field label="Miles driven" hint="Include miles between rides">
            <input inputMode="decimal" value={f.miles} onChange={(e) => set('miles', e.target.value)} className={inputCls} placeholder="0" />
          </Field>
          <Field label="Tolls ($)">
            <input inputMode="decimal" value={f.tolls} onChange={(e) => set('tolls', e.target.value)} className={inputCls} placeholder="0" />
          </Field>
          <Field label="Trips">
            <input inputMode="numeric" value={f.trips} onChange={(e) => set('trips', e.target.value)} className={inputCls} placeholder="0" />
          </Field>
          <Field label="Platform">
            <select value={f.platform} onChange={(e) => set('platform', e.target.value as Platform)} className={inputCls}>
              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        <div>
          <div className="text-sm font-medium text-ink-2 mb-2">Where did you mostly drive?</div>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => (
              <Chip key={a} on={f.areas.includes(a)} onClick={() => set('areas', f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a])}>
                {a}
              </Chip>
            ))}
          </div>
          <p className="text-xs text-ink-3 mt-1.5">Tagging areas is what lets the app learn where you earn best.</p>
        </div>

        <Field label="Notes (optional)">
          <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={`${inputCls} h-auto py-3`} placeholder="What worked, what didn't" />
        </Field>

        {preview && (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
            <div>
              <div className="text-xs text-ink-3">Hours</div>
              <div className="num font-bold">{preview.hours.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-ink-3">Net</div>
              <div className={`num font-bold ${preview.net >= 0 ? 'text-go' : 'text-bad'}`}>{money(preview.net)}</div>
            </div>
            <div>
              <div className="text-xs text-ink-3">Net / hr</div>
              <div className={`num font-bold ${preview.netPerHour >= 0 ? 'text-go' : 'text-bad'}`}>{money(preview.netPerHour, true)}</div>
            </div>
          </div>
        )}
        {tooLong && <p className="text-sm text-bad">That's over 16 hours. Check the start and end times.</p>}

        <Button type="submit" variant="go" size="lg" className="w-full" disabled={!built || tooLong}>
          Save shift
        </Button>
        {draft?.fromTimer && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              cancelActiveShift();
              onClose();
            }}
          >
            Discard this shift
          </Button>
        )}
        {draft?.shift && (
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              deleteShift(draft.shift!.id);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete shift
          </Button>
        )}
      </form>
    </Sheet>
  );
}
