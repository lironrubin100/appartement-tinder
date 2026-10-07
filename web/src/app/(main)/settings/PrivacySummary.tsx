'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Modal, Button } from '@/components/ui';

export function PrivacySummary() {
  const [open, setOpen] = useState(false);

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
            <span className="block font-medium text-ink">פרטיות הפרופיל</span>
            <span className="block text-sm text-muted-text">מה אנשים אחרים יכולים לראות</span>
          </span>
        </span>
        <span className="text-muted-text" aria-hidden="true">‹</span>
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="פרטיות הפרופיל"
        footer={<Button variant="primary" onClick={() => setOpen(false)}>סגור</Button>}
      >
        <div className="space-y-6 text-sm leading-6 text-body-text">
          <section>
            <h3 className="mb-2 font-semibold text-ink">מוצג בפרופיל הציבורי</h3>
            <p>שם, תמונות, גיל, תגיות אורח חיים וביו. תגי אימות מוצגים רק אם בחרת להציג אותם.</p>
          </section>
          <section>
            <h3 className="mb-2 font-semibold text-ink">נשאר פרטי</h3>
            <p>מספר טלפון, כתובת דוא״ל, תקציב ותאריך מעבר מדויק. פניות לגבי דירות נשארות בתוך Shutaf.</p>
          </section>
          <Link href="/profile/edit" onClick={() => setOpen(false)} className="inline-flex font-semibold text-orange hover:underline focus:outline-none focus:ring-2 focus:ring-orange">
            עריכת הפרופיל והתגים ←
          </Link>
        </div>
      </Modal>
    </>
  );
}
