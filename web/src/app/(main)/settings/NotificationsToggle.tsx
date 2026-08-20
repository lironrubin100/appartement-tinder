'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export function NotificationsToggle({
  userId,
  initialEnabled,
}: {
  userId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function toggle() {
    setBusy(true);
    const next = !enabled;
    const { error } = await supabase
      .from('profiles')
      .update({ notifications_enabled: next })
      .eq('id', userId);
    setBusy(false);
    if (!error) setEnabled(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      role="switch"
      aria-checked={enabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-orange' : 'bg-neutral-bg'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-0.5' : 'translate-x-5'}`}
      />
    </button>
  );
}
