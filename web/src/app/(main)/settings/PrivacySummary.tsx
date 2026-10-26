'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { localePath } from '@/utils/navigation';

export function PrivacySummary({ locale = 'he' }: { locale?: 'he' | 'en' }) {
  const [open, setOpen] = useState(false);
  const t = (he: string, en: string) => locale === 'en' ? en : he;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-shutaf-md px-4 py-4 text-start transition-colors hover:bg-neutral-bg-soft focus:outline-none focus:ring-2 focus:ring-orange"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-soft text-orange-dark">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-medium text-ink">{t('פרטיות הפרופיל', 'Profile privacy')}</span>
            <span className="block text-sm text-muted-text">{t('מה אנשים אחרים יכולים לראות', 'What other people can see')}</span>
          </span>
        </span>
        <span className="text-muted-text" aria-hidden="true">{locale === 'en' ? '›' : '‹'}</span>
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={t('פרטיות הפרופיל', 'Profile privacy')}
        footer={<Button variant="primary" onClick={() => setOpen(false)}>{t('סגור', 'Close')}</Button>}
      >
        <div className="space-y-6 text-sm leading-6 text-body-text">
          <section>
            <h3 className="mb-2 font-semibold text-ink">{t('מוצג בפרופיל הציבורי', 'Shown on your public profile')}</h3>
            <p>{t('שם, תמונות, גיל, תגיות אורח חיים וביו. תגי אימות מוצגים רק אם בחרת להציג אותם.', 'Name, photos, age, lifestyle traits and bio. Verification badges appear only if you choose to display them.')}</p>
          </section>
          <section>
            <h3 className="mb-2 font-semibold text-ink">{t('נשאר פרטי', 'Stays private')}</h3>
            <p>{t('מספר טלפון, כתובת דוא״ל, תקציב ותאריך מעבר מדויק. פניות לגבי דירות נשארות בתוך Shutaf.', 'Phone number, email address, budget and exact moving date. Apartment inquiries stay within Shutaf.')}</p>
          </section>
          <Link href={localePath('/profile/edit', locale)} onClick={() => setOpen(false)} className="inline-flex font-semibold text-orange hover:underline focus:outline-none focus:ring-orange focus:ring-2">
            {t('עריכת הפרופיל והתגים ←', 'Edit your profile and traits →')}
          </Link>
        </div>
      </Modal>
    </>
  );
}
