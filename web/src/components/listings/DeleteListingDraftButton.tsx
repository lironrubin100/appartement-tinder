'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { deleteListingCloudDraft } from '@/lib/listings/draft-delete';
import type { Locale } from '@/lib/listings/text';

export function DeleteListingDraftButton({ id, revision, deleting, locale }: {
  id: string; revision: number; deleting: boolean; locale: Locale;
}) {
  const en = locale === 'en', router = useRouter();
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null), [removed, setRemoved] = useState(false);
  const active = useRef(false);
  async function remove() {
    if (active.current || !window.confirm(en
      ? 'Delete this draft and its private photos? Published listings and their photos will stay unchanged.'
      : 'למחוק את הטיוטה ואת תמונותיה הפרטיות? מודעות שפורסמו ותמונותיהן יישארו ללא שינוי.')) return;
    active.current = true; setPending(true); setError(null);
    try {
      const auth = await createClient().auth.getUser();
      if (auth.error || !auth.data.user) throw Error('AUTH_REQUIRED');
      const result = await deleteListingCloudDraft(id, revision, auth.data.user.id);
      if (!result.ok) {
        setError(result.error.code === 'VERSION_CONFLICT'
          ? (en ? 'This draft changed. Refresh before deleting.' : 'הטיוטה השתנתה. יש לרענן לפני מחיקה.')
          : result.error.code === 'STATE_UNAVAILABLE'
            ? (en ? 'Publication must be reconciled before this draft can be deleted.' : 'צריך לבדוק את תוצאת הפרסום לפני מחיקת הטיוטה.')
            : (en ? 'Deletion was not completed. Retry cleanup; your other drafts are unchanged.' : 'המחיקה לא הושלמה. אפשר לנסות שוב את הניקוי; שאר הטיוטות ללא שינוי.'));
        router.refresh(); return;
      }
      setRemoved(true); router.refresh();
    } catch { setError(en ? 'Could not complete deletion. Try again.' : 'לא הצלחנו להשלים את המחיקה. אפשר לנסות שוב.'); }
    finally { active.current = false; setPending(false); }
  }
  const label = deleting ? (en ? 'Retry cleanup' : 'ניסיון ניקוי נוסף') : (en ? 'Delete draft' : 'מחיקת טיוטה');
  if (removed) return <p role="status" className="text-sm text-teal">{en ? 'Draft deleted.' : 'הטיוטה נמחקה.'}</p>;
  return <div className="max-w-full basis-44">
    {deleting && <p className="mb-2 text-sm text-muted-text">{en ? 'Deletion pending. This draft cannot be edited.' : 'המחיקה ממתינה. אי אפשר לערוך את הטיוטה.'}</p>}
    <button type="button" disabled={pending} onClick={() => void remove()} aria-label={label}
      className="rounded-xl border border-card-border px-4 py-3 font-semibold text-ink disabled:opacity-50">
      {pending ? (en ? 'Deleting…' : 'מוחק…') : label}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-ink">{error}</p>}
  </div>;
}
