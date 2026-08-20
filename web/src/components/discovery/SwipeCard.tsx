import React from 'react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Heart, X } from 'lucide-react';

interface SwipeCardProps {
  id: string;
  name: string;
  photo?: string;
  initials: string;
  age: number;
  bio: string;
  tags: Array<{ label: string; icon?: string }>;
  matchPercentage?: number;
  verified?: boolean;
  onLike: (id: string) => void;
  onPass: (id: string) => void;
}

export function SwipeCard({
  id,
  name,
  photo,
  initials,
  age,
  bio,
  tags,
  matchPercentage,
  verified,
  onLike,
  onPass,
}: SwipeCardProps) {
  return (
    <div className="w-full max-w-sm bg-white rounded-shutaf-lg shadow-md overflow-hidden border border-card-border">
      {/* Image Section */}
      <div className="relative bg-neutral-bg-soft h-80 flex items-center justify-center overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-orange-soft flex items-center justify-center text-orange text-4xl font-bold">
            {initials}
          </div>
        )}
        {matchPercentage !== undefined && (
          <div className="absolute top-4 inset-e-4 bg-white px-3 py-1 rounded-full shadow-md">
            <span className="text-sm font-bold text-success">{matchPercentage}% תואם</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-ink">
              {name}, {age}
            </h3>
            {verified && (
              <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className="text-body-text text-sm mb-4 line-clamp-2">{bio}</p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {tags.map((tag, idx) => (
              <Badge key={idx} variant="default" className="text-xs">
                {tag.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => onPass(id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-shutaf-md border border-card-border hover:bg-neutral-bg-soft transition-colors text-ink font-medium"
          >
            <X className="w-5 h-5" />
            דילוג
          </button>
          <button
            onClick={() => onLike(id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-shutaf-md bg-orange hover:bg-orange-dark text-white transition-colors font-medium"
          >
            <Heart className="w-5 h-5 fill-current" />
            לייק
          </button>
        </div>
      </div>
    </div>
  );
}
