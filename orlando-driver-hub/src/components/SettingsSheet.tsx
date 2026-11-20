import { useRef, useState } from 'react';
import { Cloud, CloudOff, Download, FileSpreadsheet, LogIn, LogOut, Upload } from 'lucide-react';
import { useApp } from '../state';
import type { Settings, Shift } from '../types';
import { costPerMile, money, shiftMath } from '../lib/earnings';
import { Button, Field, Notice, Segmented, Sheet, inputCls } from './ui';

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function NumField({ label, value, onChange, step = '0.01', hint }: { label: string; value: number; onChange: (n: number) => void; step?: string; hint?: string }) {
  const [text, setText] = useState(String(value));
  return (
    <Field label={label} hint={hint}>
      <input
        inputMode="decimal"
        type="number"
        step={step}
        min={0}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        className={inputCls}
      />
    </Field>
  );
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const { settings, updateSettings } = app;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const exportJson = () => {
    download(
      `driver-hub-backup-${app.now.date}.json`,
      'application/json',
      JSON.stringify({ app: 'orlando-driver-hub', version: 1, exportedAt: new Date().toISOString(), settings, shifts: app.shifts, manualEvents: app.manualEvents }, null, 2),
    );
  };

  const exportCsv = () => {
    const header = ['date', 'start', 'end', 'hours', 'platform', 'earnings', 'tips', 'tolls', 'miles', 'trips', 'vehicle_cost', 'net', 'areas', 'notes'];
    const rows = [...app.shifts].reverse().map((s) => {
      const m = shiftMath(s, app.cpm);
      const st = new Date(s.start);
      const en = new Date(s.end);
      return [
        st.toLocaleDateString('en-CA'),
        st.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        en.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        m.hours.toFixed(2),
        s.platform,
        s.earnings.toFixed(2),
        s.tips.toFixed(2),
        s.tolls.toFixed(2),
        s.miles.toFixed(1),
        s.trips,
        m.vehicleCost.toFixed(2),
        m.net.toFixed(2),
        s.areas.join(' '),
        s.notes,
      ].map(csvCell);
    });
    download(`driver-hub-shifts-${app.now.date}.csv`, 'text/csv', [header.join(','), ...rows.map((r) => r.join(','))].join('\n'));
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { app?: string; shifts?: Shift[]; settings?: Partial<Settings> };
      if (data.app !== 'orlando-driver-hub' || !Array.isArray(data.shifts)) throw new Error('Not a Driver Hub backup file.');
      const byId = new Map(app.shifts.map((s) => [s.id, s]));
      let added = 0;
      for (const s of data.shifts) {
        if (!s?.id || !s.start || !s.end) continue;
        const cur = byId.get(s.id);
        if (!cur || (s.updatedAt ?? 0) > cur.updatedAt) {
          byId.set(s.id, { ...s, areas: s.areas ?? [], notes: s.notes ?? '', updatedAt: s.updatedAt ?? Date.now() });
          added++;
        }
      }
      app.replaceAllShifts([...byId.values()]);
      setMsg(`Imported ${added} shift${added === 1 ? '' : 's'}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-7">
        <section className="space-y-3">
          <h3 className="font-semibold">Display</h3>
          <Segmented<Settings['theme']>
            full
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[{ value: 'auto', label: 'Auto' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
          />
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">
              <span className="font-medium">Use my location</span>
              <span className="block text-ink-3">Adds drive time to picks. Stays on this phone.</span>
            </span>
            <input type="checkbox" checked={settings.useLocation} onChange={(e) => updateSettings({ useLocation: e.target.checked })} className="h-6 w-6 accent-[var(--go)]" />
          </label>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">Vehicle costs</h3>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="MPG" step="1" value={settings.mpg} onChange={(mpg) => updateSettings({ mpg })} />
            <NumField label="Gas $/gal" value={settings.gasPrice} onChange={(gasPrice) => updateSettings({ gasPrice })} />
            <NumField label="Wear $/mi" value={settings.maintenancePerMile} onChange={(maintenancePerMile) => updateSettings({ maintenancePerMile })} />
          </div>
          <p className="text-xs text-ink-3">
            Total {money(costPerMile(settings), true)} per mile. Wear covers tires, oil, repairs and depreciation; $0.08–0.15 is typical for a sedan.
          </p>
          <NumField label="Weekly net goal ($)" step="50" value={settings.weeklyGoal} onChange={(weeklyGoal) => updateSettings({ weeklyGoal })} />
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">Server access code</h3>
          <Field label="Access code" hint="Only needed if your server sets APP_ACCESS_CODE.">
            <input type="password" autoComplete="off" value={settings.accessCode} onChange={(e) => updateSettings({ accessCode: e.target.value })} className={inputCls} />
          </Field>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold">Backup</h3>
          {app.firebaseEnabled ? (
            app.user ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
                <div className="text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {app.syncState === 'error' ? <CloudOff className="h-4 w-4 text-bad" /> : <Cloud className="h-4 w-4 text-go" />}
                    {app.syncState === 'syncing' ? 'Syncing…' : app.syncState === 'error' ? 'Sync problem. Will retry on next change.' : 'Shifts backed up'}
                  </div>
                  <div className="text-ink-3">{app.user.email}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => app.signOut()}>
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={() => app.signIn()}>
                <LogIn className="h-4 w-4" /> Sign in with Google to back up shifts
              </Button>
            )
          ) : (
            <p className="text-sm text-ink-3">Cloud backup isn't set up on this install. Your data lives on this phone, so export a backup now and then.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportJson}>
              <Download className="h-4 w-4" /> Backup file
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Restore
            </Button>
          </div>
          <Button className="w-full" onClick={exportCsv} disabled={app.shifts.length === 0}>
            <FileSpreadsheet className="h-4 w-4" /> Export shifts as CSV (for taxes)
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          {msg && <Notice onClose={() => setMsg(null)}>{msg}</Notice>}
        </section>
      </div>
    </Sheet>
  );
}
