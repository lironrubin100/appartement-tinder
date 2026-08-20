import React from 'react';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  removable?: boolean;
  onRemove?: () => void;
}

const variantClasses = {
  default: 'bg-orange-soft text-orange',
  success: 'bg-success/10 text-success',
  error: 'bg-error/10 text-error',
  warning: 'bg-gold/10 text-gold',
};

export function Badge({
  variant = 'default',
  removable = false,
  onRemove,
  className,
  children,
  ...props
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium';
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className || ''}`;

  return (
    <span className={combinedClasses} {...props}>
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ms-1 hover:opacity-70 transition-opacity"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
