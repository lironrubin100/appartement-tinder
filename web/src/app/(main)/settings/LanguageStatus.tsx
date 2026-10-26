import { Languages } from 'lucide-react';

export function LanguageStatus({ locale = 'he' }: { locale?: 'he' | 'en' }) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  return (
    <section aria-labelledby="language-heading" className="rounded-shutaf-lg border border-card-border bg-white">
      <div className="flex items-center gap-3 px-4 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-soft text-orange-dark">
          <Languages className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="language-heading" className="font-semibold text-ink">{t('שפה', 'Language')}</h2>
          <p className="text-sm text-muted-text">{t('שפת הממשק', 'Interface language')}</p>
        </div>
      </div>
      <div className="border-t border-card-border">
        {(['he', 'en'] as const).map(language => (
          <div key={language} className="flex items-center gap-3 px-4 py-4" aria-current={language === locale ? 'true' : undefined}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${language === locale ? 'border-orange' : 'border-card-border'}`} aria-hidden="true">
              {language === locale && <span className="h-2.5 w-2.5 rounded-full bg-orange" />}
            </span>
            <span className={language === locale ? 'font-medium text-ink' : 'text-muted-text'}>{language === 'he' ? 'עברית' : 'English'}</span>
            <span className="me-auto text-sm text-muted-text">{language === locale ? t('פעילה', 'Active') : t('זמינה', 'Available')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
