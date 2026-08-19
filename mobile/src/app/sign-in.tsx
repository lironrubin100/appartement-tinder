import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/lib/session';

export default function SignIn() {
  const { signIn } = useSession();
  const [busy, setBusy] = useState(false);

  async function go(provider: 'google' | 'apple') {
    setBusy(true);
    try {
      await signIn(provider);
    } catch (e) {
      Alert.alert('ההתחברות נכשלה', String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>מוצאים דירה. ביחד.</Text>
      <Text style={s.sub}>שותפים ודירות לסטודנטים בבאר שבע</Text>

      <Pressable style={s.btn} disabled={busy} onPress={() => go('google')}>
        <Text style={s.btnText}>המשך עם Google</Text>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Pressable style={[s.btn, s.apple]} disabled={busy} onPress={() => go('apple')}>
          <Text style={[s.btnText, { color: '#fff' }]}>המשך עם Apple</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 16, opacity: 0.6, textAlign: 'center', marginBottom: 32 },
  btn: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  apple: { backgroundColor: '#000', borderColor: '#000' },
  btnText: { fontSize: 16, fontWeight: '600' },
});
