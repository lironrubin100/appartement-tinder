// Test-only C2/C13 oracle. Production ranking must adopt it in SL07.1.
import { taxonomy, scoringContract, parseResidentFacts, parseResidentPreferences } from '../../web/src/lib/contracts/taxonomy.ts';

const unspecified = new Set(['flexible', 'varies', 'discuss', 'other']);
function ordinary(fact, preferences, field) {
  if (fact == null || unspecified.has(fact)) return null;
  const accepted = preferences[`accepted_${field}`] ?? [];
  const preferred = preferences[`preferred_${field}`] ?? [];
  if (!accepted.length) return null;
  if (!accepted.includes(fact)) return 0;
  return !preferred.length || preferred.includes(fact) ? 1 : 0.5;
}
function direction(category, facts, preferences) {
  if (category === 'R11') {
    if (preferences.pet_preference_answered !== true || facts.pets == null) return null;
    const pets = facts.pets.values;
    if (pets.includes('other')) return null;
    return pets.every(pet => (preferences.accepted_pet_types ?? []).includes(pet)) ? 1 : 0;
  }
  const values = taxonomy[category].fields.filter(field => !field.endsWith('_other')).map(field => {
    const fact = facts[field];
    if (fact != null && typeof fact === 'object') {
      if (!fact.values.length) return null;
      const fits = fact.values.map(value => ordinary(value, preferences, field));
      return fits.some(fit => fit == null) ? null : Math.min(...fits);
    }
    return ordinary(fact, preferences, field);
  });
  return values.some(value => value == null) ? null : Math.min(...values);
}
export function scorePair(left, right) {
  const a = { facts: parseResidentFacts(left.facts), preferences: parseResidentPreferences(left.preferences) };
  const b = { facts: parseResidentFacts(right.facts), preferences: parseResidentPreferences(right.preferences) };
  const factors = {};
  let count = 0, weight = 0, sum = 0;
  for (const [id, category] of Object.entries(taxonomy)) {
    if (!category.weight) continue;
    const ab = direction(id, b.facts, a.preferences), ba = direction(id, a.facts, b.preferences);
    const fit = ab == null || ba == null ? null : Math.min(ab, ba);
    factors[id] = fit;
    if (fit != null) { count++; weight += category.weight; sum += fit * category.weight; }
  }
  return {
    score: count >= scoringContract.minimumFactors && weight >= scoringContract.minimumWeight ? Math.round(100 * sum / weight) : null,
    scoring_version: scoringContract.version, comparable_category_count: count,
    comparable_weight: weight, possible_weight: scoringContract.possibleWeight, factors,
  };
}
export function scoreGroup(candidate, members) {
  const pairs = members.map(member => scorePair(candidate, member));
  return { score: pairs.length && pairs.every(pair => pair.score != null) ? Math.min(...pairs.map(pair => pair.score)) : null, pairs };
}
