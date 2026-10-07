'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export function DefaultHomeSelect({
  userId,
  initialHome,
}: {
  userId: string;
  initialHome: 'discover' | 'map';
}) {
  const [home, setHome] = useState(initialHome);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function updateHome(value: 'discover' | 'map') {
    if (value === home || saving) return;
    const previousHome = home;
    setHome(value);
    setSaving(true);
    setMessage('');

    const { error } = await createClient()
      .from('profiles')
      .update({ default_home: value })
      .eq('id', userId);

    setSaving(false);
    setMessage(error ? 'לא הצלחנו לשמור את הבחירה.' : 'הבחירה נשמרה.');
    if (error) setHome(previousHome);
  }

  return (
    <fieldset className="px-4 py-4">
      <legend className="font-medium text-ink">מסך פתיחה</legend>
      <p className="mt-1 text-sm text-muted-text">המסך שיוצג בכל פתיחה של האפליקציה</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(['discover', 'map'] as const).map((value) => (
          <label
            key={value}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-shutaf-md border px-3 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-orange ${home === value ? 'border-orange bg-orange-soft text-ink' : 'border-card-border text-body-text hover:bg-neutral-bg-soft'} ${saving ? 'cursor-wait opacity-70' : ''}`}
          >
            <input
              type="radio"
              name="default-home"
              value={value}
              checked={home === value}
              disabled={saving}
              onChange={() => updateHome(value)}
              className="h-4 w-4 accent-orange"
            />
            {value === 'discover' ? 'חיפוש שותפים' : 'מפה'}
          </label>
        ))}
      </div>
      {message && <p role="status" className="mt-2 text-xs text-muted-text">{message}</p>}
    </fieldset>
  );
}
