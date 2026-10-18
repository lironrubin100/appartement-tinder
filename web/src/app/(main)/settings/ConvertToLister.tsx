'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button, Input } from '@/components/ui';
import { localePath, type Locale } from '@/utils/navigation';

export function ConvertToLister({
  locale,
  initialPhone,
  initialAgency,
}: {
  locale: Locale;
  initialPhone: string;
  initialAgency: string;
}) {
  const router = useRouter();
  const en = locale === 'en';
  const t = (he: string, english: string) => (en ? english : he);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const [agency, setAgency] = useState(initialAgency);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function convert() {
    if (!phone.trim() || !acknowledged || busy) return;
    setBusy(true);
    setError('');
    const { error: rpcError } = await createClient().rpc('convert_to_lister', {
      p_phone: phone,
      p_agency: agency || null,
    });
    setBusy(false);
    if (rpcError) {
      setError(
        rpcError.message.includes('active_group_membership')
          ? t('צריך לצאת מקבוצה פעילה לפני המעבר לחשבון מפרסם.', 'Leave an active group before switching to a property poster account.')
          : t('לא הצלחנו לעדכן את סוג החשבון. אפשר לנסות שוב.', 'We could not update the account type. Please try again.')
      );
      return;
    }
    router.replace(localePath('/my-listings', locale));
    router.refresh();
  }

  return (
    <section aria-labelledby="poster-account-heading" className="overflow-hidden rounded-shutaf-lg border border-card-border bg-white">
      <div className="px-4 py-4">
        <h2 id="poster-account-heading" className="font-semibold text-ink">
          {t('פרסום נכס', 'Property posting')}
        </h2>
        <p className="mt-1 text-sm text-muted-text">
          {t('פרסום דירה עבור אחרים, בלי פרופיל התאמה לשותפים.', 'Post a property for others without a roommate-matching profile.')}
        </p>
      </div>
      {!open ? (
        <div className="border-t border-card-border px-4 py-4">
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            {t('לעבור לחשבון מפרסם', 'Switch to a property poster account')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 border-t border-card-border px-4 py-4">
          <p className="text-sm text-muted-text">
            {t('אחרי המעבר הפרופיל לא יופיע ב־Discover ולא ניתן יהיה לשלוח פניות או Pass. שיחות קיימות נשמרות.', 'After switching, your profile will not appear in Discover and you cannot send introductions or passes. Existing chats are kept.')}
          </p>
          <Input
            label={t('טלפון פרטי ליצירת קשר', 'Private contact phone')}
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Input
            label={t('שם סוכנות, אם יש', 'Agency name, if applicable')}
            value={agency}
            maxLength={120}
            onChange={(event) => setAgency(event.target.value)}
          />
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>{t('אני מבינ/ה שהמעבר מסתיר את פרופיל הדייר שלי מ־Discover ומגביל פעולות חברתיות חדשות.', 'I understand this hides my resident profile from Discover and limits new social actions.')}</span>
          </label>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void convert()} disabled={busy || !phone.trim() || !acknowledged}>
              {busy ? t('מעדכנים…', 'Updating…') : t('אישור מעבר לחשבון מפרסם', 'Confirm property poster account')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {t('ביטול', 'Cancel')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
