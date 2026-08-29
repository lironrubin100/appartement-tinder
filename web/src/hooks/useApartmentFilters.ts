'use client';

import { useMemo, useState } from 'react';
import { APARTMENT_FILTERS, type FilterDef } from '@/components/map/filters';
import type { Tables } from '@/types/database';

type Apartment = Tables<'apartments'>;
type FilterState = Record<string, FilterDef['default']>;

function defaultState(filters: FilterDef[]): FilterState {
  return Object.fromEntries(filters.map((f) => [f.id, f.default]));
}

export function useApartmentFilters(apartments: Apartment[], filters: FilterDef[] = APARTMENT_FILTERS) {
  const [values, setValues] = useState<FilterState>(() => defaultState(filters));

  const filtered = useMemo(
    () =>
      apartments.filter((apt) =>
        filters.every((f) => f.predicate(apt, values[f.id] as never))
      ),
    [apartments, filters, values]
  );

  const setValue = (id: string, value: FilterDef['default']) =>
    setValues((prev) => ({ ...prev, [id]: value }));

  const reset = () => setValues(defaultState(filters));

  return { values, setValue, reset, filtered };
}
