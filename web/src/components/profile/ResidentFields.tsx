'use client';

import { localizedTags, type TagKey } from '@/utils/profileTags';
import type { Locale } from '@/utils/navigation';

export function ResidentFields({
  bio,
  tags,
  onBio,
  onTags,
  locale,
}: {
  bio: string;
  tags: Partial<Record<TagKey, string | null>>;
  onBio: (bio: string) => void;
  onTags: (tags: Partial<Record<TagKey, string | null>>) => void;
  locale: Locale;
}) {
  const en = locale === 'en';
  return (
    <div className="space-y-5">
      <label className="block space-y-2">
        <span className="font-medium">
          {en ? 'A little about you (optional)' : 'קצת עליך (לא חובה)'}
        </span>
        <textarea
          value={bio}
          maxLength={300}
          onChange={(e) => onBio(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-card-border p-3"
        />
      </label>
      <details className="rounded-xl border border-card-border p-4">
        <summary className="cursor-pointer font-medium">
          {en ? 'Your lifestyle (optional)' : 'אורח החיים שלך (לא חובה)'}
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {localizedTags(locale).map((c) => (
            <label key={c.key} className="block space-y-1">
              <span className="text-sm">{c.label}</span>
              <select
                aria-label={c.label}
                value={tags[c.key] ?? ''}
                onChange={(e) =>
                  onTags({ ...tags, [c.key]: e.target.value || null })
                }
                className="w-full rounded-xl border border-card-border bg-white p-3"
              >
                <option value="">
                  {en ? 'Prefer not to say' : 'ללא בחירה'}
                </option>
                {c.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
