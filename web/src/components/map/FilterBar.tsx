'use client';

import type { FilterDef } from './filters';

interface FilterBarProps {
  filters: FilterDef[];
  values: Record<string, FilterDef['default']>;
  onChange: (id: string, value: FilterDef['default']) => void;
  resultCount: number;
}

export function FilterBar({ filters, values, onChange, resultCount }: FilterBarProps) {
  return (
    <div
      className="w-full bg-white border border-card-border rounded-shutaf-lg p-3 md:p-4 flex flex-wrap items-center gap-4 mb-4"
      data-testid="filter-bar"
    >
      <span className="font-bold text-ink whitespace-nowrap" data-testid="result-count">
        {resultCount} דירות
      </span>
      <div className="flex flex-wrap items-center gap-4">
        {filters.map((filter) => (
          <FilterControl
            key={filter.id}
            filter={filter}
            value={values[filter.id]}
            onChange={(value) => onChange(filter.id, value)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef;
  value: FilterDef['default'];
  onChange: (value: FilterDef['default']) => void;
}) {
  const inputClasses = 'border border-card-border rounded-shutaf-sm px-2 py-1 text-sm bg-white';
  const labelClasses = 'flex items-center gap-2 text-sm text-body-text whitespace-nowrap';

  switch (filter.type) {
    case 'range': {
      const [min, max] = value as [number, number];
      return (
        <label className={labelClasses} data-testid={`filter-${filter.id}`}>
          {filter.label}
          <input
            type="number"
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
            value={max}
            min={min}
            max={filter.max}
            step={filter.step}
            onChange={(e) => onChange([min, Number(e.target.value)])}
            className={`${inputClasses} w-20`}
          />
        </label>
      );
    }
    case 'select':
      return (
        <label className={labelClasses} data-testid={`filter-${filter.id}`}>
          {filter.label}
          <select
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
          >
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
          {filter.label}
        </label>
      );
    case 'date':
      return (
        <label className={labelClasses} data-testid={`filter-${filter.id}`}>
          {filter.label}
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            className={inputClasses}
          />
        </label>
      );
  }
}
