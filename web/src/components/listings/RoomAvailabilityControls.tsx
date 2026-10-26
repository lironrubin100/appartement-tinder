'use client';

import { useState, useTransition } from 'react';
import { setOwnedRoomAvailability } from '@/app/(main)/my-listings/actions';
import type { Locale } from '@/lib/listings/text';

type Room = { id: string; label: string | null; monthly_price: number; is_available: boolean };

export function RoomAvailabilityControls({ listingId, rooms, locale }: { listingId: string; rooms: Room[]; locale: Locale }) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  if (!rooms.length) return null;

  function change(room: Room) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await setOwnedRoomAvailability(room.id, !room.is_available);
        if (result.error) {
          setError(result.error === 'AUTH_REQUIRED'
            ? t('יש להתחבר מחדש כדי לעדכן חדר.', 'Sign in again to update a room.')
            : t('לא הצלחנו לעדכן את החדר. נסו שוב.', 'Could not update the room. Please retry.'));
        } else setSaved(true);
      } catch {
        setError(t('לא הצלחנו לעדכן את החדר. נסו שוב.', 'Could not update the room. Please retry.'));
      }
    });
  }

  return (
    <section className="mt-4 space-y-3 border-t border-card-border pt-4" aria-labelledby={`room-availability-${listingId}`} aria-busy={pending}>
      <h3 id={`room-availability-${listingId}`} className="font-semibold text-ink">{t('זמינות חדרים', 'Room availability')}</h3>
      <ul className="space-y-2">
        {rooms.map((room, index) => {
          const label = room.label?.trim() || `${t('חדר', 'Room')} ${index + 1}`;
          const action = room.is_available ? t('סימון כלא פנוי', 'Mark unavailable') : t('פתיחת החדר', 'Open room');
          return (
            <li key={room.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-bg-soft p-3" data-room-id={room.id}>
              <div className="min-w-0">
                <p className="break-words font-semibold text-ink">{label}</p>
                <p className="text-sm text-muted-text"><bdi>₪{room.monthly_price.toLocaleString('en-US')}</bdi> · {room.is_available ? t('פנוי', 'Available') : t('לא פנוי', 'Unavailable')}</p>
              </div>
              <button type="button" disabled={pending} onClick={() => change(room)} aria-label={`${label}: ${action}`}
                className="min-h-11 rounded-xl border border-card-border bg-white px-3 py-2 text-sm font-semibold text-ink disabled:cursor-wait disabled:opacity-60">
                {action}
              </button>
            </li>
          );
        })}
      </ul>
      {rooms.every(room => !room.is_available) && <p className="text-sm text-muted-text">
        {t('המודעה אינה מוצגת למחפשים כשאין חדר פנוי. פניות ממתינות ידרשו אישור מחדש לאחר פתיחה.', 'The listing is hidden from search while no rooms are available. Pending requests will need reconfirmation after reopening.')}
      </p>}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {pending ? <p role="status" className="text-sm text-muted-text">{t('מעדכנים את החדר…', 'Updating room…')}</p>
        : saved && !error && <p role="status" className="text-sm text-teal">{t('זמינות החדר עודכנה.', 'Room availability updated.')}</p>}
    </section>
  );
}
