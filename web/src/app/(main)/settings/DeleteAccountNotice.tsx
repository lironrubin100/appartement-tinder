'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

export function DeleteAccountNotice({ locale = 'he' }: { locale?: 'he' | 'en' }) {
  const [open, setOpen] = useState(false);
  const t = (he: string, en: string) => locale === 'en' ? en : he;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-start transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-error"
      >
        <span className="flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-error" aria-hidden="true" />
          <span>
            <span className="block font-medium text-error">{t('מחיקת חשבון', 'Delete account')}</span>
            <span className="mt-1 block text-sm text-muted-text">{t('פעולה בלתי הפיכה לאחר אישור הבקשה', 'Irreversible after the request is confirmed')}</span>
          </span>
        </span>
        <span className="text-muted-text" aria-hidden="true">{locale === 'en' ? '›' : '‹'}</span>
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={t('מחיקת חשבון', 'Delete account')}
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>{t('הבנתי', 'Got it')}</Button>}
      >
        <div className="space-y-4 text-sm leading-6 text-body-text">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-error">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <p>{t('מחיקת חשבון עדיין אינה זמינה באפליקציה. לפני שנאפשר אותה, צריך לסגור את מדיניות שמירת הנתונים ואת תקופת החסד למחיקה.', 'Account deletion is not available in the app yet. Data retention and the deletion grace period must be finalized before it is enabled.')}</p>
          <p>{t('לא נמחק שום מידע כאשר סוגרים את החלון הזה.', 'Closing this dialog does not delete any data.')}</p>
        </div>
      </Modal>
    </>
  );
}
