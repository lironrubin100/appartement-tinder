'use client';

import { Button, Input, Modal } from '@/components/ui';

export default function ComposePage() {
  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)] p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-shutaf-lg shadow-sm border border-card-border p-6 md:p-8">
        <h1 className="text-3xl font-bold text-ink mb-8">פרסום דירה חדשה</h1>

        <form className="space-y-6">
          {/* Title */}
          <Input label="כותרת" placeholder="3-חדרים בבר-אילן" required />

          {/* Price */}
          <Input label="מחיר חודשי (₪)" placeholder="3500" type="number" required />

          {/* Location */}
          <Input label="מיקום" placeholder="בר-אילן, בעיר" required />

          {/* Bedrooms */}
          <Input label="מספר חדרים" placeholder="3" type="number" required />

          {/* Available From */}
          <Input label="זמין מ..." type="date" required />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">תיאור</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-shutaf-md border border-card-border bg-white text-ink placeholder:text-muted-text focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition-all"
              placeholder="ספר לנו על הדירה..."
              rows={4}
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">תמונות (עד 8)</label>
            <div className="border-2 border-dashed border-card-border rounded-shutaf-md p-8 text-center hover:bg-neutral-bg-soft transition-colors cursor-pointer">
              <div className="text-4xl mb-2">📸</div>
              <p className="text-body-text">לחץ להעלאה או גרור תמונות</p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">תגיות</label>
            <div className="flex flex-wrap gap-2">
              {['מזגן', 'חנייה', 'מרפסת', 'אינטרנט', 'כביסה'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="px-3 py-1.5 bg-neutral-bg hover:bg-orange hover:text-white text-ink rounded-full text-sm font-medium transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Button variant="primary" className="flex-1">
              ✅ פרסם דירה
            </Button>
            <Button variant="ghost" className="flex-1">
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
