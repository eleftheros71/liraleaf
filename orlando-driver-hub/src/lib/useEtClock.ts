import { useEffect, useState } from 'react';
import { etNow, type EtNow } from './time';

/** Eastern Time clock that ticks every 30 seconds, aligned to the wall clock. */
export function useEtClock(): EtNow {
  const [now, setNow] = useState(() => etNow());
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(etNow());
    const msToNextHalfMinute = 30_000 - (Date.now() % 30_000);
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 30_000);
    }, msToNextHalfMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);
  return now;
}
