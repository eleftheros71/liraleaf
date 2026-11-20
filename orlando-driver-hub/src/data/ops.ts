// Static playbooks: MCO flight waves, park egress and other recurring demand windows.
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
  /** 0-100 baseline demand strength used by the Now ranking. */
  strength: number;
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
      { id: 'a1', strength: 56, label: 'Morning East Coast bank', start: '09:30', end: '11:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, A-side ride-app zone', queueWait: '15–30 min', carriers: 'Southwest, Delta, Frontier', note: 'Northeast arrivals with families. XL requests spike.' },
      { id: 'a2', strength: 42, label: 'Afternoon connector bank', start: '13:30', end: '15:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, A-side ride-app zone', queueWait: '25–45 min', carriers: 'Southwest, Spirit', note: 'Lighter bank. Good time to grab lunch in the lot.' },
      { id: 'a3', strength: 64, label: 'Evening peak bank', start: '17:30', end: '20:00', bay: 'Level 2', bayDetail: 'Level 2 outer curb, A-side ride-app zone', queueWait: '10–25 min', carriers: 'Southwest, Delta, Frontier, Spirit', note: 'Heaviest A-side wave. Disney and I-Drive hotel runs.' },
      { id: 'a4', strength: 58, label: 'Late redeye-feeder bank', start: '22:00', end: '00:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, A-side ride-app zone', queueWait: '5–15 min', carriers: 'Spirit, Frontier, Southwest', note: 'Short queue, long fares to Kissimmee and Lake Nona.' },
    ],
  },
  {
    id: 'B',
    name: 'Terminal B',
    hubId: 'mco-ab',
    lat: 28.4309,
    lng: -81.3087,
    banks: [
      { id: 'b1', strength: 55, label: 'Morning hub bank', start: '09:00', end: '11:00', bay: 'Level 2', bayDetail: 'Level 2 outer curb, B-side ride-app zone', queueWait: '15–30 min', carriers: 'American, United, Alaska', note: 'Business travelers to OCCC on convention weeks.' },
      { id: 'b2', strength: 42, label: 'Midday bank', start: '12:30', end: '14:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, B-side ride-app zone', queueWait: '20–40 min', carriers: 'American, United', note: 'Steady but slow. Stay only if the lot is under 80 cars.' },
      { id: 'b3', strength: 62, label: 'Evening hub bank', start: '18:00', end: '20:30', bay: 'Level 2', bayDetail: 'Level 2 outer curb, B-side ride-app zone', queueWait: '10–20 min', carriers: 'American, United, Alaska', note: 'Comfort and Black requests from corporate riders.' },
      { id: 'b4', strength: 57, label: 'Last West Coast bank', start: '22:30', end: '00:45', bay: 'Level 2', bayDetail: 'Level 2 outer curb, B-side ride-app zone', queueWait: '5–15 min', carriers: 'United, Alaska, American', note: 'Tired travelers, little price sensitivity.' },
    ],
  },
  {
    id: 'C',
    name: 'Terminal C',
    hubId: 'mco-c',
    lat: 28.4143,
    lng: -81.3009,
    banks: [
      { id: 'c1', strength: 52, label: 'European morning bank', start: '10:30', end: '12:30', bay: 'Level 6', bayDetail: 'Level 6 GTC ride-app pickup', queueWait: '20–35 min', carriers: 'JetBlue, British Airways, Virgin Atlantic', note: 'Customs adds 45–75 min. Late-bank pings are the long-haul riders.' },
      { id: 'c2', strength: 54, label: 'Afternoon international bank', start: '13:00', end: '15:00', bay: 'Level 6', bayDetail: 'Level 6 GTC ride-app pickup', queueWait: '15–30 min', carriers: 'Lufthansa, Aer Lingus, Latin American carriers', note: 'Heavy luggage. XL and Comfort pay off here.' },
      { id: 'c3', strength: 63, label: 'Evening JetBlue bank', start: '18:00', end: '21:00', bay: 'Level 6', bayDetail: 'Level 6 GTC ride-app pickup', queueWait: '10–20 min', carriers: 'JetBlue, Southwest overflow, international', note: 'Biggest C wave. Universal and Epic hotel runs.' },
      { id: 'c4', strength: 50, label: 'Late arrivals', start: '22:30', end: '00:30', bay: 'Level 2', bayDetail: 'Level 2 overflow curb (when Level 6 is coned off)', queueWait: '5–15 min', carriers: 'JetBlue, Caribbean routes', note: 'Watch for overflow signage. The pickup pin may move.' },
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
  strength: number;
}

export const PARKS: ParkEgress[] = [
  {
    id: 'mk',
    strength: 78,
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
    strength: 68,
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
    strength: 62,
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
    strength: 66,
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

export interface RecurringWindow {
  id: string;
  title: string;
  hubId: string;
  start: string;
  end: string;
  strength: number;
  /** Weekdays (0 = Sun) the window starts on. Omit for every day. */
  days?: number[];
  /** Only counts on dates with a convention in the weekly guide. */
  needsConvention?: boolean;
  note: string;
}

export const RECURRING: RecurringWindow[] = [
  { id: 'epic-close', title: 'Epic Universe closing', hubId: 'epic', start: '20:30', end: '22:30', strength: 64, note: 'Park close exit wave. Approach from Sand Lake Rd, not Destination Pkwy.' },
  { id: 'springs-night', title: 'Disney Springs dinner crowd', hubId: 'disney-springs', start: '21:00', end: '23:30', strength: 46, note: 'Steady short trips to Lake Buena Vista hotels. Good filler between waves.' },
  { id: 'citywalk-bars', title: 'CityWalk bar close', hubId: 'citywalk', start: '01:00', end: '02:30', strength: 60, days: [6, 0], note: 'Clubs empty 1:30–2a on Friday and Saturday nights.' },
  { id: 'downtown-bars', title: 'Downtown bar close', hubId: 'downtown', start: '01:15', end: '02:45', strength: 70, days: [6, 0], note: 'Orange Ave floods at 2a. Stage on Magnolia Ave and grab a ping by 2:15.' },
  { id: 'downtown-evening', title: 'Downtown nightlife build-up', hubId: 'downtown', start: '22:00', end: '00:30', strength: 50, days: [5, 6], note: 'Drop-offs into Church St and Wall St. Short trips, steady volume.' },
  { id: 'occc-morning', title: 'Convention morning inbound', hubId: 'occc-ns', start: '07:00', end: '09:00', strength: 58, needsConvention: true, note: 'I-Drive hotels to the convention center. Fast, short cycles.' },
  { id: 'occc-close', title: 'Convention show close', hubId: 'occc-west', start: '16:30', end: '18:30', strength: 66, needsConvention: true, note: 'Attendees to MCO and hotels. Chain the airport runs into the evening bank.' },
];
