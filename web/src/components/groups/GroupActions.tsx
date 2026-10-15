'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal } from '@/components/ui';
import { createClient } from '@/utils/supabase/client';
import { localePath, type Locale } from '@/utils/navigation';

export type Contact = { id: string; name: string };
export function GroupActions({
  contacts,
  locale,
  group,
}: {
  contacts: Contact[];
  locale: Locale;
  group?: {
    id: string;
    admin: boolean;
    policy: string;
    members: Contact[];
    currentUserId: string;
  };
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [selected, setSelected] = useState<string[]>([]);
  const [policy, setPolicy] = useState(group?.policy ?? 'admin'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter(),
    en = locale === 'en',
    t = (he: string, eng: string) => (en ? eng : he);
  const available = contacts.filter(
    (c) => !group?.members.some((m) => m.id === c.id)
  );
  async function create() {
    setBusy(true);
    setError('');
    const { data, error: e } = await createClient().rpc(
      'create_group_from_chats',
      { p_name: name, p_contacts: selected, p_policy: policy }
    );
    setBusy(false);
    if (e || !data) {
      setError(
        t(
          'לא הצלחנו ליצור קבוצה. נסו שוב.',
          'Could not create the group. Please retry.'
        )
      );
      return;
    }
    router.push(localePath(`/chats/${data}`, locale));
    router.refresh();
    setOpen(false);
  }
  async function invite(id: string) {
    if (!group) return;
    setBusy(true);
    setError('');
    const { error: e } = await createClient().rpc('invite_group_contact', {
      p_group: group.id,
      p_contact: id,
    });
    setBusy(false);
    if (e)
      setError(t('לא הצלחנו לשלוח הזמנה.', 'Could not send the invitation.'));
    else {
      setError(
        t(
          'ההזמנה נשלחה. מצטרפים רק לאחר אישור.',
          'Invitation sent. They join after accepting.'
        )
      );
      router.refresh();
    }
  }
  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {group
          ? t('פרטי הקבוצה', 'Group details')
          : t('יצירת קבוצה', 'Create a group')}
      </Button>
      <Modal
        isOpen={open}
        onClose={() => !busy && setOpen(false)}
        title={
          group
            ? t('הקבוצה שלנו', 'Our group')
            : t('יוצרים קבוצה', 'Create a group')
        }
        size="sm"
      >
        <div className="space-y-4">
          {!group && (
            <label className="block space-y-1">
              <span>{t('שם הקבוצה', 'Group name')}</span>
              <input
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-card-border p-3"
              />
            </label>
          )}
          {(!group || group.admin) && (
            <label className="block space-y-1">
              <span>{t('מי מאשר מצטרפים?', 'Who approves new members?')}</span>
              <select
                aria-label={t('מי מאשר מצטרפים?', 'Who approves new members?')}
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
                className="w-full rounded-xl border border-card-border bg-white p-3"
              >
                <option value="admin">
                  {t('מנהל/ת הקבוצה', 'Group admin')}
                </option>
                <option value="any_member">
                  {t('כל חבר/ת קבוצה', 'Any member')}
                </option>
                <option value="majority">
                  {t('רוב חברי הקבוצה', 'A majority of members')}
                </option>
              </select>
            </label>
          )}
          {group && group.admin && (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const { error: e } = await createClient().rpc(
                  'configure_group',
                  { p_group: group.id, p_policy: policy }
                );
                setBusy(false);
                if (e) setError(t('השמירה נכשלה.', 'Could not save.'));
                else {
                  router.refresh();
                  setOpen(false);
                }
              }}
            >
              {t('שמירת הגדרה', 'Save setting')}
            </Button>
          )}
          <p className="text-sm text-muted-text">
            {t(
              'עד ארבעה חברים. מצטרפים רואים רק הודעות חדשות.',
              'Up to four members. New members see only new messages.'
            )}
          </p>
          {group?.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3">
              <span>{m.name}</span>
              {((group.admin && m.id !== group.currentUserId) ||
                (!group.admin && m.id === group.currentUserId)) && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const { error: e } = await createClient().rpc(
                      'remove_group_member',
                      { p_group: group.id, p_member: m.id }
                    );
                    setBusy(false);
                    if (e)
                      setError(
                        t('הפעולה נכשלה.', 'Could not update membership.')
                      );
                    else {
                      if (m.id === group.currentUserId)
                        router.push(localePath('/chats', locale));
                      router.refresh();
                    }
                  }}
                >
                  {m.id === group.currentUserId
                    ? t('יציאה', 'Leave')
                    : t('הסרה', 'Remove')}
                </Button>
              )}
            </div>
          ))}
          {(!group || group.admin) && (
            <div className="space-y-3">
              <h3 className="font-semibold">
                {t(
                  'הזמנת אנשים שכבר התחברת אליהם',
                  'Invite your accepted connections'
                )}
              </h3>
              {!available.length && (
                <p className="text-sm text-muted-text">
                  {t(
                    'אחרי קבלת היכרות, אפשר להזמין מכאן.',
                    'Once an introduction is accepted, you can invite that connection here.'
                  )}
                </p>
              )}
              {available.map((c) =>
                group ? (
                  <div key={c.id} className="flex justify-between gap-3">
                    <span>{c.name}</span>
                    <Button
                      size="sm"
                      disabled={busy || group.members.length >= 4}
                      onClick={() => void invite(c.id)}
                    >
                      {t('הזמנה', 'Invite')}
                    </Button>
                  </div>
                ) : (
                  <label key={c.id} className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      disabled={
                        !selected.includes(c.id) && selected.length >= 3
                      }
                      onChange={(e) =>
                        setSelected((ids) =>
                          e.target.checked
                            ? [...ids, c.id]
                            : ids.filter((id) => id !== c.id)
                        )
                      }
                    />
                    {c.name}
                  </label>
                )
              )}
            </div>
          )}
          {error && (
            <p role="status" className="text-sm text-body-text">
              {error}
            </p>
          )}
          {!group && (
            <Button
              className="w-full"
              disabled={busy || !name.trim() || !selected.length}
              onClick={() => void create()}
            >
              {t('יצירה ושליחת הזמנות', 'Create and send invitations')}
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}
