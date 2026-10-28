'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { markListingRented, reopenListing } from './actions';
import { type Locale } from '@/lib/listings/text';
import { Button } from '@/components/ui/Button';

type Props = { id: string; locale?: Locale; status?: 'active' | 'taken'; hasAvailableRooms?: boolean; intakeOpen?: boolean };
export function RentedButton(props: Props) {
  return <StatusControl key={`${props.id}:${props.status ?? 'active'}`} {...props} />;
}

function StatusControl({ id, locale = 'he', status = 'active', hasAvailableRooms = true, intakeOpen = true }: Props) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const [currentStatus, setCurrentStatus] = useState(status);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<'INVALID_LISTING' | 'AUTH_REQUIRED' | 'STATE_UNAVAILABLE' | 'FAILED' | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false), router = useRouter(), taken = currentStatus === 'taken';
  async function submit() {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError(null);
    try {
      const result = await (taken ? reopenListing(id) : markListingRented(id));
      if (result.error) setError(result.error);
      else { setCurrentStatus(result.status); setConfirming(false); router.refresh(); }
    } catch { setError('FAILED'); }
    finally { inFlight.current = false; setPending(false); }
  }
  const errorText = error === 'AUTH_REQUIRED' ? t('יש להתחבר מחדש ולטעון את העמוד.', 'Sign in again and reload the page.')
    : error === 'STATE_UNAVAILABLE' ? t('לא ניתן לשנות את מצב המודעה כעת. ייתכן שתוקפה פג או שקיימת מגבלה. רעננו ובדקו את מצבה.', 'This listing cannot change status now. It may have expired or be restricted. Refresh to check its status.')
      : t('לא הצלחנו לעדכן. המצב הקודם נשמר ואפשר לנסות שוב.', 'Could not update. The previous status is kept; you can retry.');
  return <div className="mt-3 min-w-0 space-y-2">
    {!hasAvailableRooms && <p className="text-sm text-body-text">{t('אין כרגע חדר פנוי. המודעה תישאר מחוץ לחיפוש עד לפתיחת חדר.', 'No room is currently available. The listing stays out of search until a room is opened.')}</p>}
    {!intakeOpen && <p className="text-sm text-body-text">{t('קבלת הפניות מושהית. החזרה לפעילות לא תפתח אותה.', 'Inquiry intake is paused. Reopening will not resume it.')}</p>}
    {!confirming ? <Button type="button" variant="secondary" className="min-h-11" onClick={() => { setConfirming(true); setError(null); }}>
      {taken ? t('החזרה לפעילות', 'Reopen listing') : t('סימון כהושכרה', 'Mark rented')}
    </Button> : <div className="space-y-2">
      <p className="text-sm text-body-text">{taken
        ? t('להחזיר את המודעה לפעילות? הגדרות החדרים וקבלת הפניות יישמרו. פונים קודמים יצטרכו לאשר מחדש.', 'Reopen this listing? Room and inquiry-intake settings stay unchanged. Previous pending requesters must reconfirm.')
        : t('הדירה הושכרה? המודעה תוסר מהדירות הזמינות. שיחות קיימות יישמרו.', 'Has the apartment been rented? It will leave available listings. Existing conversations are kept.')}</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" className="min-h-11" disabled={pending} onClick={() => void submit()}>
          {pending ? t('מעדכנים…', 'Updating…') : taken ? t('כן, החזרה לפעילות', 'Yes, reopen listing') : t('כן, הדירה הושכרה', 'Yes, mark rented')}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11" disabled={pending} onClick={() => { setConfirming(false); setError(null); }}>{t('ביטול', 'Cancel')}</Button>
      </div>
    </div>}
    {pending && <p role="status" className="text-sm text-body-text">{t('ממתינים לאישור השרת…', 'Waiting for server confirmation…')}</p>}
    {error && <p role="alert" className="text-sm text-ink">{errorText}</p>}
  </div>;
}
