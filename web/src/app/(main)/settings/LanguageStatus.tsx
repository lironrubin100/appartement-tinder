import { Languages } from 'lucide-react';

export function LanguageStatus() {
  return (
    <section aria-labelledby="language-heading" className="rounded-shutaf-lg border border-card-border bg-white">
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-soft text-orange-dark">
          <Languages className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="language-heading" className="font-semibold text-ink">שפה</h2>
          <p className="text-sm text-muted-text">שפת הממשק</p>
        </div>
      </div>
      <div className="border-t border-card-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-orange" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-orange" /></span>
          <span className="font-medium text-ink">עברית</span>
          <span className="me-auto text-sm text-muted-text">פעילה</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-4 text-muted-text" aria-disabled="true">
          <span className="h-5 w-5 rounded-full border-2 border-card-border" aria-hidden="true" />
          <span>English</span>
          <span className="me-auto text-sm">בקרוב</span>
        </div>
      </div>
    </section>
  );
}
