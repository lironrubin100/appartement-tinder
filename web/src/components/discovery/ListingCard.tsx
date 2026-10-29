import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Heart, MessageCircle } from 'lucide-react';
import { ShareListing } from '@/components/listings/ShareListing';
import { Badge } from '../ui/Badge';

interface ListingCardProps {
  locale?: 'he' | 'en';
  id: string;
  title: string;
  price: number;
  minRoomPrice?: number;
  maxRoomPrice?: number;
  availableRoomCount?: number;
  billsIncluded?: boolean;
  image?: string;
  location: string;
  bedrooms: number;
  availableFrom: string;
  tags?: string[];
  interestedCount?: number;
  isNew?: boolean;
  saved?: boolean;
  savePending?: boolean;
  isOwner?: boolean;
  manageHref?: string;
  selected?: boolean;
  onSave?: (id: string) => void;
  onMessage?: (id: string) => void;
  onClick?: () => void;
}

export function ListingCard({
  locale = 'he',
  id,
  title,
  price,
  minRoomPrice = price,
  maxRoomPrice = price,
  availableRoomCount = 1,
  billsIncluded,
  image,
  location,
  bedrooms,
  availableFrom,
  tags = [],
  interestedCount = 0,
  isNew = false,
  saved = false,
  savePending = false,
  isOwner = false,
  manageHref,
  selected = false,
  onSave,
  onMessage,
  onClick,
}: ListingCardProps) {
  const en = locale === 'en';
  const roomPriceLabel = minRoomPrice === maxRoomPrice
    ? `₪${minRoomPrice.toLocaleString()} ${en ? 'per room' : 'לחדר'}`
    : `₪${minRoomPrice.toLocaleString()}–${maxRoomPrice.toLocaleString()} ${en ? 'per room' : 'לחדר'}`;
  const availableRoomsLabel = availableRoomCount === 1
    ? en ? '1 available room' : 'חדר פנוי אחד'
    : `${availableRoomCount} ${en ? 'available rooms' : 'חדרים פנויים'}`;

  return (
    <div
      className="bg-white rounded-shutaf-lg shadow-sm border border-card-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
      data-testid="listing-card"
      data-apartment-id={id}
      data-selected={selected}
      data-owned={isOwner}
    >
      {/* Image */}
      <div className="relative bg-neutral-bg-soft h-40 flex items-center justify-center overflow-hidden group">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-soft to-neutral-bg flex items-center justify-center">
            <span className="text-muted-text">{en ? 'Image unavailable' : 'תמונה לא זמינה'}</span>
          </div>
        )}
        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave?.(id);
          }}
          aria-label={saved ? en ? 'Remove from saved' : 'הסר מהמועדפים' : en ? 'Save listing' : 'הוסף למועדפים'}
          aria-pressed={saved}
          disabled={savePending}
          data-testid="favorite-toggle"
          className="absolute top-3 inset-e-3 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow disabled:cursor-wait disabled:opacity-60"
        >
          <Heart
            className={`w-5 h-5 ${saved ? 'fill-gold text-gold' : 'text-muted-text'}`}
          />
        </button>
        {isNew && (
          <span className="absolute top-3 inset-s-3 bg-success text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {en ? 'New' : 'חדש'}
          </span>
        )}
        {/* Price Badge */}
        <div className="absolute bottom-3 start-3 bg-white px-3 py-1.5 rounded-shutaf-md shadow-md">
          <span className="font-bold text-base text-orange">{roomPriceLabel}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-base font-bold text-ink mb-2 line-clamp-2">
          <button type="button" className="text-start" onClick={event => { event.stopPropagation(); onClick?.(); }}>{title}</button>
        </h3>
        {isOwner && <Badge variant="default" className="mb-2">{en ? 'Your listing' : 'המודעה שלך'}</Badge>}

        {/* Location & Bedrooms */}
        <div className="flex items-center gap-2 text-muted-text text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
          <span className="text-muted-text">•</span>
          <span>{bedrooms} {en ? 'rooms' : 'חדרים'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <Badge variant="default" className="text-xs py-0.5 px-2">
            {availableRoomsLabel}
          </Badge>
          {billsIncluded !== undefined && (
            <Badge variant={billsIncluded ? 'success' : 'default'} className="text-xs py-0.5 px-2">
              {billsIncluded ? en ? 'Bills included' : 'חשבונות כלולים' : en ? 'Bills not included' : 'חשבונות לא כלולים'}
            </Badge>
          )}
        </div>

        {/* Available From */}
        <div className="text-sm text-muted-text mb-3">
          {en ? 'Available from: ' : 'זמין מ: '}{availableFrom ? new Date(availableFrom).toLocaleDateString(en ? 'en-GB' : 'he-IL') : '—'}
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-card-border">
          <ShareListing id={id} locale={locale} />
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-text">{en ? 'Interested:' : 'מעוניינים:'}</span>
            <span className="font-semibold text-ink">{interestedCount}</span>
          </div>
          {isOwner && manageHref ? <Link href={manageHref} prefetch={false} onClick={event => event.stopPropagation()} className="min-h-11 inline-flex items-center text-sm font-semibold text-teal underline">
            {en ? 'Manage listing' : 'ניהול המודעה'}
          </Link> : !isOwner && onMessage ? <button
            type="button"
            aria-label={en ? 'Contact owner' : 'יצירת קשר עם בעל/ת הנכס'}
            onClick={(e) => {
              e.stopPropagation();
              onMessage?.(id);
            }}
            className="p-2 hover:bg-neutral-bg-soft rounded-md transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-muted-text hover:text-orange" />
          </button> : null}
        </div>
      </div>
    </div>
  );
}
