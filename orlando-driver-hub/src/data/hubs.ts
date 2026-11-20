import type { Area, Corridor } from '../types';

export interface StagingHub {
  id: string;
  name: string;
  short: string;
  corridor: Corridor;
  area: Exclude<Area, 'Other'>;
  lat: number;
  lng: number;
  surge: string;
  primeHours: string;
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
    surge: '1.3x – 1.8x',
    primeHours: '9:30–11:30a · 5:30–8p · 10p–12:30a',
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
    surge: '1.4x – 2.0x',
    primeHours: '1–3p · 6–9p international bank',
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
    surge: '1.5x – 2.2x',
    primeHours: '7–9a inbound · 4:30–6:30p show close',
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
    surge: '1.4x – 2.0x',
    primeHours: '7–9a inbound · 5–7p show close',
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
    surge: '1.4x – 2.1x',
    primeHours: 'Park close ±45 min (usually 9–10p)',
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
    surge: '1.3x – 1.9x',
    primeHours: '8:30–10:30p park close · 1–2:30a bar close',
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
    surge: '1.5x – 2.4x',
    primeHours: 'Post-fireworks 9:15–11p',
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
    surge: '1.4x – 2.1x',
    primeHours: 'Nighttime show close 9–10:30p',
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
    surge: '1.2x – 1.7x',
    primeHours: '9–11:30p dinner & shows',
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
    surge: '1.6x – 2.5x',
    primeHours: 'Event let-out (usually 9:30–11:30p)',
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
    surge: '1.3x – 2.0x',
    primeHours: 'Fri–Sat 11p–2:30a bar close',
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
