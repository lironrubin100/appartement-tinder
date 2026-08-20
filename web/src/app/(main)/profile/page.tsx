'use client';

import { Avatar, Button, Badge, Input } from '@/components/ui';

export default function ProfilePage() {
  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        {/* Header */}
        <div className="border-b border-card-border px-6 py-8">
          <h1 className="text-3xl font-bold text-ink">הפרופיל שלי</h1>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Profile Picture & Name */}
          <div className="flex items-center gap-6">
            <Avatar
              initials="AR"
              size="xl"
              verified={true}
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
            />
            <div>
              <h2 className="text-2xl font-bold text-ink">Ari Rubin</h2>
              <p className="text-body-text">בן 22 · סטודנט באוניברסיטת בן-גוריון</p>
              <Badge variant="success" className="mt-2">
                אימות דוא״ל
              </Badge>
            </div>
          </div>

          {/* Bio */}
          <div>
            <h3 className="font-semibold text-ink mb-2">ביו</h3>
            <p className="text-body-text">
              Love tech, board games, and good conversations. Looking for clean, organized roommates.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="border-b border-card-border pb-6">
            <h3 className="font-semibold text-ink mb-3">מצב נוכחי</h3>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary">🏠 מחפש דירה</Button>
              <Button variant="secondary">👥 בקבוצה</Button>
              <Button variant="ghost">➕ מחפש שותפים</Button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-semibold text-ink mb-3">התגים שלי</h3>
            <div className="flex flex-wrap gap-2">
              <Badge>נקייה</Badge>
              <Badge>בוקר מוקדם</Badge>
              <Badge>חברתית</Badge>
              <Badge>טבעונית</Badge>
            </div>
          </div>

          {/* Settings */}
          <div className="border-b border-card-border pb-6 space-y-4">
            <h3 className="font-semibold text-ink">הגדרות</h3>
            <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
              <span className="text-body-text">🌐 שפה</span>
              <span className="float-end text-muted-text">עברית (תמיד)</span>
            </button>
            <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
              <span className="text-body-text">🔔 הודעות</span>
              <span className="float-end text-success">פעיל</span>
            </button>
            <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
              <span className="text-body-text">🔒 פרטיות</span>
              <span className="float-end text-muted-text">הצג עוד</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="space-y-3">
            <Button variant="danger" className="w-full">
              🗑️ מחק חשבון
            </Button>
            <button className="w-full text-error text-sm hover:underline">
              התנתק
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
