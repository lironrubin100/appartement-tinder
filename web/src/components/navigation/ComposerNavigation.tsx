'use client';

import { useEffect, useRef, useState } from 'react';
import { BottomNav } from './BottomNav';
import ComposeForm, { type ComposeFormHandle } from '@/app/(main)/compose/ComposeForm';
import type { Locale } from '@/lib/listings/text';

export function ComposerNavigation({ accountId, locale, hasPrivatePhone }: { accountId: string; locale: Locale; hasPrivatePhone: boolean }) {
  const [open, setOpen] = useState(false);
  const form = useRef<ComposeFormHandle>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return <>
    <BottomNav onCompose={() => { setOpen(true); }} />
    <dialog ref={dialog} aria-label={locale === 'en' ? 'Publish an apartment' : 'פרסום דירה'}
      onCancel={(event) => { event.preventDefault(); void form.current?.saveAndClose(); }}
      className="m-auto max-h-[95dvh] w-full max-w-3xl overflow-y-auto rounded-shutaf-lg border-0 p-0 backdrop:bg-black/50">
      {open && <ComposeForm ref={form} accountId={accountId} locale={locale} requiresPrivatePhone={false} hasPrivatePhone={hasPrivatePhone}
        onClose={() => setOpen(false)} onPublished={() => setOpen(false)} />}
    </dialog>
  </>;
}
