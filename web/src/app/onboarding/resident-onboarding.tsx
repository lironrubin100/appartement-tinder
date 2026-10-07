'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui';

type Branch = 'resident' | 'lister';

export function ResidentOnboarding({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [name, setName] = useState(initialName);
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function finishOnboarding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branch || !name.trim()) return;
    if (branch === 'resident' && !birthDate) {
      setError('יש להזין תאריך לידה כדי להציג גיל בפרופיל.');
      return;
    }
    if (branch === 'lister' && !phone.trim()) {
      setError('מספר טלפון נדרש לפרסום נכס.');
      return;
    }

    setSaving(true);
    setError('');
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError('פג תוקף ההתחברות. יש להתחבר מחדש.');
      setSaving(false);
      return;
    }

    const profileUpdate = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        mode: branch === 'resident' ? 'solo' : 'lister',
        onboarded: true,
      })
      .eq('id', user.id);

    if (profileUpdate.error) {
      setError('לא הצלחנו לשמור את הפרופיל. אפשר לנסות שוב.');
      setSaving(false);
      return;
    }

    // These fields are private by B9/B2 and live only in profile_private.
    const privateUpdate: { birth_date?: string | null; phone?: string | null; agency_name?: string | null } = {};
    if (branch === 'resident') {
      privateUpdate.birth_date = birthDate;
      privateUpdate.phone = phone.trim() || null;
    } else {
      privateUpdate.phone = phone.trim();
      privateUpdate.agency_name = agencyName.trim() || null;
    }

    const { error: privateError } = await supabase
      .from('profile_private')
      .update(privateUpdate)
      .eq('profile_id', user.id);

    if (privateError) {
      // Keep the user gated if private onboarding data did not persist.
      await supabase.from('profiles').update({ onboarded: false }).eq('id', user.id);
      setError('לא הצלחנו לשמור את הפרטים הפרטיים. אפשר לנסות שוב.');
      setSaving(false);
      return;
    }

    router.replace(branch === 'lister' ? '/my-listings' : '/discover');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-page-bg px-6 py-12 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-primary">Shutaf</p>
          <h1 className="text-2xl font-bold text-ink">בואו נכיר</h1>
          <p className="text-body-text">הפרטים עוזרים להתאים את החוויה. פרטי קשר ותאריך הלידה נשארים פרטיים.</p>
        </div>

        {!branch ? (
          <div className="space-y-3">
            <p className="font-semibold text-ink">האם תגור/י בדירה?</p>
            <Button variant="primary" size="lg" className="w-full" onClick={() => setBranch('resident')}>
              כן, אני מחפש/ת שותפים
            </Button>
            <Button variant="secondary" size="lg" className="w-full" onClick={() => setBranch('lister')}>
              לא, אני מפרסם/ת נכס עבור אחרים
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={finishOnboarding}>
            <button type="button" className="text-sm text-body-text underline" onClick={() => setBranch(null)}>
              חזרה לבחירה
            </button>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">{branch === 'resident' ? 'איך להציג את שמך?' : 'שם מלא'}</span>
              <input className="w-full rounded-xl border border-border p-3" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} autoComplete="name" />
            </label>

            {branch === 'resident' ? (
              <>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">תאריך לידה</span>
                  <input className="w-full rounded-xl border border-border p-3" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required autoComplete="bday" />
                  <span className="text-xs text-body-text">הגיל יוצג בפרופיל; תאריך הלידה עצמו פרטי.</span>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">טלפון (לא חובה)</span>
                  <input className="w-full rounded-xl border border-border p-3" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
                  <span className="text-xs text-body-text">מספר הטלפון נשאר פרטי.</span>
                </label>
              </>
            ) : (
              <>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">טלפון ליצירת קשר</span>
                  <input className="w-full rounded-xl border border-border p-3" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required autoComplete="tel" />
                  <span className="text-xs text-body-text">מספר הטלפון נשמר בפרטים הפרטיים ואינו מוצג בפרופיל.</span>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-ink">שם סוכנות (לא חובה)</span>
                  <input className="w-full rounded-xl border border-border p-3" value={agencyName} onChange={(event) => setAgencyName(event.target.value)} maxLength={120} />
                </label>
              </>
            )}

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <Button variant="primary" size="lg" className="w-full" type="submit" disabled={saving}>
              {saving ? 'שומרים…' : 'המשך'}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
