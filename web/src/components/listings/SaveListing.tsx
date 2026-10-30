'use client';

import Link from 'next/link';
import { useFavorites } from '@/hooks/useFavorites';
import { authPath } from '@/utils/navigation';
import { publicListingPath } from '@/lib/listings/preview';

export function SaveListing({ id, locale }: { id: string; locale: 'he' | 'en' }) {
  const favorites = useFavorites(locale), en = locale === 'en';
  const pending = favorites.isPending(id), uncertain = favorites.isUncertain(id);
  const buttonStyle = 'min-h-11 rounded-xl border border-card-border px-4 py-3 font-semibold text-teal disabled:cursor-wait disabled:opacity-60';
  if (favorites.ready && !favorites.actor) return (
    <Link data-testid="personal-save" className={buttonStyle} href={authPath('login', publicListingPath(id, locale), locale)}>
      {en ? 'Sign in to save' : 'התחברות לשמירה אישית'}
    </Link>
  );
  return (
    <div data-testid="personal-save" className="flex max-w-sm flex-col items-start gap-2">
      <button type="button" data-testid="favorite-toggle" className={buttonStyle}
        disabled={!favorites.ready || pending || uncertain}
        aria-pressed={favorites.ready && !uncertain ? favorites.isSaved(id) : undefined}
        aria-busy={pending}
        onClick={() => void favorites.toggle(id)}>
        {pending ? en ? 'Updating…' : 'מעדכנים…'
          : favorites.loadError ? en ? 'Saved state unavailable' : 'מצב השמירה אינו זמין'
            : !favorites.ready ? en ? 'Loading saved state…' : 'טוענים את מצב השמירה…'
              : uncertain ? en ? 'Update not confirmed' : 'העדכון לא אושר'
                : favorites.isSaved(id) ? en ? 'Unsave' : 'ביטול שמירה' : en ? 'Save for me' : 'שמירה אישית'}
      </button>
      {(favorites.loadError || uncertain) && <div role="alert" className="text-sm text-error">
        <p>{favorites.loadError
          ? en ? 'Could not load your saved apartments.' : 'לא הצלחנו לטעון את השמורים שלך.'
          : en ? 'The update could not be confirmed. Retry keeps the same choice.' : 'לא ניתן לאשר שהעדכון הושלם. ניסיון חוזר שומר על אותה בחירה.'}</p>
        <button type="button" disabled={pending} className="min-h-11 text-teal underline disabled:opacity-60"
          onClick={() => { if (favorites.loadError) void favorites.reload(); else void favorites.toggle(id); }}>
          {en ? 'Retry' : 'ניסיון חוזר'}
        </button>
      </div>}
    </div>
  );
}
