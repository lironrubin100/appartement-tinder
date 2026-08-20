'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Modal, Button } from '@/components/ui';

const MODES = [
  { value: 'solo', label: '🏠 מחפש דירה' },
  { value: 'group', label: '👥 בקבוצה' },
  { value: 'room_filler', label: '➕ מחפש שותפים' },
] as const;

export function ModeSwitcher({ userId, currentMode }: { userId: string; currentMode: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const currentLabel = MODES.find((m) => m.value === currentMode)?.label ?? currentMode;

  async function selectMode(mode: string) {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ mode }).eq('id', userId);
    setBusy(false);
    if (!error) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3 border border-card-border rounded-shutaf-md hover:bg-neutral-bg-soft transition-colors"
      >
        <span className="text-body-text">כרגע: {currentLabel}</span>
        <span className="text-muted-text">›</span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="בחר/י מצב">
        <div className="flex flex-col gap-2">
          {MODES.map((mode) => (
            <Button
              key={mode.value}
              variant={mode.value === currentMode ? 'primary' : 'ghost'}
              disabled={busy}
              onClick={() => selectMode(mode.value)}
              className="w-full justify-start"
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </Modal>
    </>
  );
}
