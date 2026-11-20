import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, MapPin, Search, Star, X } from 'lucide-react';
import type { GuideEvent } from '../types';
import { googleMapsUrl, hubById, wazeUrl } from '../data/hubs';
import { prettyDate } from '../lib/time';
import { Button, Label, NavLinks, TierText } from './ui';

export function googleVerifyUrl(e: GuideEvent): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${e.name} ${e.venue} Orlando ${e.date}`)}`;
}

export function EventModal({
  event,
  bookmarked,
  onToggleBookmark,
  onClose,
  onGoToHub,
}: {
  event: GuideEvent | null;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onClose: () => void;
  onGoToHub: (hubId: string) => void;
}) {
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [event, onClose]);

  const hub = event ? hubById(event.stagingHubId) : undefined;

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-panel border border-slate-800/90 rounded-t-2xl sm:rounded-2xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-800/90">
              <div className="min-w-0">
                <div className="text-xs text-slate-400 num">
                  {prettyDate(event.date, { weekday: true })} · {event.startTime} – {event.endTime}
                </div>
                <h2 id="event-modal-title" className="text-lg font-bold text-white mt-1">
                  {event.name}
                </h2>
                <div className="text-sm text-slate-400 mt-0.5">
                  {event.venue} · {event.corridor} · {event.type}
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-800/90 border-b border-slate-800/90">
              <div className="p-4">
                <Label>Surge tier</Label>
                <div className="mt-1">
                  <TierText tier={event.surgeTier} />
                </div>
              </div>
              <div className="p-4">
                <Label>Attendance</Label>
                <div className="num text-sm text-slate-100 mt-1">{event.expectedAttendance || '—'}</div>
              </div>
              <div className="p-4">
                <Label>Staging hub</Label>
                <div className="text-sm text-slate-100 mt-1">{hub?.short ?? '—'}</div>
              </div>
            </div>

            <div className="divide-y divide-slate-800/90">
              <div className="p-5">
                <Label>Pickup times</Label>
                <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">{event.pickupTimes || 'Not specified.'}</p>
              </div>
              <div className="p-5">
                <Label>Dispatch strategy</Label>
                <p className="text-sm text-slate-200 mt-1.5 leading-relaxed whitespace-pre-line">{event.dispatchStrategy || 'Not specified.'}</p>
              </div>
              {hub && (
                <div className="p-5 space-y-3">
                  <Label>Exact pickup pin</Label>
                  <p className="text-sm text-slate-200 leading-relaxed">{hub.pickupPin}</p>
                  <NavLinks maps={googleMapsUrl(hub.lat, hub.lng)} waze={wazeUrl(hub.lat, hub.lng)} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-slate-800/90">
              <Button variant={bookmarked ? 'primary' : 'secondary'} onClick={() => onToggleBookmark(event.id)}>
                <Star className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
                {bookmarked ? 'Saved' : 'Save event'}
              </Button>
              {hub && (
                <Button onClick={() => onGoToHub(hub.id)}>
                  <MapPin className="h-4 w-4" /> Show on map
                </Button>
              )}
              {event.sourceUrl ? (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-sm font-semibold text-slate-100"
                >
                  <ExternalLink className="h-4 w-4" /> Source
                </a>
              ) : null}
              <a
                href={googleVerifyUrl(event)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-sm font-semibold text-slate-100"
              >
                <Search className="h-4 w-4" /> Verify on Google
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
