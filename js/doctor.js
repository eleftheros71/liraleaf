// Rules-based plant doctor. Combines a symptom with what we know about the plant
// (pot, drainage, light, watering history) to rank likely causes.
import { LIGHT, lastEvent, daysBetween } from './care.js';

export const SYMPTOMS = {
  yellow: 'Yellow lower leaves',
  brownTips: 'Brown, crispy leaf tips',
  droop: 'Drooping / wilting',
  leggy: 'Long, stretched stems',
  spots: 'Dark or wet-looking spots',
  pests: 'Tiny bugs or webbing',
  noGrowth: 'No new growth',
};

export function diagnose(symptom, plant, species, site = {}, now = new Date()) {
  const causes = [];
  const add = (score, cause, fix) => causes.push({ score, cause, fix });
  const lw = lastEvent(plant, 'water');
  const sinceWater = lw ? daysBetween(lw.at, now) : null;
  const light = LIGHT[site.light] ?? 2, need = LIGHT[species.light] ?? 2;

  switch (symptom) {
    case 'yellow':
      add(plant.drainage === false ? 3 : 2, 'Overwatering / soggy roots', 'Let the top few cm dry out; make sure the pot drains.');
      add(light < need ? 2 : 0.5, 'Not enough light', 'Move closer to a window.');
      add(1, 'Nutrient shortage', 'Feed during the growing season.');
      break;
    case 'brownTips':
      add(species.humidity === 'high' && !site.outdoor ? 3 : 1, 'Dry air', 'Mist, group plants, or use a pebble tray.');
      add(sinceWater != null && sinceWater > species.waterDays * 1.5 ? 2 : 0.5, 'Soil dried out too far', 'Water more consistently.');
      add(1, 'Salt build-up from fertilizer/tap water', 'Flush the soil with plenty of water.');
      break;
    case 'droop':
      add(sinceWater != null && sinceWater > species.waterDays ? 3 : 1, 'Thirsty', 'Water thoroughly now.');
      add(plant.drainage === false ? 2.5 : 1, 'Root rot from waterlogging', 'Check roots; repot into fresh, draining soil.');
      add(site.outdoor ? 1.5 : 0.5, 'Heat stress', 'Give afternoon shade.');
      break;
    case 'leggy':
      add(light < need ? 3 : 1, 'Too little light', `Needs ${species.light} light; this spot is ${site.light || 'medium'}.`);
      add(1, 'Needs pruning', 'Pinch back stems to encourage bushiness.');
      break;
    case 'spots':
      add(2.5, 'Fungal / bacterial leaf spot', 'Remove affected leaves; water the soil, not the leaves; improve airflow.');
      add(light > need ? 1.5 : 0.3, 'Sunburn', 'Filter direct sun.');
      break;
    case 'pests':
      add(3, 'Spider mites, mealybugs or thrips', 'Isolate the plant; shower leaves; treat with insecticidal soap.');
      add(species.humidity === 'high' ? 1 : 0.5, 'Dry, warm air favours mites', 'Raise humidity.');
      break;
    case 'noGrowth':
      add(light < need ? 2.5 : 1, 'Too little light', 'Move to a brighter spot.');
      add(species.dormantWinter ? 2 : 0.5, 'Seasonal rest', 'Normal in winter; growth resumes in spring.');
      add(1.5, 'Root-bound', 'Check if roots circle the pot; repot if needed.');
      break;
  }
  return causes.filter((c) => c.score >= 0.5).sort((a, b) => b.score - a.score);
}
