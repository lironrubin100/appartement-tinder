// Approved C2 taxonomy v1. Runtime UI/SQL adoption is a separate packet.
export type Localized = Readonly<{ he: string; en: string }>;
type Options = Readonly<Record<string, Localized>>;
type Field =
  | { kind: 'enum' | 'set'; options: Options }
  | { kind: 'integer'; min: number; max: number }
  | { kind: 'text'; max: number }
  | { kind: 'boolean' | 'time' };
const label = (he: string, en: string): Localized => ({ he, en });
const yesNo = { yes: label('יש', 'Yes'), no: label('אין', 'No'), unknown: label('לא נמסר', 'Not provided') };
const guestOptions = { rare: label('לעיתים רחוקות', 'Rarely'), occasional: label('מדי פעם', 'Occasionally'), frequent: label('לעיתים קרובות', 'Frequently') };
const petOptions = { dog: label('כלב', 'Dog'), cat: label('חתול', 'Cat'), other: label('אחר', 'Other') };
export const residentFields = {
  cleanliness: { kind: 'enum', options: { very_tidy: label('נקי מאוד', 'Very tidy'), tidy_shared: label('סדר במרחב המשותף', 'Tidy shared spaces'), relaxed: label('גישה נינוחה', 'Relaxed') } },
  sleep_schedule: { kind: 'enum', options: { early: label('מוקדם', 'Early'), regular: label('שעות רגילות', 'Regular hours'), late: label('מאוחר', 'Late'), variable: label('משתנה', 'Variable') } },
  guests: { kind: 'enum', options: guestOptions },
  household_noise: { kind: 'enum', options: { quiet: label('שקט', 'Quiet'), moderate: label('רעש מתון', 'Moderate noise'), lively: label('בית תוסס', 'Lively home') } },
  music_habits: { kind: 'set', options: { headphones: label('אוזניות', 'Headphones'), background_speakers: label('רמקול ברקע', 'Background speakers'), social_music: label('מוזיקה באירוח', 'Music with guests') } },
  climate: { kind: 'enum', options: { cool_ac: label('מזגן קר', 'Cool AC'), moderate_ac: label('מיזוג מתון', 'Moderate AC'), windows: label('חלונות ואוויר', 'Windows and ventilation'), flexible: label('גמיש', 'Flexible') } },
  smoking: { kind: 'enum', options: { none: label('לא מעשנ/ת', 'Non-smoker'), outdoors_only: label('רק מחוץ לדירה', 'Outdoors only'), indoors: label('גם בתוך הדירה', 'Indoors too') } },
  kitchen_rules: { kind: 'enum', options: { no_special_rule: label('ללא כלל מיוחד', 'No special rule'), kosher: label('כשר', 'Kosher'), other: label('אחר', 'Other') } },
  kitchen_other: { kind: 'text', max: 160 },
  grocery_sharing: { kind: 'enum', options: { separate: label('בנפרד', 'Separate'), some_shared: label('חלק משותף', 'Some shared'), shared: label('קניות משותפות', 'Shared groceries') } },
  cooking_habits: { kind: 'set', options: { meal_prep: label('בישול מראש', 'Meal preparation'), takeaway: label('הזמנות אוכל', 'Takeaway'), shared_meals: label('ארוחות משותפות', 'Shared meals'), individual_cooking: label('בישול אישי', 'Individual cooking') } },
  pets: { kind: 'set', options: petOptions },
  pets_other: { kind: 'text', max: 80 },
  weekend_presence: { kind: 'enum', options: { home: label('לרוב בבית', 'Usually home'), away: label('לרוב מחוץ לבית', 'Usually away'), varies: label('משתנה', 'Varies') } },
  overnight_guests: { kind: 'enum', options: guestOptions },
  study_work_location: { kind: 'enum', options: { outside: label('מחוץ לבית', 'Outside home'), private_room: label('בחדר', 'Private room'), shared_space: label('במרחב המשותף', 'Shared space'), varies: label('משתנה', 'Varies') } },
  expense_style: { kind: 'enum', options: { equal: label('חלוקה שווה', 'Equal split'), usage: label('לפי שימוש', 'By usage'), discuss: label('מסכמים יחד', 'Discuss together') } },
  extended_absences: { kind: 'enum', options: { occasional: label('מדי פעם', 'Occasional'), frequent: label('לעיתים קרובות', 'Frequent'), not_expected: label('לא צפוי', 'Not expected'), undisclosed: label('מעדיפ/ה לא לציין', 'Prefer not to say') } },
} as const satisfies Record<string, Field>;
export const apartmentFields = {
  area_label: { kind: 'text', max: 200 }, city: { kind: 'text', max: 200 },
  ac_coverage: { kind: 'enum', options: { every_bedroom: label('כל חדר שינה', 'Every bedroom'), some_bedrooms: label('חלק מהחדרים', 'Some bedrooms'), shared_only: label('רק המרחב המשותף', 'Shared spaces only'), none: label('אין', 'None'), unknown: label('לא נמסר', 'Not provided') } },
  protected_space: { kind: 'enum', options: { in_unit: label('בדירה', 'In unit'), in_building: label('בבניין', 'In building'), nearby: label('בסביבה', 'Nearby'), none_known: label('לא ידוע על מרחב', 'None known'), unknown: label('לא נמסר', 'Not provided') } },
  window_bars: { kind: 'enum', options: yesNo },
  water_heating: { kind: 'set', options: { solar: label('שמש', 'Solar'), electric: label('חשמל', 'Electric'), gas: label('גז', 'Gas'), other: label('אחר', 'Other') } },
  furnishing: { kind: 'enum', options: { full: label('מלא', 'Full'), partial: label('חלקי', 'Partial'), none: label('ללא', 'None'), unknown: label('לא נמסר', 'Not provided') } },
  appliances: { kind: 'set', options: { fridge: label('מקרר', 'Fridge'), oven: label('תנור', 'Oven'), stove: label('כיריים', 'Stove'), washer: label('מכונת כביסה', 'Washer'), dryer: label('מייבש', 'Dryer'), dishwasher: label('מדיח', 'Dishwasher') } },
  outdoor_spaces: { kind: 'set', options: { balcony: label('מרפסת', 'Balcony'), private_yard: label('חצר פרטית', 'Private yard'), shared_yard: label('חצר משותפת', 'Shared yard'), shared_roof: label('גג משותף', 'Shared roof') } },
  washer_connection: { kind: 'enum', options: yesNo }, nearby_laundromat: { kind: 'enum', options: yesNo },
  floor: { kind: 'integer', min: -5, max: 100 }, elevator: { kind: 'enum', options: yesNo }, step_free_entry: { kind: 'enum', options: yesNo },
  accessibility_notes: { kind: 'text', max: 500 },
  parking: { kind: 'set', options: { reserved: label('פרטית שמורה', 'Reserved'), free_street: label('רחוב ללא תשלום', 'Free street parking'), paid_street: label('רחוב בתשלום', 'Paid street parking'), paid_lot: label('חניון בתשלום', 'Paid lot') } },
  pet_rule_known: { kind: 'boolean' }, allowed_pets: { kind: 'set', options: petOptions }, pet_restrictions: { kind: 'text', max: 250 },
  stove_type: { kind: 'enum', options: { gas: label('גז', 'Gas'), induction: label('אינדוקציה', 'Induction'), electric: label('חשמל', 'Electric'), none: label('אין', 'None'), unknown: label('לא נמסר', 'Not provided') } },
  internet_type: { kind: 'enum', options: { fiber: label('סיבים', 'Fiber'), cable_dsl: label('כבלים או DSL', 'Cable or DSL'), mobile: label('סלולרי', 'Mobile'), none: label('אין', 'None'), unknown: label('לא נמסר', 'Not provided') } },
  advertised_mbps: { kind: 'integer', min: 1, max: 10000 }, max_occupants: { kind: 'integer', min: 1, max: 30 },
} as const satisfies Record<string, Field>;

export type ResidentField = keyof typeof residentFields;
export type ApartmentField = keyof typeof apartmentFields;
export type CategoryId = `R${'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|'12'|'13'|'14'|'15'|'16'}` | `A${'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|'12'|'13'|'14'|'15'}`;
type Category = { label: Localized; fields: readonly (ResidentField | ApartmentField | 'bills')[]; weight: 0 | 1 | 2; state?: 'excluded' | 'deferred' };
export const taxonomy = {
  R01: { label: label('הרכב הבית', 'Household composition'), fields: [], weight: 0, state: 'excluded' },
  R02: { label: label('ניקיון במרחב המשותף', 'Shared-space cleanliness'), fields: ['cleanliness'], weight: 2 },
  R03: { label: label('שגרת שינה', 'Sleep schedule'), fields: ['sleep_schedule'], weight: 2 },
  R04: { label: label('אירוח וחברה', 'Social life and guests'), fields: ['guests'], weight: 2 },
  R05: { label: label('רעש ושקט בבית', 'Household noise'), fields: ['household_noise'], weight: 1 },
  R06: { label: label('האזנה למוזיקה בבית', 'Music at home'), fields: ['music_habits'], weight: 1 },
  R07: { label: label('מיזוג ואוורור', 'Cooling and ventilation'), fields: ['climate'], weight: 1 },
  R08: { label: label('הרגלי עישון', 'Smoking habits'), fields: ['smoking'], weight: 1 },
  R09: { label: label('כללי מטבח ושיתוף קניות', 'Kitchen and groceries'), fields: ['kitchen_rules', 'kitchen_other', 'grocery_sharing'], weight: 1 },
  R10: { label: label('הרגלי בישול', 'Cooking habits'), fields: ['cooking_habits'], weight: 1 },
  R11: { label: label('חיות שמגיעות איתי', 'Pets I bring'), fields: ['pets', 'pets_other'], weight: 1 },
  R12: { label: label('נוכחות בסוף השבוע', 'Weekends at home'), fields: ['weekend_presence'], weight: 1 },
  R13: { label: label('אורחי לילה', 'Overnight guests'), fields: ['overnight_guests'], weight: 0 },
  R14: { label: label('לימודים ועבודה מהבית', 'Study and work'), fields: ['study_work_location'], weight: 0 },
  R15: { label: label('חלוקת הוצאות משותפות', 'Shared expenses'), fields: ['expense_style'], weight: 1 },
  R16: { label: label('היעדרויות ממושכות', 'Extended absences'), fields: ['extended_absences'], weight: 0 },
  A01: { label: label('אזור וקרבה לקמפוס', 'Area and campus proximity'), fields: ['area_label', 'city'], weight: 0 },
  A02: { label: label('מיזוג אוויר', 'Air conditioning'), fields: ['ac_coverage'], weight: 0 },
  A03: { label: label('מרחב מוגן ואמצעים בדירה', 'Protected space and fixtures'), fields: ['protected_space', 'window_bars'], weight: 0 },
  A04: { label: label('חימום מים', 'Water heating'), fields: ['water_heating'], weight: 0 },
  A05: { label: label('ריהוט ומכשירים', 'Furnishing and appliances'), fields: ['furnishing', 'appliances'], weight: 0 },
  A06: { label: label('ציוד מהדייר היוצא', 'Items from outgoing resident'), fields: [], weight: 0, state: 'deferred' },
  A07: { label: label('שטח חוץ', 'Outdoor space'), fields: ['outdoor_spaces'], weight: 0 },
  A08: { label: label('כביסה', 'Laundry'), fields: ['washer_connection', 'nearby_laundromat'], weight: 0 },
  A09: { label: label('גישה לדירה', 'Access to apartment'), fields: ['floor', 'elevator', 'step_free_entry', 'accessibility_notes'], weight: 0 },
  A10: { label: label('חניה', 'Parking'), fields: ['parking'], weight: 0 },
  A11: { label: label('מדיניות חיות בדירה', 'Apartment pet policy'), fields: ['pet_rule_known', 'allowed_pets', 'pet_restrictions'], weight: 0 },
  A12: { label: label('אבזור מטבח', 'Kitchen equipment'), fields: ['stove_type'], weight: 0 },
  A13: { label: label('חשבונות ועלויות נוספות', 'Bills and additional costs'), fields: ['bills'], weight: 0 },
  A14: { label: label('תשתית אינטרנט', 'Internet infrastructure'), fields: ['internet_type', 'advertised_mbps'], weight: 0 },
  A15: { label: label('מספר דיירים מרבי', 'Maximum occupants'), fields: ['max_occupants'], weight: 0 },
} as const satisfies Record<CategoryId, Category>;
export const requiredResidentFields = ['cleanliness', 'sleep_schedule', 'guests', 'smoking'] as const satisfies readonly ResidentField[];
export const scoringContract = { version: 'taxonomy-v1', factors: 12, possibleWeight: 15, minimumFactors: 3, minimumWeight: 6 } as const;

export type AnsweredSet<T extends string = string> = { answered: true; values: T[] };
type Value<F extends Field> = F extends { kind: 'enum'; options: infer O } ? Exclude<keyof O, 'unknown'> :
  F extends { kind: 'set'; options: infer O } ? AnsweredSet<Extract<keyof O, string>> :
  F extends { kind: 'integer' } ? number : F extends { kind: 'boolean' } ? boolean : string;
export type Facts<D extends Readonly<Record<string, Field>>> = { [K in keyof D]?: Value<D[K]> | null };
export type ResidentFacts = Facts<typeof residentFields>;
export type ApartmentFacts = Facts<typeof apartmentFields>;
export class ContractError extends Error {
  field: string;
  constructor(field: string) { super(`VALIDATION_FAILED:${field}`); this.field = field; }
}
export const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
function parseField(field: Field, value: unknown, key: string): unknown {
  if (value === null) return null;
  switch (field.kind) {
    case 'enum':
      if (typeof value !== 'string' || !Object.hasOwn(field.options, value)) throw new ContractError(key);
      return value === 'unknown' ? null : value;
    case 'set': {
      if (!isRecord(value) || typeof value.answered !== 'boolean' || Object.keys(value).some(k => !['answered', 'values'].includes(k))) throw new ContractError(key);
      if (!value.answered) {
        if (value.values !== undefined && (!Array.isArray(value.values) || value.values.length)) throw new ContractError(key);
        return null;
      }
      if (!Array.isArray(value.values) || value.values.some(v => typeof v !== 'string' || !Object.hasOwn(field.options, v)) || new Set(value.values).size !== value.values.length) throw new ContractError(key);
      const selected = value.values as string[];
      return { answered: true, values: Object.keys(field.options).filter(k => selected.includes(k)) };
    }
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value) || value < field.min || value > field.max) throw new ContractError(key);
      return value;
    case 'boolean':
      if (typeof value !== 'boolean') throw new ContractError(key);
      return value;
    case 'text':
      if (typeof value !== 'string' || value.length > field.max) throw new ContractError(key);
      return value.trim();
    case 'time':
      if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new ContractError(key);
      return value;
  }
}
export function parseFacts<D extends Readonly<Record<string, Field>>>(definitions: D, input: unknown): Facts<D> {
  if (!isRecord(input)) throw new ContractError('facts');
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(definitions, key)) throw new ContractError(key);
    result[key] = parseField(definitions[key], value, key);
  }
  return result as Facts<D>;
}
export function parseResidentFacts(input: unknown, complete = false): ResidentFacts {
  const result = parseFacts(residentFields, input);
  if (complete) for (const key of requiredResidentFields) if (result[key] == null) throw new ContractError(key);
  if (result.kitchen_other && result.kitchen_rules !== 'other') throw new ContractError('kitchen_other');
  if (result.pets_other && !result.pets?.values.includes('other')) throw new ContractError('pets_other');
  return result;
}
export function parseApartmentFacts(input: unknown): ApartmentFacts {
  const result = parseFacts(apartmentFields, input);
  if (result.pet_rule_known !== true && result.allowed_pets != null) throw new ContractError('allowed_pets');
  if (result.pet_rule_known === true && result.allowed_pets == null) throw new ContractError('allowed_pets');
  return result;
}
// Projection requires explicit disclosure. Private preferences/identity are never keys here.
export function publicResidentFacts(input: unknown, disclosed: readonly string[]): ResidentFacts {
  const facts = parseResidentFacts(input);
  return Object.fromEntries(disclosed.filter(key => Object.hasOwn(residentFields, key) && Object.hasOwn(facts, key))
    .map(key => [key, facts[key as ResidentField]])) as ResidentFacts;
}
// Laundry and kitchen views reference canonical appliances instead of extra booleans.
export function applianceViews(facts: ApartmentFacts) {
  const values = facts.appliances?.values;
  return { washer: values ? values.includes('washer') : null, dryer: values ? values.includes('dryer') : null,
    dishwasher: values ? values.includes('dishwasher') : null, washer_connection: facts.washer_connection ?? null };
}

const scoredFields = Object.values(taxonomy).filter(c => c.weight > 0)
  .flatMap(c => [...c.fields]).filter((key): key is ResidentField => Object.hasOwn(residentFields, key) &&
    ['enum', 'set'].includes(residentFields[key as ResidentField].kind));
export function parseResidentPreferences(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) throw new ContractError('preferences');
  const result: Record<string, unknown> = {};
  const special = ['strict_non_smoking', 'strict_no_pets', 'pet_preference_answered', 'quiet_hours_from', 'quiet_hours_to'];
  const preferenceFields = scoredFields.filter(f => f !== 'pets');
  const keys = preferenceFields.flatMap(f => [`accepted_${f}`, `preferred_${f}`]);
  keys.push('accepted_pet_types');
  for (const [key, value] of Object.entries(input)) {
    if (special.includes(key)) {
      result[key] = parseField(key.startsWith('quiet_hours_') ? { kind: 'time' } : { kind: 'boolean' }, value, key);
    } else {
      if (!keys.includes(key)) throw new ContractError(key);
      const fieldKey = key === 'accepted_pet_types' ? 'pets' : key.replace(/^(accepted|preferred)_/, '') as ResidentField;
      const field = residentFields[fieldKey];
      if (!('options' in field) || !Array.isArray(value)) throw new ContractError(key);
      const parsed = parseField({ kind: 'set', options: field.options }, { answered: true, values: value }, key) as AnsweredSet;
      result[key] = parsed.values;
    }
  }
  for (const field of preferenceFields) {
    const accepted = (result[`accepted_${field}`] ?? []) as string[];
    const preferred = (result[`preferred_${field}`] ?? []) as string[];
    if (preferred.some(v => !accepted.includes(v))) throw new ContractError(`preferred_${field}`);
  }
  if ((result.quiet_hours_from != null) !== (result.quiet_hours_to != null)) throw new ContractError('quiet_hours');
  if (result.accepted_pet_types != null && result.pet_preference_answered !== true) throw new ContractError('pet_preference_answered');
  if (result.pet_preference_answered === true && result.accepted_pet_types == null) throw new ContractError('accepted_pet_types');
  return result;
}

export const billKeys = ['electricity', 'water', 'arnona', 'building_fee', 'internet'] as const;
export const billLabels = {
  electricity: label('חשמל', 'Electricity'), water: label('מים', 'Water'), arnona: label('ארנונה', 'Municipal tax'),
  building_fee: label('ועד בית', 'Building fee'), internet: label('אינטרנט', 'Internet'),
} as const;
export const billStatusLabels = { included: label('כלול', 'Included'), separate: label('בנפרד', 'Separate'), unknown: label('לא נמסר', 'Not provided') };
type Bill = { status: 'included' | 'separate' | null; monthly_estimate?: number | null };
export function parseBills(input: unknown): Partial<Record<typeof billKeys[number], Bill>> {
  if (!isRecord(input)) throw new ContractError('bills');
  const result: Partial<Record<typeof billKeys[number], Bill>> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!(billKeys as readonly string[]).includes(key) || !isRecord(value) || Object.keys(value).some(k => !['status', 'monthly_estimate'].includes(k))) throw new ContractError(key);
    const status = value.status === 'unknown' || value.status === null ? null : value.status;
    if (status !== null && status !== 'included' && status !== 'separate') throw new ContractError(key);
    const amount = value.monthly_estimate;
    if (amount != null && (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 100000)) throw new ContractError(key);
    result[key as typeof billKeys[number]] = { status, ...(amount !== undefined ? { monthly_estimate: amount as number | null } : {}) };
  }
  return result;
}
export function billsIncluded(bills: ReturnType<typeof parseBills>): boolean | null {
  const statuses = billKeys.map(key => bills[key]?.status ?? null);
  if (statuses.every(status => status === 'included')) return true;
  if (statuses.some(status => status === 'separate')) return false;
  return null;
}

// Only unambiguous legacy meanings migrate automatically. No identity facts are
// reinterpreted as overnight visits, absences, or new matching preferences.
export function adaptLegacyTags(input: unknown): { facts: ResidentFacts; needsReview: string[] } {
  if (!isRecord(input)) throw new ContractError('legacy_tags');
  const maps: Record<string, { field: ResidentField; values: Record<string, unknown> }> = {
    cleanliness: { field: 'cleanliness', values: { very_clean: 'very_tidy', relaxed: 'relaxed' } },
    sleep_schedule: { field: 'sleep_schedule', values: { early_bed_early_wake: 'early', night_owl: 'late' } },
    social_guests: { field: 'guests', values: { frequent_visitors: 'frequent', occasional: 'occasional', rarely: 'rare' } },
    smoking: { field: 'smoking', values: { no: 'none', outdoor_only: 'outdoors_only' } },
    pets: { field: 'pets', values: { no: { answered: true, values: [] } } },
  };
  const facts: Record<string, unknown> = {};
  const needsReview: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value == null || value === '') continue;
    const mapping = Object.hasOwn(maps, key) ? maps[key] : undefined;
    if (!mapping || typeof value !== 'string' || !Object.hasOwn(mapping.values, value)) { needsReview.push(key); continue; }
    facts[mapping.field] = structuredClone(mapping.values[value]);
  }
  return { facts: parseResidentFacts(facts), needsReview };
}

/** Render an already public projection; never infer disclosure from own facts. */
export function localizedResidentFacts(input: unknown, locale: 'he' | 'en') {
  let facts: ResidentFacts;
  try { facts = parseResidentFacts(input); } catch { return []; }
  const output: { field: ResidentField; label: string; referenceValue: string | null }[] = [];
  for (const [field, definition] of Object.entries(residentFields)) {
    const key = field as ResidentField;
    const value = facts[key];
    if (value == null) continue;
    const category = Object.entries(taxonomy).find(([id, c]) => id.startsWith('R') && (c.fields as readonly string[]).includes(key))?.[1];
    if (!category) continue;
    const prefix = category.label[locale];
    if (definition.kind === 'enum' && typeof value === 'string') {
      const option = (definition.options as Options)[value];
      if (option) output.push({ field: key, label: `${prefix}: ${option[locale]}`, referenceValue: value });
    } else if (definition.kind === 'set' && typeof value === 'object') {
      if (!value.values.length) output.push({ field: key, label: `${prefix}: ${locale === 'en' ? 'None' : 'אין'}`, referenceValue: null });
      for (const item of value.values) {
        const option = (definition.options as Options)[item];
        if (option) output.push({ field: key, label: `${prefix}: ${option[locale]}`, referenceValue: item });
      }
    } else if (definition.kind === 'text' && typeof value === 'string' && value.trim()) {
      output.push({ field: key, label: `${prefix}: ${value}`, referenceValue: null });
    }
  }
  return output;
}
