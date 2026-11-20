import { MapPin, Sparkles } from 'lucide-react';
import { PARKS } from '../data/ops';
import { googleMapsUrl, wazeUrl } from '../data/hubs';
import { egressWindow, parkState } from '../lib/live';
import { formatClock, type EtNow } from '../lib/time';
import { Button, Label, NavLinks, PageTitle, Panel, PanelHeader, WindowText } from '../components/ui';

export function EgressPage({ now, onGoToHub }: { now: EtNow; onGoToHub: (hubId: string) => void }) {
  return (
    <>
      <PageTitle
        title="Park Egress"
        subtitle="Typical nightly show and closing times. Hours change by season, so confirm on the park calendar before you commit."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {PARKS.map((p) => {
          const st = parkState(p, now.minutes);
          const w = egressWindow(p);
          return (
            <Panel key={p.id}>
              <PanelHeader title={p.park} icon={<Sparkles className="h-4 w-4 text-amber" />} right={<WindowText state={st} />} />
              <div className="grid grid-cols-3 divide-x divide-slate-800/90 border-b border-slate-800/90">
                <div className="p-4">
                  <Label>{p.showName}</Label>
                  <div className="num text-lg font-semibold text-slate-100 mt-1">{formatClock(p.show)}</div>
                </div>
                <div className="p-4">
                  <Label>Park close</Label>
                  <div className="num text-lg font-semibold text-slate-100 mt-1">{formatClock(p.close)}</div>
                </div>
                <div className="p-4">
                  <Label>Exp. surge</Label>
                  <div className="num text-lg font-semibold text-emerald mt-1">{p.surge}</div>
                </div>
              </div>
              <div className="divide-y divide-slate-800/90">
                <div className="p-4">
                  <Label>Egress window</Label>
                  <p className="num text-sm text-slate-200 mt-1">
                    {formatClock(w.start)} – {formatClock(w.end)}
                  </p>
                </div>
                <div className="p-4">
                  <Label>Staging location</Label>
                  <p className="text-sm text-slate-200 mt-1 leading-relaxed">{p.staging}</p>
                </div>
                <div className="p-4">
                  <Label>Pro tips</Label>
                  <ul className="mt-1.5 space-y-1.5">
                    {p.tips.map((t, i) => (
                      <li key={i} className="text-sm text-slate-300 leading-relaxed flex gap-2">
                        <span className="text-amber">›</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 flex flex-wrap items-center justify-between gap-2">
                  <NavLinks maps={googleMapsUrl(p.lat, p.lng)} waze={wazeUrl(p.lat, p.lng)} />
                  <Button variant="ghost" className="text-xs" onClick={() => onGoToHub(p.hubId)}>
                    <MapPin className="h-3.5 w-3.5" /> Show hub on map
                  </Button>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
