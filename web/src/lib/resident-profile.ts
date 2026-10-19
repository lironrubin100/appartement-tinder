import { isRecord, residentFields, taxonomy, type ResidentFacts, type ResidentField } from '@/lib/contracts/taxonomy';
import type { Locale } from '@/utils/navigation';
export type Lifestyle = { facts: unknown; disclosed_fields: string[]; revision: number } | null;
export type PrivateLifestyle = { preferences: unknown } | null;
export function residentLabel(key: ResidentField, locale: Locale): string {
  const special: Partial<Record<ResidentField, { he: string; en: string }>> = { kitchen_other: { he: 'כלל מטבח אחר', en: 'Other kitchen rule' }, grocery_sharing: { he: 'שיתוף קניות', en: 'Grocery sharing' }, pets_other: { he: 'חיה אחרת', en: 'Other pet' } };
  return special[key]?.[locale] ?? Object.values(taxonomy).find(c => (c.fields as readonly string[]).includes(key))?.label[locale] ?? key;
}
export function factLabel(key: ResidentField, value: unknown, locale: Locale): string {
  const field = residentFields[key];
  const options = 'options' in field ? field.options as Record<string, { he: string; en: string }> : {};
  if (isRecord(value) && Array.isArray(value.values)) return value.values.length ? value.values.map(v => options[String(v)]?.[locale] ?? String(v)).join(', ') : locale === 'en' ? 'None' : 'אין';
  return options[String(value)]?.[locale] ?? String(value ?? '');
}
export function initialFacts(value: unknown): ResidentFacts { return isRecord(value) ? value as ResidentFacts : {}; }
export function initialPreferences(value: unknown): Record<string, unknown> { return isRecord(value) ? value : {}; }
export function validBirthDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}
export function ageAt(birth: string, today = new Date()): number {
  const date = new Date(`${birth}T12:00:00Z`);
  return today.getUTCFullYear() - date.getUTCFullYear() - (today.getUTCMonth() < date.getUTCMonth() || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate()) ? 1 : 0);
}
