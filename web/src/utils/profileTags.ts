export type TagKey =
  | 'gender_dynamic'
  | 'cleanliness'
  | 'sleep_schedule'
  | 'social_guests'
  | 'noise_tolerance'
  | 'music_vibe'
  | 'climate'
  | 'smoking'
  | 'kitchen_dietary'
  | 'cooking_dynamics'
  | 'pets'
  | 'weekend_routine'
  | 'relationship_status'
  | 'study_habits'
  | 'financial_splitting'
  | 'miluim_reserve_duty';

export interface TagCategory {
  key: TagKey;
  label: string;
  options: { value: string; label: string }[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    key: 'gender_dynamic',
    label: 'דינמיקת מגדר',
    options: [
      { value: '1_guy_guys', label: 'בחור אחד + בנים' },
      { value: '2_girls_1_girl', label: '2 בנות + בחורה' },
      { value: 'coed_anyone', label: 'מעורב, לא משנה' },
    ],
  },
  {
    key: 'cleanliness',
    label: 'רמת ניקיון',
    options: [
      { value: 'very_clean', label: 'מאוד נקי/ה' },
      { value: 'clean', label: 'נקי/ה' },
      { value: 'average', label: 'ממוצע' },
      { value: 'relaxed', label: 'רגוע/ה' },
    ],
  },
  {
    key: 'sleep_schedule',
    label: 'שעות שינה',
    options: [
      { value: 'early_bed_early_wake', label: 'משכים/ה קום' },
      { value: 'night_owl', label: 'ינשוף לילה' },
      { value: 'flexible', label: 'גמיש/ה' },
    ],
  },
  {
    key: 'social_guests',
    label: 'אירוח חברים',
    options: [
      { value: 'frequent_visitors', label: 'מארח/ת הרבה' },
      { value: 'occasional', label: 'לפעמים' },
      { value: 'rarely', label: 'כמעט אף פעם' },
    ],
  },
  {
    key: 'noise_tolerance',
    label: 'רגישות לרעש',
    options: [
      { value: 'quiet', label: 'זקוק/ה לשקט' },
      { value: 'moderate', label: 'בינוני' },
      { value: 'high', label: 'לא רגיש/ה' },
    ],
  },
  {
    key: 'music_vibe',
    label: 'מוזיקה באווירה',
    options: [
      { value: 'silent', label: 'שקט מוחלט' },
      { value: 'ambient', label: 'רקע נעים' },
      { value: 'upbeat', label: 'אנרגטי' },
      { value: 'loud', label: 'רועש' },
    ],
  },
  {
    key: 'climate',
    label: 'העדפת טמפרטורה',
    options: [
      { value: 'cold', label: 'קריר' },
      { value: 'moderate', label: 'בינוני' },
      { value: 'hot', label: 'חם' },
    ],
  },
  {
    key: 'smoking',
    label: 'עישון',
    options: [
      { value: 'yes', label: 'כן' },
      { value: 'no', label: 'לא' },
      { value: 'outdoor_only', label: 'רק בחוץ' },
    ],
  },
  {
    key: 'kitchen_dietary',
    label: 'כשרות / תזונה',
    options: [
      { value: 'strict', label: 'קפדני/ת' },
      { value: 'vegetarian', label: 'צמחוני/ת' },
      { value: 'mixed', label: 'מעורב' },
    ],
  },
  {
    key: 'cooking_dynamics',
    label: 'בישול',
    options: [
      { value: 'shared_cooking', label: 'בישול משותף' },
      { value: 'individual', label: 'כל אחד לעצמו' },
      { value: 'meal_prep', label: 'הכנה מראש' },
    ],
  },
  {
    key: 'pets',
    label: 'חיות מחמד',
    options: [
      { value: 'yes', label: 'כן' },
      { value: 'no', label: 'לא' },
      { value: 'small_only', label: 'רק קטנות' },
    ],
  },
  {
    key: 'weekend_routine',
    label: 'סופ״ש',
    options: [
      { value: 'home_body', label: 'בבית' },
      { value: 'mixed', label: 'משולב' },
      { value: 'always_out', label: 'תמיד בחוץ' },
    ],
  },
  {
    key: 'relationship_status',
    label: 'מצב זוגי',
    options: [
      { value: 'single', label: 'רווק/ה' },
      { value: 'in_relationship', label: 'בזוגיות' },
      { value: 'flexible', label: 'גמיש' },
    ],
  },
  {
    key: 'study_habits',
    label: 'הרגלי לימוד',
    options: [
      { value: 'heavy_studying', label: 'לומד/ת המון' },
      { value: 'moderate', label: 'בינוני' },
      { value: 'minimal', label: 'מעט' },
    ],
  },
  {
    key: 'financial_splitting',
    label: 'חלוקת הוצאות',
    options: [
      { value: 'strict', label: 'קפדני' },
      { value: 'flexible', label: 'גמיש' },
      { value: 'shared_expenses', label: 'הוצאות משותפות' },
    ],
  },
  {
    key: 'miluim_reserve_duty',
    label: 'מילואים',
    options: [
      { value: 'active', label: 'פעיל' },
      { value: 'occasional', label: 'מדי פעם' },
      { value: 'none', label: 'לא' },
    ],
  },
];

export function tagOptionLabel(
  key: TagKey,
  value: string | null
): string | null {
  if (!value) return null;
  const category = TAG_CATEGORIES.find((c) => c.key === key);
  return category?.options.find((o) => o.value === value)?.label ?? value;
}

const EN_CATEGORY: Record<TagKey, string> = {
  gender_dynamic: 'Gender dynamic',
  cleanliness: 'Cleanliness',
  sleep_schedule: 'Sleep schedule',
  social_guests: 'Guests',
  noise_tolerance: 'Noise',
  music_vibe: 'Music',
  climate: 'Temperature',
  smoking: 'Smoking',
  kitchen_dietary: 'Diet and kitchen',
  cooking_dynamics: 'Cooking',
  pets: 'Pets',
  weekend_routine: 'Weekends',
  relationship_status: 'Relationship',
  study_habits: 'Study habits',
  financial_splitting: 'Shared expenses',
  miluim_reserve_duty: 'Reserve duty',
};
const EN_OPTIONS: Record<TagKey, string[]> = {
  gender_dynamic: [
    'One guy with guys',
    'Two women and another woman',
    'Mixed, anyone',
  ],
  cleanliness: ['Very clean', 'Clean', 'Average', 'Relaxed'],
  sleep_schedule: ['Early riser', 'Night owl', 'Flexible'],
  social_guests: ['Often', 'Sometimes', 'Rarely'],
  noise_tolerance: ['Need quiet', 'Moderate', 'Not sensitive'],
  music_vibe: ['Silence', 'Background music', 'Upbeat', 'Loud'],
  climate: ['Cool', 'Moderate', 'Warm'],
  smoking: ['Yes', 'No', 'Outdoors only'],
  kitchen_dietary: ['Strict', 'Vegetarian', 'Mixed'],
  cooking_dynamics: ['Cook together', 'Individually', 'Meal prep'],
  pets: ['Yes', 'No', 'Small pets only'],
  weekend_routine: ['At home', 'A mix', 'Usually out'],
  relationship_status: ['Single', 'In a relationship', 'Flexible'],
  study_habits: ['A lot', 'Moderate', 'A little'],
  financial_splitting: ['Strict', 'Flexible', 'Shared expenses'],
  miluim_reserve_duty: ['Active', 'Occasional', 'None'],
};
export function localizedTags(locale: 'he' | 'en') {
  return locale === 'he'
    ? TAG_CATEGORIES
    : TAG_CATEGORIES.map((c) => ({
        ...c,
        label: EN_CATEGORY[c.key],
        options: c.options.map((o, i) => ({
          ...o,
          label: EN_OPTIONS[c.key][i],
        })),
      }));
}
export function localizedTagLabel(
  key: TagKey,
  value: string | null,
  locale: 'he' | 'en'
) {
  return (
    localizedTags(locale)
      .find((c) => c.key === key)
      ?.options.find((o) => o.value === value)?.label ?? null
  );
}
