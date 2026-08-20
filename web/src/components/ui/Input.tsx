import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-ink mb-2">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          className={`
            w-full px-4 py-2.5 rounded-shutaf-md
            border border-card-border bg-white
            text-ink placeholder:text-muted-text
            focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent
            transition-all disabled:bg-neutral-bg-soft disabled:cursor-not-allowed
            ${error ? 'border-error focus:ring-error' : ''}
            ${icon ? 'pe-10' : ''}
            ${className || ''}
          `}
          {...props}
        />
        {icon && (
          <div className="absolute inset-e-3 pointer-events-none text-muted-text">
            {icon}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-error mt-1">{error}</p>}
      {helperText && !error && <p className="text-sm text-muted-text mt-1">{helperText}</p>}
    </div>
  );
}
