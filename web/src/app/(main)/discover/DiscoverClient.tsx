'use client';
import { useState } from 'react';
import { Button, Modal, Avatar } from '@/components/ui';
import { createClient } from '@/utils/supabase/client';
import { localizedResidentFacts } from '@/lib/contracts/taxonomy';
import type { Locale } from '@/utils/navigation';
import type { Database } from '@/types/database';
type Person = Database['public']['Views']['profiles_public']['Row'];
type Group =
  Database['public']['Functions']['discover_groups']['Returns'][number];
export default function DiscoverClient({
  people: initialPeople,
  groups: initialGroups,
  locale,
  canParticipate,
}: {
  people: Person[];
  groups: Group[];
  locale: Locale;
  canParticipate: boolean;
}) {
  const en = locale === 'en',
    t = (he: string, eng: string) => (en ? eng : he);
  const [view, setView] = useState<'individual' | 'group'>('individual');
  const [people, setPeople] = useState(initialPeople);
  const [groups, setGroups] = useState(initialGroups);
  const [personCursor, setPersonCursor] = useState(
      initialPeople.at(-1)?.id ?? null
    ),
    [groupCursor, setGroupCursor] = useState(initialGroups.at(-1)?.id ?? null);
  const [morePeople, setMorePeople] = useState(initialPeople.length === 30),
    [moreGroups, setMoreGroups] = useState(initialGroups.length === 30);
  const [intro, setIntro] = useState(false),
    [message, setMessage] = useState(''),
    [ref, setRef] = useState('bio'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const item = view === 'individual' ? people[0] : groups[0];
  const members: Person[] =
    view === 'individual'
      ? people[0]
        ? [people[0]]
        : []
      : ((groups[0]?.members ?? []) as Person[]);
  const visibleTraits = (person: Person) => localizedResidentFacts('lifestyle_facts' in person ? person.lifestyle_facts : undefined, locale);
  function dismiss() {
    if (view === 'individual') setPeople((x) => x.slice(1));
    else setGroups((x) => x.slice(1));
    setIntro(false);
    setMessage('');
    setRef('bio');
  }
  async function act(pass: boolean) {
    if (!item?.id || busy) return;
    setBusy(true);
    setError('');
    const client = createClient();
    const result = pass
      ? await client.rpc('pass_discovery', { p_target: item.id, p_kind: view })
      : await client.rpc('send_introduction', {
          p_user: view === 'individual' ? item.id : null,
          p_group: view === 'group' ? item.id : null,
          p_message: message.trim(),
          p_ref_tag: ref,
        });
    setBusy(false);
    if (result.error) {
      setError(
        result.error.message.includes('daily_limit')
          ? t(
              'הגעת ל־20 פניות היום. אפשר להמשיך מחר.',
              'You’ve sent 20 introductions today. Come back tomorrow.'
            )
          : t('לא הצלחנו לשמור. נסו שוב.', 'Could not save. Please retry.')
      );
      return;
    }
    dismiss();
  }
  async function loadMore() {
    setBusy(true);
    setError('');
    const client = createClient();
    if (view === 'individual') {
      const r = await client.rpc('discover_individuals', {
        p_after: personCursor,
      });
      if (r.error)
        setError(
          t('לא הצלחנו לטעון. נסו שוב.', 'Could not load. Please retry.')
        );
      else {
        setPeople(r.data ?? []);
        setPersonCursor(r.data?.at(-1)?.id ?? personCursor);
        setMorePeople(r.data?.length === 30);
      }
    } else {
      const r = await client.rpc('discover_groups', { p_after: groupCursor });
      if (r.error)
        setError(
          t('לא הצלחנו לטעון. נסו שוב.', 'Could not load. Please retry.')
        );
      else {
        setGroups(r.data ?? []);
        setGroupCursor(r.data?.at(-1)?.id ?? groupCursor);
        setMoreGroups(r.data?.length === 30);
      }
    }
    setBusy(false);
  }
  return (
    <section className="min-h-[calc(100vh-80px)] bg-page-bg px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-3xl font-bold">
          {t('מוצאים שותפים', 'Find your roommates')}
        </h1>
        <div
          className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2"
          aria-label={t('חיפוש', 'Discover')}
        >
          {(['individual', 'group'] as const).map((v) => (
            <button
              key={v}
              disabled={busy}
              aria-pressed={view === v}
              onClick={() => {
                setView(v);
                setIntro(false);
                setError('');
              }}
              className={`rounded-xl px-4 py-3 font-semibold ${view === v ? 'bg-orange text-white' : 'text-ink'}`}
            >
              {v === 'individual'
                ? t('אנשים', 'Individuals')
                : t('קבוצות', 'Groups')}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
        {item ? (
          <article className="rounded-3xl border border-card-border bg-white p-6 space-y-5">
            {view === 'group' && (
              <header>
                <h2 className="text-2xl font-bold">{item.name}</h2>
                <p className="text-muted-text">
                  {members.length} {t('חברים', 'members')}
                </p>
              </header>
            )}
            {members.map((p) => (
              <section key={p.id ?? ''} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    initials={(p.name ?? '?').slice(0, 2)}
                    src={p.photo_url ?? undefined}
                    size="lg"
                  />
                  <h2 className="text-xl font-semibold">
                    {p.name}
                    {p.age !== null ? ` · ${p.age}` : ''}
                  </h2>
                </div>
                <details open={view === 'individual'}>
                  <summary className="cursor-pointer text-teal">
                    {view === 'group'
                      ? t('היכרות עם חבר/ת הקבוצה', 'Meet this member')
                      : t('קצת עליי', 'About me')}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap">{p.bio}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {visibleTraits(p).map((trait, index) => (
                      <span key={`${trait.field}:${index}`} className="rounded-full bg-orange-soft px-3 py-1 text-sm">
                        {trait.label}
                      </span>
                    ))}
                  </div>
                </details>
              </section>
            ))}
            {canParticipate ? (
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  disabled={busy}
                  className="flex-1"
                  onClick={() => void act(true)}
                >
                  {t('דילוג', 'Pass')}
                </Button>
                <Button
                  disabled={busy}
                  className="flex-1"
                  onClick={() => setIntro(true)}
                >
                  {t('שליחת היכרות', 'Introduce yourself')}
                </Button>
              </div>
            ) : (
              <p className="rounded-xl bg-orange-soft p-3 text-sm text-ink">
                {t(
                  'אפשר לעיין בפרופילים ובקבוצות. כדי ליצור היכרות או להצטרף לקבוצה, יש להשלים פרופיל דייר.',
                  'You can browse people and groups. Complete a resident profile to introduce yourself or join a group.'
                )}
              </p>
            )}
          </article>
        ) : (
          <div className="rounded-3xl bg-white p-8 text-center space-y-4">
            <p>
              {view === 'individual'
                ? t(
                    'אין עוד אנשים להציג כרגע.',
                    'No more people to show right now.'
                  )
                : t(
                    'אין עוד קבוצות להציג כרגע.',
                    'No more groups to show right now.'
                  )}
            </p>
            {(view === 'individual' ? morePeople : moreGroups) && (
              <Button disabled={busy} onClick={() => void loadMore()}>
                {t('טעינת עוד', 'Load more')}
              </Button>
            )}
          </div>
        )}
        <Modal
          isOpen={intro}
          onClose={() => !busy && setIntro(false)}
          title={t('היכרות חדשה', 'A new introduction')}
          size="sm"
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void act(false);
            }}
          >
            <label className="block space-y-2">
              <span>
                {t('מה משך את תשומת הלב שלך?', 'What caught your attention?')}
              </span>
              <select
                aria-label={t(
                  'מה משך את תשומת הלב שלך?',
                  'What caught your attention?'
                )}
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="w-full rounded-xl border border-card-border p-3"
              >
                <option value="bio">{t('הפרופיל', 'The profile')}</option>
                {members.flatMap((p) => visibleTraits(p).flatMap((trait) =>
                  trait.referenceValue === null ? [] : [
                    <option key={`${p.id}:${trait.field}:${trait.referenceValue}`}
                      value={`${p.id}:canonical.${trait.field}:${trait.referenceValue}`}>
                      {p.name} · {trait.label}
                    </option>
                  ]
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span>
                {t('הודעה אישית (לא חובה)', 'A personal message (optional)')}
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                className="w-full rounded-xl border border-card-border p-3"
                rows={4}
              />
            </label>
            {error && (
              <p role="alert" className="text-error">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy
                ? t('שולחים…', 'Sending…')
                : t('שליחת היכרות', 'Send introduction')}
            </Button>
          </form>
        </Modal>
      </div>
    </section>
  );
}
