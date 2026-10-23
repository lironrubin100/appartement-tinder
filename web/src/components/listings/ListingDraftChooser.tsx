'use client';

import type { Locale } from '@/lib/listings/text';
import type { ListingDraftListItem } from './ListingDraftList';

export type ListingDraftChoice = { kind: 'new' } | { kind: 'continue'; draftId: string; expectedRevision: number } | { kind: 'import' };
export type ListingDraftChoiceItem = Readonly<Pick<ListingDraftListItem, 'id' | 'title' | 'updatedAt' | 'kind'> & { revision: number; unavailable?: boolean }>;

type Props = {
  items: readonly ListingDraftChoiceItem[];
  locale: Locale;
  hasLocalDraft: boolean;
  onChoose: (choice: ListingDraftChoice) => void;
  onClose: () => void;
  pending?: boolean;
  loadState?: 'ready' | 'loading' | 'unavailable';
  onRetry?: () => void;
};

// The caller supplies an authorized projection and handles every explicit choice.
// Rendering this component never loads, creates, imports or saves a draft.
export function ListingDraftChooser({ items, locale, hasLocalDraft, onChoose, onClose, pending = false, loadState = 'ready', onRetry }: Props) {
  const en = locale === 'en';
  const date = new Intl.DateTimeFormat(en ? 'en-GB' : 'he-IL', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem', timeZoneName: 'short',
  });
  return <section dir={en ? 'ltr' : 'rtl'} aria-label={en ? 'Choose a listing draft' : 'בחירת טיוטת מודעה'} aria-busy={pending} className="space-y-5 bg-white p-5 sm:p-8">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-ink">{en ? 'New listing or saved draft?' : 'מודעה חדשה או טיוטה שמורה?'}</h2>
      <button type="button" disabled={pending} onClick={onClose} className="min-h-11 rounded-xl px-3 text-sm text-teal disabled:opacity-50">{en ? 'Close' : 'סגירה'}</button>
    </div>
    <fieldset disabled={pending} className="min-w-0 space-y-5">
      <legend className="sr-only">{en ? 'Choose how to start' : 'בחירת אופן ההתחלה'}</legend>
      <button type="button" onClick={() => onChoose({ kind: 'new' })} className="min-h-11 w-full rounded-xl bg-teal px-4 py-3 font-semibold text-white disabled:opacity-50">{en ? 'New listing' : 'מודעה חדשה'}</button>
      {hasLocalDraft && <div className="rounded-xl border border-card-border p-4">
        <p className="text-sm text-muted-text">{en ? 'A draft is saved on this device. Import it to keep editing across devices.' : 'יש טיוטה שמורה במכשיר הזה. אפשר לייבא אותה ולהמשיך גם במכשירים אחרים.'}</p>
        <button type="button" onClick={() => onChoose({ kind: 'import' })} className="mt-2 min-h-11 rounded-xl border border-card-border px-4 py-3 font-semibold text-teal disabled:opacity-50">{en ? 'Import draft from this device' : 'ייבוא טיוטה מהמכשיר'}</button>
      </div>}
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">{en ? 'Saved drafts' : 'טיוטות שמורות'}</h3>
        {loadState === 'loading' ? <p role="status" className="text-sm text-muted-text">{en ? 'Loading drafts…' : 'טוענים טיוטות…'}</p>
          : loadState === 'unavailable' ? <div role="alert" className="space-y-2 text-sm text-muted-text">
            <p>{en ? 'Could not load saved drafts.' : 'לא הצלחנו לטעון טיוטות שמורות.'}</p>
            {onRetry && <button type="button" onClick={onRetry} className="min-h-11 rounded-xl border border-card-border px-4 py-3 text-teal">{en ? 'Try again' : 'ניסיון נוסף'}</button>}
          </div> : !items.length ? <p className="text-sm text-muted-text">{en ? 'No saved drafts yet.' : 'עדיין אין טיוטות שמורות.'}</p>
            : <ul className="space-y-3" aria-label={en ? 'Choose a saved draft' : 'בחירת טיוטה שמורה'}>
              {items.map(item => {
                const title = item.title?.trim() || (en ? 'Untitled draft' : 'טיוטה ללא כותרת');
                return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border p-4">
                  <div className="min-w-0 flex-1 basis-44">
                    <h4 className="break-words font-semibold text-ink">{title}</h4>
                    {item.unavailable && <p className="mt-1 text-sm text-muted-text">{en ? 'Publication in progress' : 'הפרסום בתהליך'}</p>}
                    <p className="mt-1 text-sm text-muted-text">{item.kind === 'edit' ? (en ? 'Listing edit' : 'עריכת מודעה') : (en ? 'New listing' : 'מודעה חדשה')}</p>
                    <p className="mt-1 text-xs text-muted-text">{en ? 'Updated ' : 'עודכן ב־'}<time dateTime={item.updatedAt}>{date.format(new Date(item.updatedAt))}</time></p>
                  </div>
                  <button type="button" disabled={item.unavailable} aria-label={(en ? 'Continue: ' : 'המשך: ') + title} onClick={() => onChoose({ kind: 'continue', draftId: item.id, expectedRevision: item.revision })}
                    className="min-h-11 rounded-xl border border-card-border px-4 py-3 font-semibold text-teal disabled:opacity-50">{en ? 'Continue' : 'המשך'}</button>
                </li>;
              })}
            </ul>}
      </div>
    </fieldset>
  </section>;
}
