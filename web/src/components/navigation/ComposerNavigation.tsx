'use client';

import { useEffect, useRef, useState } from 'react';
import { BottomNav } from './BottomNav';
import ComposeForm from '@/app/(main)/compose/ComposeForm';
import type { Locale } from '@/lib/listings/text';

export function ComposerNavigation({ accountId, locale, hasPrivatePhone }: { accountId: string; locale: Locale; hasPrivatePhone: boolean }) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return <>
    <BottomNav onCompose={() => { setStarted(true); setOpen(true); }} />
    <dialog ref={dialog} aria-label={locale === 'en' ? 'Publish an apartment' : 'פרסום דירה'}
      onCancel={(event) => { event.preventDefault(); setOpen(false); }}
      className="m-auto max-h-[95dvh] w-full max-w-3xl overflow-y-auto rounded-shutaf-lg border-0 p-0 backdrop:bg-black/50">
      {started && <ComposeForm accountId={accountId} locale={locale} requiresPrivatePhone={false} hasPrivatePhone={hasPrivatePhone}
        onClose={() => setOpen(false)} onPublished={() => { setOpen(false); setStarted(false); }} />}
    </dialog>
  </>;
}
