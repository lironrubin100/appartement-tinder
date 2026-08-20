'use client';

import { SwipeCard, TagFilter } from '@/components/discovery';
import { Button } from '@/components/ui';

export default function DiscoverPage() {
  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="md:col-span-1 bg-white rounded-shutaf-lg p-6 border border-card-border h-fit sticky top-4">
          <h2 className="text-lg font-bold text-ink mb-6">סנן חיפוש</h2>

          <TagFilter
            title="תנאי חיים"
            options={[
              { id: 'clean', label: 'נקי' },
              { id: 'organized', label: 'מסודר' },
              { id: 'casual', label: 'משופשף' },
            ]}
            selected={[]}
            onChange={() => {}}
            collapsible={true}
          />

          <TagFilter
            title="לוח זמנים"
            options={[
              { id: 'morning', label: 'בוקר' },
              { id: 'evening', label: 'ערב' },
              { id: 'night', label: 'לילה' },
            ]}
            selected={[]}
            onChange={() => {}}
            collapsible={true}
          />
        </aside>

        {/* Main Feed */}
        <main className="md:col-span-3 flex justify-center">
          <div className="w-full max-w-sm">
            <SwipeCard
              id="1"
              name="Sarah"
              age={22}
              initials="SR"
              photo="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop"
              bio="Love cooking, board games, and hiking. Looking for a cozy shared apartment."
              tags={[
                { label: 'נקייה' },
                { label: 'ערה מוקדמת' },
                { label: 'חברתית' },
              ]}
              matchPercentage={87}
              verified={true}
              onLike={(id) => console.log('Liked:', id)}
              onPass={(id) => console.log('Passed:', id)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
