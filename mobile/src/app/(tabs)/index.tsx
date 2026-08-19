import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type Card = {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  vibe_tags: string[];
  is_verified: boolean;
};

const AUTO_PAUSE_DAYS = 14;

export default function Discover() {
  const { session } = useSession();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  // The message is pinned to a tag or to the bio — that pin is the whole point
  // of the interaction, so it lives in state next to the draft.
  const [draft, setDraft] = useState<{ to: Card; tag: string | null } | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);

    const { data: sent } = await supabase.from('likes').select('to_user').eq('from_user', session.user.id);
    const already = (sent ?? []).map((l) => l.to_user).filter(Boolean) as string[];

    const cutoff = new Date(Date.now() - AUTO_PAUSE_DAYS * 864e5).toISOString();
    let q = supabase
      .from('profiles')
      .select('id,name,photo_url,bio,vibe_tags,is_verified')
      .eq('onboarded', true)
      .neq('id', session.user.id)
      .gt('last_active_at', cutoff) // auto-pause, as a filter rather than a cron job
      .order('last_active_at', { ascending: false })
      .limit(50);
    if (already.length) q = q.not('id', 'in', `(${already.join(',')})`);

    const { data, error } = await q;
    if (error) Alert.alert('שגיאה', error.message);
    setCards((data as Card[]) ?? []);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendLike() {
    if (!draft || !session?.user || !message.trim()) return;
    const { error } = await supabase.from('likes').insert({
      from_user: session.user.id,
      to_user: draft.to.id,
      message: message.trim(),
      ref_tag: draft.tag,
    });
    if (error) return Alert.alert('שגיאה', error.message);
    setCards((c) => c.filter((x) => x.id !== draft.to.id));
    setDraft(null);
    setMessage('');
  }

  if (loading) return <Centered><ActivityIndicator /></Centered>;

  const top = cards[0];
  if (!top) {
    return (
      <Centered>
        <Text style={s.empty}>אין עוד פרופילים כרגע</Text>
        <Pressable onPress={load}><Text style={s.link}>רענון</Text></Pressable>
      </Centered>
    );
  }

  return (
    <View style={s.wrap}>
      <ScrollView style={s.card} contentContainerStyle={{ paddingBottom: 16 }}>
        {top.photo_url ? (
          <Image source={{ uri: top.photo_url }} style={s.photo} contentFit="cover" />
        ) : (
          <View style={[s.photo, s.photoEmpty]} />
        )}

        <View style={s.body}>
          <Text style={s.name}>
            {top.name} {top.is_verified ? '✓' : ''}
          </Text>

          <View style={s.tags}>
            {top.vibe_tags.map((t) => (
              <Pressable key={t} style={s.tag} onPress={() => setDraft({ to: top, tag: t })}>
                <Text style={s.tagText}>{t}</Text>
              </Pressable>
            ))}
          </View>

          {top.bio ? (
            <Pressable onPress={() => setDraft({ to: top, tag: null })}>
              <Text style={s.bio}>{top.bio}</Text>
            </Pressable>
          ) : null}
          <Text style={s.hint}>הקישו על תגית או על הביו כדי לשלוח הודעה</Text>
        </View>
      </ScrollView>

      <View style={s.actions}>
        <Pressable style={[s.action, s.pass]} onPress={() => setCards((c) => c.slice(1))}>
          <Text style={s.actionText}>דילוג</Text>
        </Pressable>
      </View>

      <Modal visible={!!draft} animationType="slide" transparent onRequestClose={() => setDraft(null)}>
        <View style={s.sheetBackdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>
              {draft?.tag ? `על "${draft.tag}"` : 'על הביו'} · {draft?.to.name}
            </Text>
            <TextInput
              style={s.input}
              placeholder="כתבו משהו אמיתי…"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable style={[s.action, s.pass, { flex: 1 }]} onPress={() => setDraft(null)}>
                <Text style={s.actionText}>ביטול</Text>
              </Pressable>
              <Pressable style={[s.action, s.like, { flex: 1 }]} onPress={sendLike}>
                <Text style={[s.actionText, { color: '#fff' }]}>שליחה</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={[s.wrap, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>{children}</View>;
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  card: { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fafafa' },
  photo: { width: '100%', height: 380, backgroundColor: '#eee' },
  photoEmpty: { backgroundColor: '#e3e3e3' },
  body: { padding: 16, gap: 10 },
  name: { fontSize: 24, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#ffe9e5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tagText: { color: '#E8543F', fontWeight: '600' },
  bio: { fontSize: 16, lineHeight: 22 },
  hint: { fontSize: 12, opacity: 0.45 },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 12 },
  action: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  pass: { backgroundColor: '#eee' },
  like: { backgroundColor: '#E8543F' },
  actionText: { fontWeight: '700', fontSize: 16 },
  empty: { fontSize: 16, opacity: 0.6 },
  link: { color: '#E8543F', fontWeight: '600' },
  sheetBackdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 20, gap: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: 'top' },
});
