import { BottomNav } from '@/components/navigation';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Main content area */}
      <main className="flex-1 pb-24 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation (fixed) */}
      <BottomNav />
    </div>
  );
}
