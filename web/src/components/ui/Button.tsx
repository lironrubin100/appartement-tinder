import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-orange hover:bg-orange-dark text-white font-semibold transition-colors',
  secondary: 'bg-neutral-bg hover:bg-neutral-bg text-ink font-semibold transition-colors',
  ghost: 'hover:bg-neutral-bg-soft text-ink transition-colors',
  danger: 'bg-error hover:opacity-90 text-white font-semibold transition-opacity',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-shutaf-sm',
  md: 'px-4 py-2.5 text-base rounded-shutaf-md',
  lg: 'px-6 py-3 text-lg rounded-shutaf-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`;

  return <button className={combinedClasses} disabled={disabled} {...props} />;
}
