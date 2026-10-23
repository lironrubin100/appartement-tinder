import Link from 'next/link';
import type { Locale } from '@/lib/listings/text';

// Minimal dashboard projection; never a complete draft or signed media URL.
export type ListingDraftListItem = Readonly<{
  id: string; title?: string; updatedAt: string; kind: 'new' | 'edit'; continueHref?: string;
}>;
export function ListingDraftList({ items, locale }: { items: readonly ListingDraftListItem[]; locale: Locale }) {
  const en = locale === 'en';
  const format = new Intl.DateTimeFormat(en ? 'en-GB' : 'he-IL', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jerusalem', timeZoneName: 'short',
  });
  if (!items.length) return <p className="rounded-2xl border border-card-border bg-white p-6 text-sm text-muted-text">
    {en ? 'No saved drafts yet.' : 'עדיין אין טיוטות שמורות.'}
  </p>;
  return <ul className="space-y-3" aria-label={en ? 'Saved drafts' : 'טיוטות שמורות'}>
    {items.map(item => <li key={item.id} data-testid="listing-draft" data-draft-id={item.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-card-border bg-white p-4">
      <div className="min-w-0 flex-1 basis-52">
        <h3 className="break-words font-semibold text-ink">{item.title?.trim() || (en ? 'Untitled draft' : 'טיוטה ללא כותרת')}</h3>
        <p className="mt-1 text-sm text-muted-text">{item.kind === 'edit' ? (en ? 'Listing edit' : 'עריכת מודעה') : (en ? 'New listing' : 'מודעה חדשה')}</p>
        <p className="mt-1 text-xs text-muted-text">{en ? 'Updated ' : 'עודכן ב־'}<time dateTime={item.updatedAt}>{format.format(new Date(item.updatedAt))}</time></p>
      </div>
      {item.continueHref && <Link href={item.continueHref}
        aria-label={(en ? 'Continue: ' : 'המשך: ') + (item.title?.trim() || (en ? 'Untitled draft' : 'טיוטה ללא כותרת'))}
        className="rounded-xl border border-card-border px-4 py-3 font-semibold text-teal">
        {en ? 'Continue' : 'המשך'}
      </Link>}
    </li>)}
  </ul>;
}
