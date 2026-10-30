'use client';

import { usePathname } from 'next/navigation';
import type { FilterDef, FilterValidationError } from './filters';

interface FilterBarProps {
  filters: FilterDef[];
  values: Record<string, FilterDef['default']>;
  onChange: (id: string, value: FilterDef['default']) => void;
  resultCount: number;
  onReset?: () => void;
  pending?: boolean;
  validationError?: FilterValidationError | null;
}

export function FilterBar({ filters, values, onChange, resultCount, onReset, pending = false, validationError }: FilterBarProps) {
  const en = usePathname().startsWith('/en');
  const errorMessage = validationError === 'range'
    ? en ? 'Minimum price must not exceed maximum price.' : 'המחיר המינימלי לא יכול להיות גבוה מהמחיר המקסימלי.'
    : validationError === 'date' ? en ? 'Enter a valid availability date.' : 'יש להזין תאריך כניסה תקין.'
    : en ? 'Check the filter values and try again.' : 'יש לבדוק את ערכי הסינון ולנסות שוב.';
  return (
    <div
      className="w-full bg-white border border-card-border rounded-shutaf-lg p-3 md:p-4 flex flex-wrap items-center gap-4 mb-4"
      data-testid="filter-bar"
    >
      <span className="font-bold text-ink whitespace-nowrap" data-testid="result-count" role="status">
        {validationError ? en ? 'Check filters' : 'בדקו את הסינון' : pending ? en ? 'Updating listings…' : 'מעדכן תוצאות…' : `${resultCount} ${en ? resultCount === 1 ? 'listing' : 'listings' : resultCount === 1 ? 'דירה' : 'דירות'}`}
      </span>
      <div className="flex flex-wrap items-center gap-4">
        {filters.map((filter) => (
          <FilterControl
            key={filter.id}
            filter={filter}
            value={values[filter.id]}
            onChange={(value) => onChange(filter.id, value)}
            en={en}
            invalid={!!validationError && (filter.id === 'price' ? ['price', 'range'].includes(validationError) : filter.id === 'availableBy' && validationError === 'date')}
          />
        ))}
      </div>
      {onReset && <button type="button" onClick={onReset} className="min-h-11 rounded-shutaf-sm border border-card-border px-3 py-2 text-sm text-teal">
        {en ? 'Reset filters' : 'איפוס סינון'}
      </button>}
      {validationError && <p id="map-filter-error" role="alert" className="w-full text-sm text-error">{errorMessage}</p>}
    </div>
  );
}

function FilterControl({
  filter,
  value,
  onChange,
  en,
  invalid,
}: {
  filter: FilterDef;
  value: FilterDef['default'];
  onChange: (value: FilterDef['default']) => void;
  en: boolean;
  invalid: boolean;
}) {
  const label = en ? filter.labelEn : filter.label;
  const inputClasses = 'border border-card-border rounded-shutaf-sm px-2 py-1 text-sm bg-white';
  const labelClasses = 'flex items-center gap-2 text-sm text-body-text whitespace-nowrap';

  switch (filter.type) {
    case 'range': {
      const [min, max] = value as [number, number];
      return (
        <div role="group" aria-labelledby={`map-${filter.id}-label`} className={labelClasses} data-testid={`filter-${filter.id}`}>
          <span id={`map-${filter.id}-label`}>{label}</span>
          <input
            type="number"
            aria-label={en ? 'Minimum room price' : 'מחיר חדר מינימלי'}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? 'map-filter-error' : undefined}
            value={min}
            min={filter.min}
            max={max}
            step={filter.step}
            onChange={(e) => onChange([Number(e.target.value), max])}
            className={`${inputClasses} w-20`}
          />
          <span>–</span>
          <input
            type="number"
            aria-label={en ? 'Maximum room price' : 'מחיר חדר מקסימלי'}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? 'map-filter-error' : undefined}
            value={max}
            min={min}
            max={filter.max}
            step={filter.step}
            onChange={(e) => onChange([min, Number(e.target.value)])}
            className={`${inputClasses} w-20`}
          />
        </div>
      );
    }
    case 'select':
      return (
        <label className={labelClasses} data-testid={`filter-${filter.id}`}>
          {label}
          <select
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
          >
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {en ? o.labelEn ?? o.label : o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case 'toggle':
      return (
        <label className={`${labelClasses} cursor-pointer`} data-testid={`filter-${filter.id}`}>
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 accent-orange"
          />
          {label}
        </label>
      );
    case 'date':
      return (
        <label className={labelClasses} data-testid={`filter-${filter.id}`}>
          {label}
          <input
            type="date"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? 'map-filter-error' : undefined}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            className={inputClasses}
          />
        </label>
      );
  }
}
