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
    setHome(value);
    setSaving(true);
    setMessage('');

    const { error } = await createClient()
      .from('profiles')
      .update({ default_home: value })
      .eq('id', userId);

    setSaving(false);
    setMessage(error ? 'לא הצלחנו לשמור את הבחירה.' : 'הבחירה נשמרה.');
    if (error) setHome(initialHome);
  }

  return (
    <div className="px-4 py-3">
      <p className="text-body-text mb-3">מסך פתיחה</p>
      <div className="flex gap-3">
        {(['discover', 'map'] as const).map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm text-body-text">
            <input
              type="radio"
              name="default-home"
              value={value}
              checked={home === value}
              disabled={saving}
              onChange={() => updateHome(value)}
            />
            {value === 'discover' ? 'חיפוש שותפים' : 'מפה'}
          </label>
        ))}
      </div>
      {message && <p role="status" className="text-xs text-muted-text mt-2">{message}</p>}
    </div>
  );
}
