import { listListingCloudDrafts } from '@/lib/listings/draft-actions';
import type { DraftPage, DraftResult } from '@/lib/listings/draft-service-contract';
import { localePrefix, type Locale } from '@/lib/listings/text';
import { ListingDraftList } from './ListingDraftList';

export type DraftSearchParams = { draftCursor?: string | string[] };
export async function loadDashboardDrafts(params: DraftSearchParams): Promise<DraftResult<DraftPage>> {
  if (Array.isArray(params.draftCursor)) return { ok: false, error: { code: 'CURSOR_STALE', retryable: false } };
  return listListingCloudDrafts({ ...(params.draftCursor !== undefined ? { cursor: params.draftCursor } : {}) });
}
export async function ListingDraftSection({ result, locale, paged }: {
  result: Promise<DraftResult<DraftPage>>; locale: Locale; paged: boolean;
}) {
  const drafts = await result, en = locale === 'en';
  const first = localePrefix(locale) + '/my-listings#saved-drafts';
  if (!drafts.ok) {
    const stale = drafts.error.code === 'CURSOR_STALE';
    return <div role="alert" className="rounded-2xl border border-card-border bg-white p-6">
      <p className="text-sm text-ink">{stale
        ? (en ? 'This draft page has expired. Open the latest drafts.' : 'תוקף עמוד הטיוטות פג. אפשר לפתוח את הטיוטות העדכניות.')
        : (en ? 'Could not load saved drafts.' : 'לא הצלחנו לטעון את הטיוטות השמורות.')}</p>
      <a href={first} className="mt-3 inline-block rounded-xl border border-card-border px-4 py-3 font-semibold text-teal">
        {stale ? (en ? 'Latest drafts' : 'הטיוטות העדכניות') : (en ? 'Try again' : 'ניסיון נוסף')}
      </a>
    </div>;
  }
  return <>
    <ListingDraftList locale={locale} items={drafts.data.items.map(draft => ({
      id: draft.id, title: draft.fields.title, updatedAt: draft.updatedAt, kind: draft.kind, revision: draft.revision, deleting: draft.state === 'deleting',
      continueHref: draft.state === 'open' && !draft.publicationStartedAt ? localePrefix(locale) + '/compose?draft=' + draft.id : undefined,
    }))} />
    {(paged || drafts.data.next_cursor) && <nav aria-label={en ? 'Draft pages' : 'עמודי טיוטות'} className="mt-4 flex flex-wrap gap-4">
      {paged && <a href={first} className="rounded-xl border border-card-border px-4 py-3 font-semibold text-teal">
        {en ? 'Latest drafts' : 'הטיוטות העדכניות'}</a>}
      {drafts.data.next_cursor && <a href={localePrefix(locale) + '/my-listings?draftCursor=' + encodeURIComponent(drafts.data.next_cursor) + '#saved-drafts'}
        className="rounded-xl border border-card-border px-4 py-3 font-semibold text-teal">
        {en ? 'Older drafts' : 'טיוטות קודמות'}</a>}
    </nav>}
  </>;
}
