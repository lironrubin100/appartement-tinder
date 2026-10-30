interface BaseFilter {
  id: string;
  label: string;
  labelEn: string;
}

export interface RangeFilter extends BaseFilter {
  type: 'range';
  min: number;
  max: number;
  step?: number;
  default: [number, number];
  format?: (value: number) => string;
}

export interface SelectFilter extends BaseFilter {
  type: 'select';
  options: { value: string; label: string; labelEn?: string }[];
  default: string;
}

export interface ToggleFilter extends BaseFilter {
  type: 'toggle';
  default: boolean;
}

export interface DateFilter extends BaseFilter {
  type: 'date';
  default: string | null;
}

export type FilterDef = RangeFilter | SelectFilter | ToggleFilter | DateFilter;
export type FilterValue = FilterDef['default'];
export type FilterState = Record<string, FilterValue>;
export type FilterValidationError = 'price' | 'range' | 'date' | 'filters';
export interface ApartmentFilterArguments {
  p_min_price: number;
  p_max_price: number;
  p_available_by: string | null;
  p_bedrooms: number | null;
  p_bills_included: boolean;
  p_sublet_only: boolean;
}

// Approved controls and defaults. The transport validator below and the server
// matcher share these fields; room eligibility is never inferred from summaries.
export const APARTMENT_FILTERS: FilterDef[] = [
  {
    id: 'price',
    type: 'range',
    label: 'טווח מחיר',
    labelEn: 'Room price range',
    min: 0,
    max: 6000,
    step: 100,
    default: [0, 6000],
    format: (v) => `₪${v.toLocaleString()}`,
  },
  {
    id: 'bedrooms',
    type: 'select',
    label: 'חדרים',
    labelEn: 'Bedrooms',
    default: 'any',
    options: [
      { value: 'any', label: 'הכל', labelEn: 'All' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4+', label: '+4' },
    ],
  },
  {
    id: 'sublet',
    type: 'toggle',
    label: 'סאבלט בלבד',
    labelEn: 'Sublets only',
    default: false,
  },
  {
    id: 'billsIncluded',
    type: 'toggle',
    label: 'חשבונות כלולים',
    labelEn: 'Bills included',
    default: false,
  },
  {
    id: 'availableBy',
    type: 'date',
    label: 'כניסה עד',
    labelEn: 'Available by',
    default: null,
  },
];

// Validation and transport only. The server evaluates all room conditions
// together against one available room; summary endpoints cannot answer this.
export function apartmentFilterArguments(values: FilterState, filters: FilterDef[] = APARTMENT_FILTERS):
  { ok: true; args: ApartmentFilterArguments } | { ok: false; error: FilterValidationError } {
  const enabled = new Set(filters.map(filter => filter.id));
  if ([...enabled].some(id => !['price', 'bedrooms', 'sublet', 'billsIncluded', 'availableBy'].includes(id))) {
    return { ok: false, error: 'filters' };
  }
  const args: ApartmentFilterArguments = { p_min_price: 0, p_max_price: 2147483647, p_available_by: null, p_bedrooms: null, p_bills_included: false, p_sublet_only: false };
  if (enabled.has('price')) {
    const range = values.price;
    const definition = filters.find(filter => filter.id === 'price');
    if (!Array.isArray(range) || range.length !== 2 || definition?.type !== 'range' ||
      !range.every(price => typeof price === 'number' && Number.isInteger(price) && price >= 0 && price <= 2147483647)) {
      return { ok: false, error: 'price' };
    }
    if (range[0] > range[1]) return { ok: false, error: 'range' };
    args.p_min_price = range[0]; args.p_max_price = range[1];
  }
  if (enabled.has('bedrooms')) {
    const value = values.bedrooms;
    if (value === '4+') args.p_bedrooms = 4;
    else if (value === '1' || value === '2' || value === '3') args.p_bedrooms = Number(value);
    else if (value !== 'any') return { ok: false, error: 'filters' };
  }
  for (const [field, argument] of [['billsIncluded', 'p_bills_included'], ['sublet', 'p_sublet_only']] as const) {
    if (enabled.has(field)) {
      const value = values[field];
      if (typeof value !== 'boolean') return { ok: false, error: 'filters' };
      args[argument] = value;
    }
  }
  if (enabled.has('availableBy') && values.availableBy !== null) {
    const value = values.availableBy;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000') ||
      !Number.isFinite(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) {
      return { ok: false, error: 'date' };
    }
    args.p_available_by = value;
  }
  return { ok: true, args };
}
