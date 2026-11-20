import { useEffect, useState } from 'react';
import { ExternalLink, Search, Star, Trash2 } from 'lucide-react';
import { useApp } from '../state';
import { CORRIDORS, EVENT_TYPES, SURGE_TIERS, type Corridor, type EventType, type GuideEvent, type SurgeTier } from '../types';
import { HUBS, hubById } from '../data/hubs';
import { formatClock, prettyDate } from '../lib/time';
import { slug } from '../lib/guide';
import { Button, Field, NavButtons, Sheet, VerifyBadge, inputCls } from './ui';

export function EventSheet({ event, onClose }: { event: GuideEvent | null; onClose: () => void }) {
  const { saved, toggleSaved, deleteManualEvent } = useApp();
  const hub = event ? hubById(event.hubId) : undefined;
  const verifyUrl = event ? `https://www.google.com/search?q=${encodeURIComponent(`${event.name} ${event.venue} ${event.date}`)}` : '';
  return (
    <Sheet open={Boolean(event)} onClose={onClose} title="Event">
      {event && (
        <div className="space-y-5">
          <div>
            <div className="num text-sm text-ink-3">
              {prettyDate(event.date, { weekday: true })}
              {event.startTime && ` · ${formatClock(event.startTime)}`}
              {event.endTime && ` – ${formatClock(event.endTime)}`}
            </div>
            <h3 className="text-xl font-bold mt-1 leading-snug">{event.name}</h3>
            <div className="text-ink-2">{event.venue}</div>
          </div>

          <div className="rounded-xl bg-surface-2 p-4">
            <VerifyBadge v={event.verification} />
            <p className="text-sm text-ink-2 mt-1">{event.verificationNote}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {event.sourceUrl && (
                <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="h-10 px-3 rounded-lg bg-surface inline-flex items-center gap-2 text-sm font-semibold">
                  <ExternalLink className="h-4 w-4" /> Open source
                </a>
              )}
              <a href={verifyUrl} target="_blank" rel="noreferrer" className="h-10 px-3 rounded-lg bg-surface inline-flex items-center gap-2 text-sm font-semibold">
                <Search className="h-4 w-4" /> Search Google
              </a>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-3">Expected demand</dt>
              <dd className="font-semibold">{event.surgeTier}</dd>
            </div>
            <div>
              <dt className="text-ink-3">Attendance</dt>
              <dd className="font-semibold num">{event.attendance || '—'}</dd>
            </div>
          </dl>

          {event.pickupTips && (
            <div>
              <div className="text-sm text-ink-3">Pickup tips</div>
              <p className="mt-1 leading-relaxed">{event.pickupTips}</p>
            </div>
          )}

          {hub && (
            <div className="space-y-3">
              <div>
                <div className="text-sm text-ink-3">Stage at {hub.name}</div>
                <p className="mt-1 text-sm text-ink-2">{hub.pickupPin}</p>
              </div>
              <NavButtons lat={hub.lat} lng={hub.lng} />
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => toggleSaved(event.id)}>
              <Star className={`h-4 w-4 ${saved.includes(event.id) ? 'fill-current text-warn' : ''}`} />
              {saved.includes(event.id) ? 'Saved' : 'Save'}
            </Button>
            {event.verification === 'manual' && (
              <Button
                variant="danger"
                onClick={() => {
                  deleteManualEvent(event.id);
                  onClose();
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

const DEFAULT_HUB: Record<Corridor, string> = { OCCC: 'occc-west', Disney: 'disney-ttc', Universal: 'citywalk', 'Sports/Concerts': 'kia', Other: 'downtown' };

export function EventForm({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate: string }) {
  const { saveManualEvent } = useApp();
  const [f, setF] = useState({ name: '', venue: '', date: defaultDate, startTime: '', endTime: '', corridor: 'Sports/Concerts' as Corridor, type: 'Concert' as EventType, surgeTier: 'High' as SurgeTier, hubId: 'kia', pickupTips: '' });
  useEffect(() => {
    if (open) setF((x) => ({ ...x, name: '', venue: '', pickupTips: '', date: defaultDate, startTime: '', endTime: '' }));
  }, [open, defaultDate]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    if (!f.name.trim() || !f.date) return;
    saveManualEvent({
      id: `manual-${slug(f.name)}-${f.date}-${Date.now().toString(36)}`,
      name: f.name.trim(),
      venue: f.venue.trim() || hubById(f.hubId)?.name || 'TBA',
      corridor: f.corridor,
      type: f.type,
      date: f.date,
      startTime: f.startTime,
      endTime: f.endTime,
      pickupTips: f.pickupTips.trim(),
      surgeTier: f.surgeTier,
      attendance: '',
      hubId: f.hubId,
      sourceUrl: '',
      verification: 'manual',
      verificationNote: 'You added this event.',
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add an event">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Event name">
          <input required value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="e.g. Magic vs. Heat" />
        </Field>
        <Field label="Venue (optional)">
          <input value={f.venue} onChange={(e) => set('venue', e.target.value)} className={inputCls} placeholder="e.g. Kia Center" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <input type="date" required value={f.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Starts">
            <input type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Ends">
            <input type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Area">
            <select
              value={f.corridor}
              onChange={(e) => {
                const c = e.target.value as Corridor;
                setF((x) => ({ ...x, corridor: c, hubId: DEFAULT_HUB[c] }));
              }}
              className={inputCls}
            >
              {CORRIDORS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select value={f.type} onChange={(e) => set('type', e.target.value as EventType)} className={inputCls}>
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stage at">
            <select value={f.hubId} onChange={(e) => set('hubId', e.target.value)} className={inputCls}>
              {HUBS.map((h) => <option key={h.id} value={h.id}>{h.short}</option>)}
            </select>
          </Field>
          <Field label="Expected demand">
            <select value={f.surgeTier} onChange={(e) => set('surgeTier', e.target.value as SurgeTier)} className={inputCls}>
              {SURGE_TIERS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes (optional)">
          <input value={f.pickupTips} onChange={(e) => set('pickupTips', e.target.value)} className={inputCls} placeholder="Where riders come out, where to wait" />
        </Field>
        <Button type="submit" variant="go" size="lg" className="w-full">Add event</Button>
        <p className="text-xs text-ink-3">The end time drives the let-out pick on the Now screen. Add it if you know it.</p>
      </form>
    </Sheet>
  );
}
