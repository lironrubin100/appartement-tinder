import type { Tables } from '@/types/database';

// Filters run against the safe public projection, never the owner record that
// contains an exact address and coordinates.
type Apartment = Tables<'apartments_public'>;

interface BaseFilter {
  id: string;
  label: string;
}

export interface RangeFilter extends BaseFilter {
  type: 'range';
  min: number;
  max: number;
  step?: number;
  default: [number, number];
  format?: (value: number) => string;
  predicate: (apt: Apartment, value: [number, number]) => boolean;
}

export interface SelectFilter extends BaseFilter {
  type: 'select';
  options: { value: string; label: string }[];
  default: string;
  predicate: (apt: Apartment, value: string) => boolean;
}

export interface ToggleFilter extends BaseFilter {
  type: 'toggle';
  default: boolean;
  predicate: (apt: Apartment, value: boolean) => boolean;
}

export interface DateFilter extends BaseFilter {
  type: 'date';
  default: string | null;
  predicate: (apt: Apartment, value: string | null) => boolean;
}

export type FilterDef = RangeFilter | SelectFilter | ToggleFilter | DateFilter;
export type FilterValue = FilterDef['default'];

// Edit this array to add, remove, or tune a filter — nothing else on the map
// page needs to change. Keep the controls focused on the choices people make
// before opening an apartment: room price, apartment size, bills, sublet, and
// availability.
export const APARTMENT_FILTERS: FilterDef[] = [
  {
    id: 'price',
    type: 'range',
    label: 'טווח מחיר',
    min: 0,
    max: 6000,
    step: 100,
    default: [0, 6000],
    format: (v) => `₪${v.toLocaleString()}`,
    predicate: (apt, [min, max]) => {
      const lowestRoomPrice = apt.min_room_price ?? apt.price;
      const highestRoomPrice = apt.max_room_price ?? apt.price;
      return lowestRoomPrice <= max && highestRoomPrice >= min;
    },
  },
  {
    id: 'bedrooms',
    type: 'select',
    label: 'חדרים',
    default: 'any',
    options: [
      { value: 'any', label: 'הכל' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4+', label: '+4' },
    ],
    predicate: (apt, value) => {
      if (value === 'any') return true;
      if (value === '4+') return apt.bedrooms >= 4;
      return apt.bedrooms === Number(value);
    },
  },
  {
    id: 'sublet',
    type: 'toggle',
    label: 'סאבלט בלבד',
    default: false,
    predicate: (apt, value) => !value || apt.is_sublet,
  },
  {
    id: 'billsIncluded',
    type: 'toggle',
    label: 'חשבונות כלולים',
    default: false,
    predicate: (apt, value) => !value || apt.bills_included,
  },
  {
    id: 'availableBy',
    type: 'date',
    label: 'כניסה עד',
    default: null,
    predicate: (apt, value) => !value || (!!apt.available_from && apt.available_from <= value),
  },
];
