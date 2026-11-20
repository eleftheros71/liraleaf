import { PARKS, TERMINALS, type FlightBank, type ParkEgress, type Terminal } from '../data/ops';
import { minutesUntilStart, toMinutes, windowState, type WindowState } from './time';

/** Egress window for a park: from the nightly show until 60 min after closing. */
export function egressWindow(p: ParkEgress): { start: string; end: string } {
  const end = toMinutes(p.close) + 60;
  const hh = String(Math.floor(end / 60) % 24).padStart(2, '0');
  const mm = String(end % 60).padStart(2, '0');
  return { start: p.show, end: `${hh}:${mm}` };
}

export function parkState(p: ParkEgress, nowMin: number): WindowState {
  const w = egressWindow(p);
  return windowState(w.start, w.end, nowMin);
}

export function nextFlightWave(nowMin: number): { terminal: Terminal; bank: FlightBank; state: WindowState } {
  let best: { terminal: Terminal; bank: FlightBank; until: number } | null = null;
  for (const terminal of TERMINALS) {
    for (const bank of terminal.banks) {
      const until = minutesUntilStart(bank.start, bank.end, nowMin);
      if (!best || until < best.until) best = { terminal, bank, until };
    }
  }
  const b = best!;
  return { terminal: b.terminal, bank: b.bank, state: windowState(b.bank.start, b.bank.end, nowMin) };
}

export function nextParkEgress(nowMin: number): { park: ParkEgress; state: WindowState } {
  let best: { park: ParkEgress; until: number } | null = null;
  for (const park of PARKS) {
    const w = egressWindow(park);
    const until = minutesUntilStart(w.start, w.end, nowMin);
    if (!best || until < best.until) best = { park, until };
  }
  return { park: best!.park, state: parkState(best!.park, nowMin) };
}
