/**
 * IAAC Academic Diplomas and Modules Configuration
 */

export const OFFICIAL_DIPLOMAS = [
  {
    id: 'Cabin Crew',
    name: 'Cabin Crew',
    code: 'CC',
    description: 'Diploma in Cabin Crew Operations',
  },
  {
    id: 'Ground Operations',
    name: 'Ground Operations',
    code: 'GO',
    description: 'Diploma in Airport Ground Operations',
  },
  {
    id: 'Ticketing & Reservations',
    name: 'Ticketing & Reservations',
    code: 'TR',
    description: 'Diploma in Airline Ticketing & Global Distribution Systems',
  },
  {
    id: 'Air Cargo',
    name: 'Air Cargo',
    code: 'AC',
    description: 'Diploma in Air Cargo & Logistics Management',
  },
];

export const DEFAULT_DIPLOMA_MODULES = {
  'Cabin Crew': [
    'Aviation Safety & Emergency Procedures',
    'Crew Resource Management & Human Factors',
    'In-Flight Service & Passenger Care',
    'Aviation First Aid & Medical Emergencies',
    'Aircraft Familiarization & General Knowledge',
    'Aviation Security & Dangerous Goods',
  ],
  'Ground Operations': [
    'Passenger Handling & Check-In Operations',
    'Ramp Operations & Airside Safety',
    'Baggage Handling & Load Control',
    'Aviation Security & Dangerous Goods Regulations',
    'Airport Operations & Customer Service',
  ],
  'Ticketing & Reservations': [
    'Global Distribution Systems (GDS) & Fare Construction',
    'Airline Reservation Procedures',
    'Electronic Ticketing & E-Commerce',
    'Travel Documentation & Visa Regulations',
    'Aviation Customer Care & Communication',
  ],
  'Air Cargo': [
    'Air Cargo Fundamentals & Handling',
    'Dangerous Goods Regulations (DGR)',
    'Cargo Rating & Documentation (Air Waybill)',
    'Supply Chain & Logistics Operations',
    'Air Cargo Security & Customs Clearance',
  ],
};

export function canonicalDiploma(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return '';

  if (v.includes('cabin')) return 'Cabin Crew';
  if (v.includes('ground')) return 'Ground Operations';
  if (v.includes('ticket') || v.includes('reservation')) return 'Ticketing & Reservations';
  if (v.includes('cargo')) return 'Air Cargo';

  return String(value || '').trim();
}

export function getRequiredModules(diploma) {
  const canon = canonicalDiploma(diploma);
  return DEFAULT_DIPLOMA_MODULES[canon] || [];
}

