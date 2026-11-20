import type { Corridor } from '../types';

export interface Window {
  start: string; // HH:MM ET
  end: string; // HH:MM ET, may wrap past midnight
}

export interface StagingHub {
  id: string;
  name: string;
  short: string;
  corridor: Corridor;
  area: 'MCO' | 'OCCC' | 'Universal' | 'Disney' | 'Downtown';
  lat: number;
  lng: number;
  /** Schematic SVG position (viewBox 1000 x 700). */
  x: number;
  y: number;
  surge: string;
  primeHours: string;
  primeWindows: Window[];
  pickupPin: string;
  stagingTip: string;
}

export const HUBS: StagingHub[] = [
  {
    id: 'mco-ab',
    name: 'MCO Terminals A & B',
    short: 'MCO A/B',
    corridor: 'Other',
    area: 'MCO',
    lat: 28.4312,
    lng: -81.3081,
    x: 820,
    y: 430,
    surge: '1.3x – 1.8x',
    primeHours: '9:30–11:30a · 5:30–8p · 10p–12:30a',
    primeWindows: [
      { start: '09:30', end: '11:30' },
      { start: '17:30', end: '20:00' },
      { start: '22:00', end: '00:30' },
    ],
    pickupPin: 'Level 2 arrivals, outer curb ride-app zone (A side doors 1–5, B side doors 1–5)',
    stagingTip: 'Hold in the ride-app waiting lot off Jeff Fuqua Blvd. Never circle the arrivals curb.',
  },
  {
    id: 'mco-c',
    name: 'MCO Terminal C',
    short: 'MCO C',
    corridor: 'Other',
    area: 'MCO',
    lat: 28.4143,
    lng: -81.3009,
    x: 870,
    y: 520,
    surge: '1.4x – 2.0x',
    primeHours: '1–3p · 6–9p international bank',
    primeWindows: [
      { start: '13:00', end: '15:00' },
      { start: '18:00', end: '21:00' },
    ],
    pickupPin: 'Terminal C ground transportation, Level 6 ride-app pickup (follow GTC signage)',
    stagingTip: 'International arrivals clear customs 45–75 min after landing. Accept pings late in the bank.',
  },
  {
    id: 'occc-west',
    name: 'OCCC West Concourse',
    short: 'OCCC West',
    corridor: 'OCCC',
    area: 'OCCC',
    lat: 28.4248,
    lng: -81.4697,
    x: 420,
    y: 440,
    surge: '1.5x – 2.2x',
    primeHours: '7–9a inbound · 4:30–6:30p show close',
    primeWindows: [
      { start: '07:00', end: '09:00' },
      { start: '16:30', end: '18:30' },
    ],
    pickupPin: 'West Concourse ride-share lane, Universal Blvd entrance (Lot P2 side)',
    stagingTip: 'Wait in the Pointe Orlando / Westwood Blvd area and move in 10 minutes before show close.',
  },
  {
    id: 'occc-ns',
    name: 'OCCC North/South Concourse',
    short: 'OCCC N/S',
    corridor: 'OCCC',
    area: 'OCCC',
    lat: 28.4334,
    lng: -81.4708,
    x: 470,
    y: 385,
    surge: '1.4x – 2.0x',
    primeHours: '7–9a inbound · 5–7p show close',
    primeWindows: [
      { start: '07:00', end: '09:00' },
      { start: '17:00', end: '19:00' },
    ],
    pickupPin: 'North/South Concourse bus & ride-share loop off I-Drive (Hyatt bridge side)',
    stagingTip: 'Hotel rows on I-Drive feed short trips. Chain them before the big exit wave.',
  },
  {
    id: 'epic',
    name: 'Epic Universe',
    short: 'Epic',
    corridor: 'Universal',
    area: 'Universal',
    lat: 28.4733,
    lng: -81.4467,
    x: 600,
    y: 280,
    surge: '1.4x – 2.1x',
    primeHours: 'Park close ±45 min (usually 9–10p)',
    primeWindows: [{ start: '20:30', end: '22:30' }],
    pickupPin: 'Epic Universe ride-share pickup, Destination Pkwy side of the main parking structure',
    stagingTip: 'Exit traffic stacks on Destination Pkwy. Stage south near Sand Lake Rd and approach late.',
  },
  {
    id: 'citywalk',
    name: 'Universal CityWalk',
    short: 'CityWalk',
    corridor: 'Universal',
    area: 'Universal',
    lat: 28.4741,
    lng: -81.4679,
    x: 500,
    y: 270,
    surge: '1.3x – 1.9x',
    primeHours: '8:30–10:30p park close · 1–2:30a bar close',
    primeWindows: [
      { start: '20:30', end: '22:30' },
      { start: '01:00', end: '02:30' },
    ],
    pickupPin: 'Universal parking garage, ride-share level (follow "Ride Share" signs from CityWalk)',
    stagingTip: 'After park close, hotel shuttles thin out by 10:15p. That is your second wave.',
  },
  {
    id: 'disney-ttc',
    name: 'Disney TTC (Magic Kingdom)',
    short: 'TTC',
    corridor: 'Disney',
    area: 'Disney',
    lat: 28.4058,
    lng: -81.5784,
    x: 140,
    y: 520,
    surge: '1.5x – 2.4x',
    primeHours: 'Post-fireworks 9:15–11p',
    primeWindows: [{ start: '21:15', end: '23:00' }],
    pickupPin: 'Transportation & Ticket Center ride-share area, east side of the TTC bus loop',
    stagingTip: 'Riders need 30–45 min to reach the TTC after fireworks. Do not arrive at the first boom.',
  },
  {
    id: 'epcot',
    name: 'EPCOT',
    short: 'EPCOT',
    corridor: 'Disney',
    area: 'Disney',
    lat: 28.3747,
    lng: -81.5494,
    x: 220,
    y: 610,
    surge: '1.4x – 2.1x',
    primeHours: 'Nighttime show close 9–10:30p',
    primeWindows: [{ start: '21:00', end: '22:30' }],
    pickupPin: 'EPCOT main entrance ride-share lot, Epcot Center Dr (left lane past tolls)',
    stagingTip: 'International Gateway riders head to Boardwalk hotels. Front entrance is the money lot.',
  },
  {
    id: 'disney-springs',
    name: 'Disney Springs',
    short: 'Springs',
    corridor: 'Disney',
    area: 'Disney',
    lat: 28.3709,
    lng: -81.5194,
    x: 320,
    y: 570,
    surge: '1.2x – 1.7x',
    primeHours: '9–11:30p dinner & shows',
    primeWindows: [{ start: '21:00', end: '23:30' }],
    pickupPin: 'Disney Springs ride-share pickup, Lime Garage ground level (Buena Vista Dr side)',
    stagingTip: 'Solid filler between park waves. Short Lake Buena Vista hotel trips.',
  },
  {
    id: 'kia',
    name: 'Kia Center',
    short: 'Kia Center',
    corridor: 'Sports/Concerts',
    area: 'Downtown',
    lat: 28.5392,
    lng: -81.3839,
    x: 650,
    y: 150,
    surge: '1.6x – 2.5x',
    primeHours: 'Event let-out (usually 9:30–11:30p)',
    primeWindows: [{ start: '21:30', end: '23:30' }],
    pickupPin: 'Hughey Ave & Church St ride-share zone, south side of the arena',
    stagingTip: 'Police close Church St at let-out. Stage on Garland Ave and accept pings west of the arena.',
  },
  {
    id: 'downtown',
    name: 'Downtown Orlando (Church St / Wall St)',
    short: 'Downtown',
    corridor: 'Sports/Concerts',
    area: 'Downtown',
    lat: 28.5413,
    lng: -81.3787,
    x: 745,
    y: 110,
    surge: '1.3x – 2.0x',
    primeHours: 'Fri–Sat 11p–2:30a bar close',
    primeWindows: [{ start: '23:00', end: '02:30' }],
    pickupPin: 'Orange Ave & Wall St, ride-share pickup on the west curb of Orange Ave',
    stagingTip: 'Bar close at 2a floods Orange Ave. Grab a ping by 1:45a or stage on Magnolia Ave.',
  },
];

export const HUB_IDS = HUBS.map((h) => h.id);

export const DEFAULT_HUB_BY_CORRIDOR: Record<Corridor, string> = {
  OCCC: 'occc-west',
  Disney: 'disney-ttc',
  Universal: 'citywalk',
  'Sports/Concerts': 'kia',
  Other: 'downtown',
};

export function hubById(id: string): StagingHub | undefined {
  return HUBS.find((h) => h.id === id);
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}
