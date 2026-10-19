'use client';
import { residentFields, requiredResidentFields, taxonomy, type ResidentFacts, type ResidentField } from '@/lib/contracts/taxonomy';
import { residentLabel } from '@/lib/resident-profile';
import type { Locale } from '@/utils/navigation';

type Props = { bio: string; facts: ResidentFacts; preferences: Record<string, unknown>; disclosed: string[];
  onBio: (value: string) => void; onFacts: (value: ResidentFacts) => void; onPreferences: (value: Record<string, unknown>) => void;
  onDisclosed: (value: string[]) => void; locale: Locale };
export function ResidentFields({ bio, facts, preferences, disclosed, onBio, onFacts, onPreferences, onDisclosed, locale }: Props) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const inputClass = 'w-full rounded-xl border border-card-border bg-white p-3';
  function change(key: ResidentField, value: unknown) {
    const next = { ...facts, [key]: value };
    if (key === 'kitchen_rules' && value !== 'other') delete next.kitchen_other;
    if (key === 'pets' && !(value as { values?: string[] } | null)?.values?.includes('other')) delete next.pets_other;
    onFacts(next as ResidentFacts);
  }
  function renderField(key: ResidentField) {
    if (key === 'kitchen_other' && facts.kitchen_rules !== 'other') return null;
    if (key === 'pets_other' && !facts.pets?.values.includes('other')) return null;
    const field = residentFields[key];
    const required = (requiredResidentFields as readonly string[]).includes(key);
    const label = residentLabel(key, locale);
    const options = 'options' in field ? Object.entries(field.options) : [];
    const value = facts[key];
    const selected: string[] = typeof value === 'object' && value !== null && 'values' in value ? value.values : [];
    return <fieldset key={key} className="rounded-xl border border-card-border p-4 space-y-3">
      <legend className="px-1 font-medium">{label}{required ? t(' (חובה)', ' (required)') : ''}</legend>
      {field.kind === 'enum' ? <select aria-label={label} className={inputClass} value={typeof value === 'string' ? value : ''} onChange={e => change(key, e.target.value || null)}>
        <option value="">{t('ללא תשובה', 'Not answered')}</option>{options.map(([id, copy]) => <option key={id} value={id}>{copy[locale]}</option>)}
      </select> : field.kind === 'text' ? <input aria-label={label} className={inputClass} value={typeof value === 'string' ? value : ''} maxLength={field.max} onChange={e => change(key, e.target.value)} /> : <>
        <label className="flex gap-2 items-center"><input type="checkbox" checked={value != null} onChange={e => change(key, e.target.checked ? { answered: true, values: [] } : null)} />{t('עניתי על הסעיף (ללא בחירות = אין)', 'Answer this question (no selections means none)')}</label>
        {options.map(([id, copy]) => <label key={id} className="flex gap-2 items-center"><input type="checkbox" disabled={value == null} checked={selected.includes(id)} onChange={e => change(key, { answered: true, values: e.target.checked ? [...selected, id] : selected.filter(v => v !== id) })} />{copy[locale]}</label>)}
      </>}
      <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={disclosed.includes(key)} onChange={e => onDisclosed(e.target.checked ? [...disclosed, key] : disclosed.filter(k => k !== key))} />{t('להציג תשובה זו בפרופיל הציבורי', 'Show this answer on my public profile')}</label>
    </fieldset>;
  }
  const scored = Object.values(taxonomy).filter(c => c.weight > 0).flatMap(c => [...c.fields] as string[]).filter((key): key is ResidentField => key in residentFields && 'options' in residentFields[key as ResidentField]);
  function updatePreference(key: string, value: unknown) { onPreferences({ ...preferences, [key]: value }); }
  return <div className="space-y-5" data-testid="profile-facts">
    <label className="block space-y-2"><span className="font-medium">{t('קצת עליך (חובה)', 'A little about you (required)')}</span><textarea value={bio} maxLength={300} rows={3} className={inputClass} onChange={e => onBio(e.target.value)} /></label>
    <p className="text-sm text-muted-text">{t('התשובות נשמרות אצלך. רק תשובות שבחרת להציג יהיו ציבוריות.', 'Your answers stay private unless you choose to display them.')}</p>
    {requiredResidentFields.map(renderField)}
    <details className="rounded-xl border border-card-border p-4"><summary className="font-medium cursor-pointer">{t('עוד על אורח החיים שלי (אפשר להשלים בהמשך)', 'More about my lifestyle (complete later)')}</summary><div className="mt-4 space-y-4">{(Object.keys(residentFields) as ResidentField[]).filter(k => !(requiredResidentFields as readonly string[]).includes(k)).map(renderField)}</div></details>
    <details className="rounded-xl border border-card-border p-4" data-testid="profile-preferences"><summary className="font-medium cursor-pointer">{t('העדפות פרטיות לשותפים (לא חובה)', 'Private roommate preferences (optional)')}</summary>
      <p className="my-3 text-sm text-muted-text">{t('העדפות אינן מוצגות בפרופיל. בחירה מועדפת חייבת להיות גם מקובלת.', 'Preferences never appear on your profile. Preferred choices must also be accepted.')}</p>
      <div className="space-y-5">{scored.map(key => {
        const field = residentFields[key]; if (!('options' in field)) return null;
        if (key === 'pets') return <fieldset key={key} className="space-y-2"><legend>{residentLabel(key, locale)}</legend>
          <label className="flex gap-2"><input type="checkbox" checked={preferences.pet_preference_answered === true} onChange={e => {
            const next: Record<string, unknown> = { ...preferences, pet_preference_answered: e.target.checked };
            if (e.target.checked) next.accepted_pet_types = []; else delete next.accepted_pet_types; onPreferences(next);
          }} />{t('בחירת סוגי חיות שמקובלים עליי (ללא בחירות = אין)', 'Choose accepted pet types (no selections means none)')}</label>
          {Object.entries(field.options).map(([id, copy]) => <label key={id} className="flex gap-2"><input type="checkbox" disabled={preferences.pet_preference_answered !== true} checked={Array.isArray(preferences.accepted_pet_types) && preferences.accepted_pet_types.includes(id)} onChange={e => {
            const current = (preferences.accepted_pet_types ?? []) as string[]; updatePreference('accepted_pet_types', e.target.checked ? [...current, id] : current.filter(v => v !== id));
          }} />{copy[locale]}</label>)}</fieldset>;
        return <fieldset key={key} className="space-y-2"><legend className="font-medium">{residentLabel(key, locale)}</legend>{Object.entries(field.options).map(([id, copy]) => <div key={id} className="flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="w-full">{copy[locale]}</span>
          {(['accepted', 'preferred'] as const).map(kind => { const prefKey = `${kind}_${key}`; const values = (preferences[prefKey] ?? []) as string[];
            return <label key={kind} className="flex gap-2"><input type="checkbox" checked={values.includes(id)} onChange={e => {
              const next = { ...preferences, [prefKey]: e.target.checked ? [...values, id] : values.filter(v => v !== id) };
              if (kind === 'preferred' && e.target.checked) next[`accepted_${key}`] = Array.from(new Set([...((preferences[`accepted_${key}`] ?? []) as string[]), id]));
              if (kind === 'accepted' && !e.target.checked) next[`preferred_${key}`] = ((preferences[`preferred_${key}`] ?? []) as string[]).filter(v => v !== id); onPreferences(next);
            }} />{kind === 'accepted' ? t('מקובל', 'Accept') : t('מועדף', 'Prefer')}</label>;
          })}</div>)}</fieldset>;
      })}
      {(['strict_non_smoking', 'strict_no_pets'] as const).map(key => <label key={key} className="flex gap-2"><input type="checkbox" checked={preferences[key] === true} onChange={e => updatePreference(key, e.target.checked)} />{key === 'strict_non_smoking' ? t('ללא עישון — תנאי הכרחי', 'Non-smoking is required') : t('ללא חיות — תנאי הכרחי', 'No pets is required')}</label>)}
      <fieldset className="space-y-2"><legend>{t('שעות שקט מועדפות (פרטי)', 'Preferred quiet hours (private)')}</legend>{(['from', 'to'] as const).map(part => <label key={part} className="block">{part === 'from' ? t('משעה', 'From') : t('עד שעה', 'Until')}<input type="time" className={inputClass} value={String(preferences[`quiet_hours_${part}`] ?? '')} onChange={e => {
        const next = { ...preferences }; if (e.target.value) next[`quiet_hours_${part}`] = e.target.value; else delete next[`quiet_hours_${part}`]; onPreferences(next);
      }} /></label>)}<button type="button" className="text-teal underline text-sm" onClick={() => { const next = { ...preferences }; delete next.quiet_hours_from; delete next.quiet_hours_to; onPreferences(next); }}>{t('ניקוי שעות השקט', 'Clear quiet hours')}</button></fieldset>
      </div>
    </details>
  </div>;
}
