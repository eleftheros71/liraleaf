import { useEffect, useState } from 'react';
import { etNow, type EtNow } from './time';

/** Eastern Time clock, ticking on the half-minute. */
export function useEtClock(): EtNow {
  const [now, setNow] = useState(() => etNow());
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(etNow());
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 30_000);
    }, 30_000 - (Date.now() % 30_000));
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return now;
}

export interface GeoState {
  position: { lat: number; lng: number } | null;
  error: string | null;
}

/** Device location, refreshed every 2 minutes while enabled. */
export function useGeolocation(enabled: boolean): GeoState {
  const [state, setState] = useState<GeoState>({ position: null, error: null });
  useEffect(() => {
    if (!enabled) {
      setState({ position: null, error: null });
      return;
    }
    if (!('geolocation' in navigator)) {
      setState({ position: null, error: 'Location is not available on this device.' });
      return;
    }
    const read = () =>
      navigator.geolocation.getCurrentPosition(
        (p) => setState({ position: { lat: p.coords.latitude, lng: p.coords.longitude }, error: null }),
        (e) => setState((s) => ({ ...s, error: e.code === 1 ? 'Location permission denied.' : 'Could not get your location.' })),
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
      );
    read();
    const id = setInterval(read, 120_000);
    return () => clearInterval(id);
  }, [enabled]);
  return state;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
