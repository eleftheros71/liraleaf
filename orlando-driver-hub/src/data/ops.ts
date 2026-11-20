// Static tactical playbooks: MCO flight waves, park egress, shift blueprints.
// Times are typical patterns in ET. Always confirm against live schedules.

export interface FlightBank {
  id: string;
  label: string;
  start: string;
  end: string;
  bay: 'Level 2' | 'Level 6';
  bayDetail: string;
  queueWait: string;
  carriers: string;
  note: string;
}

export interface Terminal {
  id: 'A' | 'B' | 'C';
  name: string;
  hubId: string;
  lat: number;
  lng: number;
  banks: FlightBank[];
}

export const TERMINALS: Terminal[] = [
  {
    id: 'A',
    name: 'Terminal A',
    hubId: 'mco-ab',
    lat: 28.4316,
    lng: -81.3076,
    banks: [
      { id: 'a1', label: 'Morning East Coast bank', start: '09:30', end: '11:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, A-side ride-app zone', queueWait: '15–30 min', carriers: 'Southwest, Delta, Frontier', note: 'Northeast arrivals with families. XL requests spike.' },
      { id: 'a2', label: 'Afternoon connector bank', start: '13:30', end: '15:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, A-side ride-app zone', queueWait: '25–45 min', carriers: 'Southwest, Spirit', note: 'Lighter bank. Good time to grab lunch in the lot.' },
      { id: 'a3', label: 'Evening peak bank', start: '17:30', end: '20:00', bay: 'Level 2', bayDetail: 'Level 2 outer curb, A-side ride-app zone', queueWait: '10–25 min', carriers: 'Southwest, Delta, Frontier, Spirit', note: 'Heaviest A-side wave. Disney and I-Drive hotel runs.' },
      { id: 'a4', label: 'Late redeye-feeder bank', start: '22:00', end: '00:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, A-side ride-app zone', queueWait: '5–15 min', carriers: 'Spirit, Frontier, Southwest', note: 'Short queue, long fares to Kissimmee and Lake Nona.' },
    ],
  },
  {
    id: 'B',
    name: 'Terminal B',
    hubId: 'mco-ab',
    lat: 28.4309,
    lng: -81.3087,
    banks: [
      { id: 'b1', label: 'Morning hub bank', start: '09:00', end: '11:00', bay: 'Level 2', bayDetail: 'Level 2 outer curb, B-side ride-app zone', queueWait: '15–30 min', carriers: 'American, United, Alaska', note: 'Business travelers to OCCC on convention weeks.' },
      { id: 'b2', label: 'Midday bank', start: '12:30', end: '14:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, B-side ride-app zone', queueWait: '20–40 min', carriers: 'American, United', note: 'Steady but slow. Stay only if the lot is under 80 cars.' },
      { id: 'b3', label: 'Evening hub bank', start: '18:00', end: '20:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, B-side ride-app zone', queueWait: '10–20 min', carriers: 'American, United, Alaska', note: 'Comfort and Black requests from corporate riders.' },
      { id: 'b4', label: 'Last West Coast bank', start: '22:30', end: '00:45', bay: 'Level 2', bayDetail: 'Level 2 outer curb, B-side ride-app zone', queueWait: '5–15 min', carriers: 'United, Alaska, American', note: 'Tired travelers, little price sensitivity.' },
    ],
  },
  {
    id: 'C',
    name: 'Terminal C',
    hubId: 'mco-c',
    lat: 28.4143,
    lng: -81.3009,
    banks: [
      { id: 'c1', label: 'European morning bank', start: '10:30', end: '12:30', bay: 'Level 6', bayDetail: 'Level 6 GTC ride-app pickup', queueWait: '20–35 min', carriers: 'JetBlue, British Airways, Virgin Atlantic', note: 'Customs adds 45–75 min. Late-bank pings are the long-haul riders.' },
      { id: 'c2', label: 'Afternoon international bank', start: '13:00', end: '15:00', bay: 'Level 6', bayDetail: 'Level 6 GTC ride-app pickup', queueWait: '15–30 min', carriers: 'Lufthansa, Aer Lingus, Latin American carriers', note: 'Heavy luggage. XL and Comfort pay off here.' },
      { id: 'c3', label: 'Evening JetBlue bank', start: '18:00', end: '21:00', bay: 'Level 6', bayDetail: 'Level 6 GTC ride-app pickup', queueWait: '10–20 min', carriers: 'JetBlue, Southwest overflow, international', note: 'Biggest C wave. Universal and Epic hotel runs.' },
      { id: 'c4', label: 'Late arrivals', start: '22:30', end: '00:30', bay: 'Level 2', bayDetail: 'Level 2 overflow curb (when Level 6 is coned off)', queueWait: '5–15 min', carriers: 'JetBlue, Caribbean routes', note: 'Watch for overflow signage. The pickup pin may move.' },
    ],
  },
];

export const MCO_RULES: string[] = [
  'Wait only in the designated ride-app waiting lot off Jeff Fuqua Blvd. Curb idling and loops get ticketed.',
  'Accept the ping first, then drive to the assigned curb. Never pick up a rider who did not request through the app.',
  'Display your Uber/Lyft trade dress on the front windshield while on airport property.',
  'Pick up only at the posted ride-app zone for the terminal the app assigns (Level 2 for A/B, Level 6 GTC for C unless signed otherwise).',
  'An airport access fee is added to every pickup. Do not collect cash or extra fees from riders.',
  'Do not leave the vehicle unattended at the curb. Load and go within the posted dwell time.',
  'Follow GOAA and police traffic directions. They override the app pin.',
];

export interface ParkEgress {
  id: string;
  park: string;
  hubId: string;
  close: string; // HH:MM ET
  show: string; // nightly show start HH:MM
  showName: string;
  surge: string;
  staging: string;
  lat: number;
  lng: number;
  tips: string[];
}

export const PARKS: ParkEgress[] = [
  {
    id: 'mk',
    park: 'Magic Kingdom',
    hubId: 'disney-ttc',
    close: '22:00',
    show: '21:00',
    showName: 'Nighttime fireworks',
    surge: '1.6x – 2.4x',
    staging: 'TTC ride-share area (east bus loop). Stage at the Grand Floridian / Seven Seas Dr area beforehand.',
    lat: 28.4058,
    lng: -81.5784,
    tips: [
      'Guests take the monorail or ferry to the TTC. First real wave lands 30–45 min after fireworks end.',
      'World Dr backs up at the toll plaza. Enter via Seven Seas Dr if possible.',
      'XL demand is huge here. Families with strollers. Flip to XL if your car qualifies.',
    ],
  },
  {
    id: 'epcot',
    park: 'EPCOT',
    hubId: 'epcot',
    close: '21:00',
    show: '21:00',
    showName: 'Nighttime spectacular',
    surge: '1.4x – 2.1x',
    staging: 'EPCOT front entrance ride-share lot (Epcot Center Dr, left lanes past the toll).',
    lat: 28.3747,
    lng: -81.5494,
    tips: [
      'Show ends around 9:15p. Exit wave peaks 9:25–10:00p.',
      'International Gateway riders walk to Boardwalk and Yacht Club. Skip that side.',
      'Festival seasons (Food & Wine, Festival of the Holidays) extend demand past close.',
    ],
  },
  {
    id: 'hs',
    park: 'Disney Hollywood Studios',
    hubId: 'epcot',
    close: '21:00',
    show: '20:30',
    showName: 'Evening show & fireworks',
    surge: '1.3x – 2.0x',
    staging: 'Hollywood Studios ride-share drop-off and pickup area, Studios Dr off Osceola Pkwy.',
    lat: 28.3575,
    lng: -81.5583,
    tips: [
      'Smaller lot, faster turnover. Good alternative when EPCOT is saturated.',
      'Skyliner riders head to resorts, not your car. Focus on the front gate.',
      'Osceola Pkwy toward I-4 clears faster than World Dr.',
    ],
  },
  {
    id: 'usf',
    park: 'Universal Studios & CityWalk',
    hubId: 'citywalk',
    close: '21:00',
    show: '20:45',
    showName: 'Nighttime lagoon show',
    surge: '1.3x – 1.9x',
    staging: 'Universal parking garage ride-share level. Stage on Vineland Rd / Kirkman Rd before close.',
    lat: 28.4741,
    lng: -81.4679,
    tips: [
      'CityWalk keeps a second wave alive until 2a bar close.',
      'Hotel guests at Cabana Bay and Aventura walk or shuttle. Your riders are off-property.',
      'On Halloween Horror Nights dates, demand runs 11p–2a. Check the calendar.',
    ],
  },
];

export interface ShiftStep {
  start: string;
  end: string;
  title: string;
  hubId: string;
  detail: string;
}

export interface ShiftBlueprint {
  id: string;
  name: string;
  tagline: string;
  hours: number;
  baseGross: number; // UberX baseline gross for the whole shift
  steps: ShiftStep[];
}

export const VEHICLE_TIERS = [
  { id: 'x', label: 'UberX', mult: 1.0 },
  { id: 'comfort', label: 'Comfort', mult: 1.22 },
  { id: 'xl', label: 'UberXL', mult: 1.42 },
  { id: 'black', label: 'Premier / Black', mult: 1.78 },
] as const;
export type VehicleTierId = (typeof VEHICLE_TIERS)[number]['id'];

export const SHIFTS: ShiftBlueprint[] = [
  {
    id: 'exec',
    name: 'Executive Airport & Convention Peak',
    tagline: 'Business travelers, OCCC show traffic, corporate hotel runs.',
    hours: 9,
    baseGross: 285,
    steps: [
      { start: '06:30', end: '09:00', title: 'OCCC inbound rush', hubId: 'occc-ns', detail: 'I-Drive hotels to the convention center. Short trips, fast cycles.' },
      { start: '09:00', end: '11:30', title: 'MCO morning bank', hubId: 'mco-ab', detail: 'Drop near the airport, join the waiting lot, take A/B morning arrivals.' },
      { start: '11:30', end: '13:00', title: 'Reposition & break', hubId: 'occc-west', detail: 'Eat and charge. Head back toward I-Drive by 12:45.' },
      { start: '13:00', end: '15:30', title: 'Terminal C international', hubId: 'mco-c', detail: 'Long-haul arrivals with luggage. Comfort/XL premiums.' },
      { start: '15:30', end: '16:30', title: 'Stage for show close', hubId: 'occc-west', detail: 'Wait near Pointe Orlando. Move into the West Concourse lane at 4:20.' },
      { start: '16:30', end: '18:30', title: 'Convention exit wave', hubId: 'occc-west', detail: 'Attendees to MCO and hotels. Chain airport runs into the evening bank.' },
    ],
  },
  {
    id: 'parks',
    name: 'Theme Park Fireworks & Nightlife Surge',
    tagline: 'Park closings, fireworks egress, Disney Springs and CityWalk.',
    hours: 8,
    baseGross: 260,
    steps: [
      { start: '16:00', end: '18:00', title: 'Hotel-to-dinner drops', hubId: 'disney-springs', detail: 'Lake Buena Vista hotels to Disney Springs and I-Drive restaurants.' },
      { start: '18:00', end: '20:30', title: 'MCO evening bank', hubId: 'mco-ab', detail: 'Arrivals to Disney resorts put you on the west side for close.' },
      { start: '20:30', end: '21:30', title: 'EPCOT / Studios close', hubId: 'epcot', detail: 'Stage at the EPCOT front lot. Take the first show-exit pings.' },
      { start: '21:30', end: '23:00', title: 'Magic Kingdom fireworks egress', hubId: 'disney-ttc', detail: 'TTC wave peaks 30–45 min after fireworks. Highest surge of the night.' },
      { start: '23:00', end: '00:00', title: 'Disney Springs late', hubId: 'disney-springs', detail: 'Late dinner crowd heading to Kissimmee and I-Drive hotels.' },
    ],
  },
  {
    id: 'late',
    name: 'Weekend Late Night Surge Hunter',
    tagline: 'Arena let-outs, bar close downtown, CityWalk, late MCO.',
    hours: 7,
    baseGross: 245,
    steps: [
      { start: '20:00', end: '21:30', title: 'Pre-event & dinner drops', hubId: 'downtown', detail: 'Restaurants and hotels into Downtown and the Kia Center.' },
      { start: '21:30', end: '23:30', title: 'Arena let-out', hubId: 'kia', detail: 'Stage on Garland Ave. Accept pings west of the arena when police close Church St.' },
      { start: '23:30', end: '00:45', title: 'Late MCO bank', hubId: 'mco-ab', detail: 'Short airport queue, long fares to the tourist corridor.' },
      { start: '00:45', end: '02:00', title: 'CityWalk bar close', hubId: 'citywalk', detail: 'CityWalk clubs empty 1:30–2a. Garage ride-share level.' },
      { start: '02:00', end: '03:00', title: 'Downtown bar close', hubId: 'downtown', detail: 'Orange Ave floods at 2a. Grab a ping by 2:15 or stage on Magnolia Ave.' },
    ],
  },
];

export function shiftEarnings(shift: ShiftBlueprint, tierMult: number, costs: number) {
  const gross = Math.round(shift.baseGross * tierMult);
  const net = Math.round(gross - Math.max(0, costs));
  const perHour = shift.hours > 0 ? net / shift.hours : 0;
  return { gross, net, perHour };
}
