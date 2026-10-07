import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';

const STATUS_LABEL: Record<string, string> = {
  active: 'פעילה',
  paused: 'מושהית',
  flagged: 'בבדיקה',
  taken: 'הושכרה',
};

export default async function MyListingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('mode')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.mode !== 'lister') redirect('/discover');

  const { data: listings } = await supabase
    .from('apartments')
    .select('id, title, address, price, photos, status, created_at')
    .eq('lister_id', user.id)
    .eq('source', 'user')
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto min-h-[calc(100vh-80px)] max-w-5xl bg-page-bg p-4 md:p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">המודעות שלי</h1>
          <p className="mt-1 text-sm text-muted-text">ניהול הדירות שפרסמת</p>
        </div>
        <Link href="/compose" className="rounded-xl bg-orange px-4 py-3 font-semibold text-white">+ הוספת מודעה</Link>
      </header>

      {!listings?.length ? (
        <section className="rounded-2xl border border-card-border bg-white p-8 text-center">
          <h2 className="font-semibold text-ink">עדיין אין לך מודעות</h2>
          <p className="mt-2 text-sm text-muted-text">כשתהיה מוכנה לפרסום, המודעות יופיעו כאן.</p>
        </section>
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => (
            <li key={listing.id} className="flex items-center gap-4 rounded-2xl border border-card-border bg-white p-4">
              {listing.photos[0] ? <img src={listing.photos[0]} alt="" className="h-20 w-24 rounded-xl object-cover" /> : <div className="h-20 w-24 rounded-xl bg-neutral-bg-soft" />}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-ink">{listing.title}</h2>
                <p className="text-sm text-muted-text">{listing.address ?? 'מיקום לא צוין'}</p>
                <p className="mt-1 font-semibold text-orange">₪{listing.price.toLocaleString()} לחודש</p>
              </div>
              <span className="shrink-0 rounded-full bg-neutral-bg-soft px-3 py-1 text-sm">{STATUS_LABEL[listing.status] ?? listing.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
