'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { OwnerInquiryCard } from './OwnerInquiryCard';
import { InquiryActionButtons } from './InquiryActionButtons';
import { listOwnerListingInquiries, markOwnerListingInquiryViewed } from '@/lib/listings/owner-inbox';
import type { OwnerInboxError, OwnerInboxPage, OwnerInquiryState } from '@/lib/listings/owner-inbox';
import type { Locale } from '@/utils/navigation';

type Props = { locale: Locale; listings: { id: string; title: string }[]; initialListingId?: string };
type Filter = { listingId: string; state: OwnerInquiryState | '' };

export function OwnerInquiryInbox(props: Props) {
  return <InboxFilters key={props.initialListingId ?? ''} {...props} />;
}

function InboxFilters({ locale, listings, initialListingId = '' }: Props) {
  const en = locale === 'en', listingControl = useId(), stateControl = useId();
  const [filter, setFilter] = useState<Filter>({ listingId: initialListingId, state: '' });
  const labels = {
    pending: en ? 'Pending' : 'ממתינה', accepted: en ? 'Accepted' : 'אושרה',
    declined: en ? 'Declined' : 'נדחתה', withdrawn: en ? 'Withdrawn by requester' : 'בוטלה על ידי הפונה',
    unavailable: en ? 'Unavailable' : 'לא זמינה',
  };
  const selectStyle = 'mt-1 min-h-11 w-full min-w-0 rounded-xl border border-card-border bg-white px-3 text-ink';
  return <section aria-label={en ? 'Listing inquiries' : 'פניות לדירות'} dir={en ? 'ltr' : 'rtl'} className="min-w-0 space-y-4">
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="min-w-0">
        <label htmlFor={listingControl} className="text-sm font-semibold text-ink">{en ? 'Apartment' : 'דירה'}</label>
        <select id={listingControl} className={selectStyle} value={filter.listingId} onChange={event => setFilter(current => ({ ...current, listingId: event.target.value }))}>
          <option value="">{en ? 'All apartments' : 'כל הדירות'}</option>
          {initialListingId && !listings.some(listing => listing.id === initialListingId) && <option value={initialListingId}>{en ? 'Selected apartment' : 'הדירה שנבחרה'}</option>}
          {listings.map(listing => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
        </select>
      </div>
      <div className="min-w-0">
        <label htmlFor={stateControl} className="text-sm font-semibold text-ink">{en ? 'Inquiry status' : 'מצב הפנייה'}</label>
        <select id={stateControl} className={selectStyle} value={filter.state} onChange={event => setFilter(current => ({ ...current, state: event.target.value as Filter['state'] }))}>
          <option value="">{en ? 'All statuses' : 'כל המצבים'}</option>
          {(Object.keys(labels) as OwnerInquiryState[]).map(state => <option key={state} value={state}>{labels[state]}</option>)}
        </select>
      </div>
    </div>
    <InboxResults key={`${filter.listingId}:${filter.state}`} locale={locale} filter={filter} />
  </section>;
}

function InboxResults({ locale, filter }: { locale: Locale; filter: Filter }) {
  const en = locale === 'en';
  const [page, setPage] = useState<OwnerInboxPage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<{ code: OwnerInboxError; cursor?: string } | null>(null);
  const generation = useRef(0), loading = useRef(false);

  const fetchPage = useCallback((cursor?: string) => {
    const request = ++generation.current;
    loading.current = true;
    return Promise.resolve().then(() => listOwnerListingInquiries({ limit: 20,
        ...(filter.listingId ? { listingId: filter.listingId } : {}),
        ...(filter.state ? { state: filter.state } : {}), ...(cursor ? { cursor } : {}),
      })).then(result => {
      if (generation.current !== request) return;
      if (!result.ok) { setError({ code: result.error.code, cursor }); return; }
      setPage(previous => ({ ...result.data, items: cursor && previous
        ? [...new Map([...previous.items, ...result.data.items].map(item => [item.id, item])).values()]
        : result.data.items }));
    }).catch(() => {
      if (generation.current === request) setError({ code: 'INTERNAL', cursor });
    }).finally(() => {
      if (generation.current === request) { loading.current = false; setBusy(false); }
    });
  }, [filter.listingId, filter.state]);

  useEffect(() => {
    const requestCounter = generation;
    void fetchPage();
    return () => { requestCounter.current++; };
  }, [fetchPage]);

  function load(cursor?: string) {
    if (cursor && loading.current) return;
    setBusy(true); setError(null);
    void fetchPage(cursor);
  }

  function declined(id: string) {
    // The action has acknowledged the server transition; keep that known state
    // visible even if refreshing the aggregate page subsequently fails.
    setPage(previous => previous && ({ ...previous, items: filter.state && filter.state !== 'declined'
      ? previous.items.filter(item => item.id !== id)
      : previous.items.map(item => item.id === id ? { ...item, status: 'declined', state: 'declined' } : item) }));
    void load();
  }

  const forbidden = error?.code === 'AUTH_REQUIRED' || error?.code === 'NOT_FOUND';
  const stale = error?.code === 'CURSOR_STALE';
  return <div aria-busy={busy} className="min-w-0 space-y-4">
    {busy && <p role="status" className="text-sm text-body-text">{en ? 'Loading inquiries…' : 'טוענים פניות…'}</p>}
    {error && <div className="space-y-2 rounded-xl border border-card-border p-4">
      <p role="alert" className="text-sm text-ink">{forbidden
        ? en ? 'These inquiries are unavailable for this account.' : 'הפניות אינן זמינות לחשבון הזה.'
        : stale ? en ? 'This page has expired. Refresh the inquiries to continue.' : 'תוקף העמוד פג. יש לרענן את הפניות כדי להמשיך.'
          : en ? 'Could not load inquiries. Your current results are kept.' : 'לא הצלחנו לטעון פניות. התוצאות הנוכחיות נשמרו.'}</p>
      {!forbidden && <Button type="button" variant="secondary" size="sm" className="min-h-11" disabled={busy} onClick={() => void load(stale ? undefined : error.cursor)}>
        {stale ? en ? 'Refresh inquiries' : 'רענון פניות' : en ? 'Retry' : 'ניסיון חוזר'}
      </Button>}
    </div>}
    {!busy && !error && page?.items.length === 0 && <p role="status" className="rounded-xl border border-card-border p-4 text-body-text">{filter.listingId || filter.state
      ? en ? 'No inquiries match these filters.' : 'אין פניות התואמות לסינון הזה.'
      : en ? 'No inquiries yet.' : 'עדיין אין פניות.'}</p>}
    {page?.items.map(inquiry => <OwnerInquiryCard key={inquiry.id} inquiry={inquiry} locale={locale}
      onView={markOwnerListingInquiryViewed}
      actions={<InquiryActionButtons inquiryId={inquiry.id} locale={locale} state={inquiry.state} onDeclined={() => declined(inquiry.id)} />} />)}
    {page?.has_more && page.next_cursor && !error && <Button type="button" variant="secondary" className="min-h-11" disabled={busy} onClick={() => void load(page.next_cursor!)}>
      {en ? 'Load more inquiries' : 'טעינת פניות נוספות'}
    </Button>}
  </div>;
}
