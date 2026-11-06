// LiraLeaf species catalogue — general horticultural guidance written for this project.
// waterDays: baseline summer interval for a ~14 cm plastic pot in medium light.
// light: preferred light (low | medium | bright | direct). humidity: normal | high.
// fertilizeDays: growing-season interval. repotMonths: typical repot cycle.
// dormantWinter: growth largely stops in winter (water less, no feeding).
export const SPECIES = [
  { id: 'monstera', name: 'Swiss cheese plant', latin: 'Monstera deliciosa', light: 'bright', waterDays: 8, fertilizeDays: 21, repotMonths: 24, humidity: 'high', dormantWinter: false, cleanDays: 21 },
  { id: 'pothos', name: 'Golden pothos', latin: 'Epipremnum aureum', light: 'medium', waterDays: 8, fertilizeDays: 28, repotMonths: 24, humidity: 'normal', dormantWinter: false, cleanDays: 30 },
  { id: 'snake', name: 'Snake plant', latin: 'Dracaena trifasciata', light: 'medium', waterDays: 18, fertilizeDays: 42, repotMonths: 36, humidity: 'normal', dormantWinter: true, cleanDays: 30 },
  { id: 'zz', name: 'ZZ plant', latin: 'Zamioculcas zamiifolia', light: 'low', waterDays: 18, fertilizeDays: 42, repotMonths: 36, humidity: 'normal', dormantWinter: true, cleanDays: 30 },
  { id: 'fiddle', name: 'Fiddle-leaf fig', latin: 'Ficus lyrata', light: 'bright', waterDays: 9, fertilizeDays: 21, repotMonths: 24, humidity: 'normal', dormantWinter: false, cleanDays: 14 },
  { id: 'peace', name: 'Peace lily', latin: 'Spathiphyllum wallisii', light: 'low', waterDays: 6, fertilizeDays: 35, repotMonths: 18, humidity: 'high', dormantWinter: false, cleanDays: 21 },
  { id: 'spider', name: 'Spider plant', latin: 'Chlorophytum comosum', light: 'medium', waterDays: 7, fertilizeDays: 28, repotMonths: 18, humidity: 'normal', dormantWinter: false, cleanDays: 30 },
  { id: 'calathea', name: 'Prayer plant', latin: 'Goeppertia spp.', light: 'medium', waterDays: 5, fertilizeDays: 28, repotMonths: 18, humidity: 'high', dormantWinter: false, cleanDays: 21 },
  { id: 'aloe', name: 'Aloe vera', latin: 'Aloe vera', light: 'direct', waterDays: 16, fertilizeDays: 60, repotMonths: 30, humidity: 'normal', dormantWinter: true, cleanDays: 45, soil: 'cactus' },
  { id: 'echeveria', name: 'Echeveria', latin: 'Echeveria spp.', light: 'direct', waterDays: 14, fertilizeDays: 60, repotMonths: 24, humidity: 'normal', dormantWinter: true, cleanDays: 60, soil: 'cactus' },
  { id: 'phalaenopsis', name: 'Moth orchid', latin: 'Phalaenopsis spp.', light: 'medium', waterDays: 8, fertilizeDays: 14, repotMonths: 24, humidity: 'high', dormantWinter: false, cleanDays: 30, soil: 'bark' },
  { id: 'rubber', name: 'Rubber plant', latin: 'Ficus elastica', light: 'bright', waterDays: 10, fertilizeDays: 28, repotMonths: 24, humidity: 'normal', dormantWinter: false, cleanDays: 14 },
  { id: 'fern', name: 'Boston fern', latin: 'Nephrolepis exaltata', light: 'medium', waterDays: 4, fertilizeDays: 35, repotMonths: 18, humidity: 'high', dormantWinter: false, cleanDays: 60 },
  { id: 'basil', name: 'Basil', latin: 'Ocimum basilicum', light: 'direct', waterDays: 3, fertilizeDays: 14, repotMonths: 12, humidity: 'normal', dormantWinter: false, cleanDays: 60 },
  { id: 'tomato', name: 'Tomato', latin: 'Solanum lycopersicum', light: 'direct', waterDays: 2, fertilizeDays: 10, repotMonths: 12, humidity: 'normal', dormantWinter: false, cleanDays: 60 },
  { id: 'lavender', name: 'Lavender', latin: 'Lavandula angustifolia', light: 'direct', waterDays: 10, fertilizeDays: 60, repotMonths: 24, humidity: 'normal', dormantWinter: true, cleanDays: 60 },
];

export const byId = (id) => SPECIES.find((s) => s.id === id);
