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
  const [message, setMessage] = useState('');
  const supabase = createClient();

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const next = !enabled;
    const { error } = await supabase
      .from('profiles')
      .update({ notifications_enabled: next })
      .eq('id', userId);
    if (error) {
      setMessage('לא הצלחנו לשמור את ההעדפה. נסו שוב.');
    } else {
      setEnabled(next);
    }
    setBusy(false);
  }

  return (
    <div className="shrink-0 text-end">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        role="switch"
        aria-checked={enabled}
        aria-label="התראות באימייל"
        className={`flex h-7 w-12 items-center rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 ${enabled ? 'justify-start bg-orange' : 'justify-end bg-neutral-bg'}`}
        dir="ltr"
      >
        <span aria-hidden="true" className="h-6 w-6 rounded-full bg-white shadow-sm" />
      </button>
      {message && <p role="status" className="mt-2 max-w-44 text-xs text-error">{message}</p>}
    </div>
  );
}
