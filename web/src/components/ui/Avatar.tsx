import React from 'react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: AvatarSize;
  initials?: string;
  verified?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-20 h-20 text-lg',
};

const sizeRing = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

export function Avatar({
  size = 'md',
  initials,
  verified = false,
  src,
  alt,
  className,
  ...props
}: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const ringSize = sizeRing[size];

  return (
    <div className={`relative inline-block ${ringSize} ${className || ''}`}>
      {src ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className={`
            ${sizeClass} rounded-full object-cover
            bg-neutral-bg border border-card-border
          `}
          {...props}
        />
      ) : (
        <div
          className={`
            ${sizeClass} rounded-full
            bg-orange-soft text-orange font-semibold
            flex items-center justify-center
            border border-card-border
          `}
        >
          {initials}
        </div>
      )}
      {verified && (
        <div className="absolute bottom-0 inset-e-0 w-5 h-5 bg-success rounded-full border-2 border-white flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}
