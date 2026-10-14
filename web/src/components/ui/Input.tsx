'use client';
import React, { useId } from 'react';

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
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const descriptionId = `${id}-description`;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink mb-2">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={id}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || helperText ? descriptionId : undefined}
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
      {error && <p id={descriptionId} className="text-sm text-error mt-1">{error}</p>}
      {helperText && !error && <p id={descriptionId} className="text-sm text-muted-text mt-1">{helperText}</p>}
    </div>
  );
}
