'use client';

import { FormEvent, useState } from 'react';
import { SwipeCard, TagFilter } from '@/components/discovery';
import { Button, Modal } from '@/components/ui';
import { createClient } from '@/utils/supabase/client';

type Candidate = {
  id: string;
  name: string;
  age: number | null;
  photo: string | null;
  bio: string;
  tags: Array<{ label: string }>;
  verified: boolean;
};

export default function DiscoverPage({ currentUserId, candidates: initialCandidates }: { currentUserId: string; candidates: Candidate[] }) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [likedCandidate, setLikedCandidate] = useState<Candidate | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const candidate = candidates[0];

  function dismissCurrent() {
    setCandidates((current) => current.slice(1));
    setLikedCandidate(null);
    setMessage('');
    setError(null);
  }

  async function sendLike(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!likedCandidate || message.trim().length < 10 || sending) return;
    setSending(true);
    setError(null);
    const { error: insertError } = await createClient().from('likes').insert({
      from_user: currentUserId,
      to_user: likedCandidate.id,
      message: message.trim(),
      ref_tag: null,
    });
    if (insertError) {
      setError('לא הצלחנו לשלוח את הלייק. נסו שוב.');
      setSending(false);
      return;
    }
    dismissCurrent();
    setSending(false);
  }

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
            {candidate ? <SwipeCard
              id={candidate.id}
              name={candidate.name}
              age={candidate.age ?? 0}
              initials={candidate.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
              photo={candidate.photo ?? undefined}
              bio={candidate.bio}
              tags={candidate.tags}
              verified={candidate.verified}
              onLike={() => setLikedCandidate(candidate)}
              onPass={dismissCurrent}
            /> : <div className="bg-white border border-card-border rounded-shutaf-lg p-8 text-center text-muted-text">אין עוד פרופילים להציג כרגע.</div>}
          </div>
        </main>
      </div>
      <Modal isOpen={Boolean(likedCandidate)} onClose={() => !sending && setLikedCandidate(null)} title={likedCandidate ? `לשלוח לייק ל־${likedCandidate.name}` : undefined} size="sm">
        <form onSubmit={sendLike} className="space-y-4">
          <p className="text-sm text-body-text">הוסיפו הודעה אישית של לפחות 10 תווים כדי להתחיל שיחה טובה.</p>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} required minLength={10} className="w-full min-h-28 rounded-shutaf-md border border-card-border p-3 text-ink focus:outline-none focus:ring-2 focus:ring-orange" placeholder="היי, נראה לי שנוכל להסתדר מעולה כי…" />
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={message.trim().length < 10 || sending}>{sending ? 'שולחים…' : 'שליחת לייק'}</Button>
        </form>
      </Modal>
    </div>
  );
}
