'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface FilterOption {
  id: string;
  label: string;
}

interface TagFilterProps {
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
  collapsible?: boolean;
}

export function TagFilter({
  title,
  options,
  selected,
  onChange,
  multiSelect = true,
  collapsible = false,
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(!collapsible);

  const toggleOption = (id: string) => {
    if (multiSelect) {
      const newSelected = selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id];
      onChange(newSelected);
    } else {
      const newSelected = selected.includes(id) ? [] : [id];
      onChange(newSelected);
    }
  };

  const toggleAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.id));
    }
  };

  return (
    <div className="border-b border-card-border pb-4">
      {/* Header */}
      <button
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between mb-3"
      >
        <h4 className="font-semibold text-ink">{title}</h4>
        {collapsible && (
          <ChevronDown
            className={`w-5 h-5 text-muted-text transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Options */}
      {isOpen && (
        <div className="flex flex-wrap gap-2">
          {/* Select All Option (if multi-select) */}
          {multiSelect && options.length > 1 && (
            <button
              onClick={toggleAll}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${
                  selected.length === options.length
                    ? 'bg-orange text-white'
                    : 'bg-neutral-bg text-ink hover:bg-orange-soft'
                }
              `}
            >
              הכול
            </button>
          )}

          {/* Individual Options */}
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => toggleOption(option.id)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${
                  selected.includes(option.id)
                    ? 'bg-orange text-white'
                    : 'bg-neutral-bg text-ink hover:bg-orange-soft'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Selected Count */}
      {selected.length > 0 && isOpen && (
        <div className="mt-3 text-xs text-muted-text">
          {selected.length} נבחרים מ {options.length}
        </div>
      )}
    </div>
  );
}
