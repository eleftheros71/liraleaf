import { MapPin, Plane, ShieldCheck } from 'lucide-react';
import { MCO_RULES, TERMINALS } from '../data/ops';
import { googleMapsUrl, wazeUrl } from '../data/hubs';
import { formatClock, windowState, type EtNow } from '../lib/time';
import { Button, Label, NavLinks, PageTitle, Panel, PanelHeader, WindowText } from '../components/ui';

export function FlightsPage({ now, onGoToHub }: { now: EtNow; onGoToHub: (hubId: string) => void }) {
  return (
    <>
      <PageTitle
        title="MCO Flight Waves"
        subtitle="Typical inbound banks by terminal, with live ET status. Check the app's pickup pin and airport signage before you roll."
      />
      <div className="grid gap-5 xl:grid-cols-3">
        {TERMINALS.map((t) => (
          <Panel key={t.id}>
            <PanelHeader
              title={t.name}
              icon={<Plane className="h-4 w-4 text-amber" />}
              right={
                <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => onGoToHub(t.hubId)}>
                  <MapPin className="h-3.5 w-3.5" /> Map
                </Button>
              }
            />
            <ul className="divide-y divide-slate-800/90">
              {t.banks.map((b) => {
                const st = windowState(b.start, b.end, now.minutes);
                return (
                  <li key={b.id} className={`p-4 ${st.kind === 'active' ? 'bg-emerald/5' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{b.label}</div>
                        <div className="num text-sm text-slate-300 mt-0.5">
                          {formatClock(b.start)} – {formatClock(b.end)}
                        </div>
                      </div>
                      <WindowText state={st} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <Label>Curbside bay</Label>
                        <div className="text-sm font-semibold text-amber mt-0.5">{b.bay}</div>
                        <div className="text-xs text-slate-500">{b.bayDetail}</div>
                      </div>
                      <div>
                        <Label>Est. queue wait</Label>
                        <div className="num text-sm text-slate-100 mt-0.5">{b.queueWait}</div>
                        <div className="text-xs text-slate-500">{b.carriers}</div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mt-3 leading-relaxed">{b.note}</p>
                  </li>
                );
              })}
            </ul>
            <div className="p-4 border-t border-slate-800/90">
              <NavLinks maps={googleMapsUrl(t.lat, t.lng)} waze={wazeUrl(t.lat, t.lng)} />
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-5">
        <PanelHeader title="MCO ground transportation compliance" icon={<ShieldCheck className="h-4 w-4 text-amber" />} />
        <ol className="divide-y divide-slate-800/90">
          {MCO_RULES.map((r, i) => (
            <li key={i} className="flex gap-3 px-4 py-3 text-sm text-slate-300">
              <span className="num text-slate-500 w-5 shrink-0">{i + 1}.</span>
              {r}
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}
