import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type IncomingLike = {
  id: string;
  message: string;
  ref_tag: string | null;
  from_user: string;
  profiles: { name: string } | null;
};

export default function Chats() {
  const { session } = useSession();
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [convos, setConvos] = useState<{ id: string; preview: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setBusy(true);
    const [{ data: incoming }, { data: memberships }] = await Promise.all([
      supabase.from('likes')
        .select('id,message,ref_tag,from_user,profiles!likes_from_user_fkey(name)')
        .eq('to_user', session.user.id)
        .order('created_at', { ascending: false }),
      supabase.from('conversation_members').select('conversation_id').eq('user_id', session.user.id),
    ]);
    setLikes((incoming as unknown as IncomingLike[]) ?? []);

    const ids = (memberships ?? []).map((m) => m.conversation_id);
    if (ids.length) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id,body,created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false });
      const seen = new Map<string, string>();
      for (const m of msgs ?? []) if (!seen.has(m.conversation_id)) seen.set(m.conversation_id, m.body);
      setConvos(ids.map((id) => ({ id, preview: seen.get(id) ?? '' })));
    } else {
      setConvos([]);
    }
    setBusy(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Accepting a like IS the match. It is three writes that must all land or
  // none, and it writes a message on someone else's behalf — so it runs as one
  // security-definer RPC rather than three client calls.
  async function accept(like: IncomingLike) {
    const { error } = await supabase.rpc('accept_like', { p_like_id: like.id });
    if (error) return Alert.alert('שגיאה', error.message);
    load();
  }

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
      ListHeaderComponent={
        <>
          <Text style={s.h}>מחכים לתשובה ({likes.length})</Text>
          {likes.map((l) => (
            <View key={l.id} style={s.row}>
              <Text style={s.name}>{l.profiles?.name ?? 'משתמש'}</Text>
              {l.ref_tag ? <Text style={s.tag}>על "{l.ref_tag}"</Text> : null}
              <Text style={s.msg}>{l.message}</Text>
              <Pressable style={s.btn} onPress={() => accept(l)}>
                <Text style={s.btnText}>התחלת שיחה</Text>
              </Pressable>
            </View>
          ))}
          <Text style={[s.h, { marginTop: 20 }]}>שיחות</Text>
        </>
      }
      data={convos}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <View style={s.row}>
          <Text style={s.msg}>{item.preview || 'שיחה חדשה'}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={s.empty}>עוד אין שיחות</Text>}
    />
  );
}

const s = StyleSheet.create({
  h: { fontSize: 18, fontWeight: '700' },
  row: { backgroundColor: '#fafafa', borderRadius: 14, padding: 14, gap: 6 },
  name: { fontWeight: '700', fontSize: 16 },
  tag: { color: '#E8543F', fontSize: 13 },
  msg: { fontSize: 15, lineHeight: 21 },
  btn: { backgroundColor: '#E8543F', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#fff', fontWeight: '700' },
  empty: { opacity: 0.5, textAlign: 'center', paddingTop: 20 },
});
