import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { BottomNav } from '@/components/navigation';
import Link from 'next/link';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded, mode')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.onboarded) redirect('/onboarding');

  const isLister = profile.mode === 'lister';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main content area */}
      <main className="flex-1 pb-24 md:pb-0">
        {isLister && (
          <div className="border-b border-card-border bg-white px-4 py-3">
            <Link href="/my-listings" className="font-medium text-orange">המודעות שלי</Link>
          </div>
        )}
        {children}
      </main>

      {/* Mobile bottom navigation (fixed) */}
      {!isLister && <BottomNav />}
    </div>
  );
}
