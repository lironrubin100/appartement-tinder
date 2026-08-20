import React from 'react';
import { MapPin, Heart, MessageCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface ListingCardProps {
  id: string;
  title: string;
  price: number;
  image?: string;
  location: string;
  bedrooms: number;
  availableFrom: string;
  tags?: string[];
  interestedCount?: number;
  saved?: boolean;
  onSave?: (id: string) => void;
  onMessage?: (id: string) => void;
  onClick?: () => void;
}

export function ListingCard({
  id,
  title,
  price,
  image,
  location,
  bedrooms,
  availableFrom,
  tags = [],
  interestedCount = 0,
  saved = false,
  onSave,
  onMessage,
  onClick,
}: ListingCardProps) {
  return (
    <div
      className="bg-white rounded-shutaf-lg shadow-sm border border-card-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative bg-neutral-bg-soft h-40 flex items-center justify-center overflow-hidden group">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-soft to-neutral-bg flex items-center justify-center">
            <span className="text-muted-text">תמונה לא זמינה</span>
          </div>
        )}
        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave?.(id);
          }}
          className="absolute top-3 inset-e-3 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
        >
          <Heart
            className={`w-5 h-5 ${saved ? 'fill-gold text-gold' : 'text-muted-text'}`}
          />
        </button>
        {/* Price Badge */}
        <div className="absolute bottom-3 start-3 bg-white px-3 py-1.5 rounded-shutaf-md shadow-md">
          <span className="font-bold text-lg text-orange">₪{price.toLocaleString()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-base font-bold text-ink mb-2 line-clamp-2">{title}</h3>

        {/* Location & Bedrooms */}
        <div className="flex items-center gap-2 text-muted-text text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
          <span className="text-muted-text">•</span>
          <span>{bedrooms} חדרים</span>
        </div>

        {/* Available From */}
        <div className="text-sm text-muted-text mb-3">
          זמין מ: {new Date(availableFrom).toLocaleDateString('he-IL')}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="default" className="text-xs py-0.5 px-2">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-text self-center">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-card-border">
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-text">מעוניינים:</span>
            <span className="font-semibold text-ink">{interestedCount}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMessage?.(id);
            }}
            className="p-2 hover:bg-neutral-bg-soft rounded-md transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-muted-text hover:text-orange" />
          </button>
        </div>
      </div>
    </div>
  );
}
