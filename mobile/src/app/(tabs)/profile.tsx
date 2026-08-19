import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSession, type Profile } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const MODES: { key: Profile['mode']; label: string }[] = [
  { key: 'solo', label: 'לבד' },
  { key: 'group', label: 'בקבוצה' },
  { key: 'room_filler', label: 'מחפש שותף לדירה שלי' },
  { key: 'lister', label: 'משכיר' },
];

// Kept short on purpose — a long tag list makes every profile look identical.
const VIBE_TAGS = [
  'שקט בערבים', 'מעשן', 'לא מעשן', 'טבעוני', 'חיית מחמד',
  'לומד הרבה', 'אוהב אירוח', 'קם מוקדם', 'ינשוף לילה', 'מסודר',
];

export default function ProfileTab() {
  const { profile, signOut, refreshProfile } = useSession();
  const [draft, setDraft] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setDraft(profile);
  }, [profile?.id]);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: draft.name,
        bio: draft.bio,
        mode: draft.mode,
        vibe_tags: draft.vibe_tags ?? [],
        budget_min: draft.budget_min,
        budget_max: draft.budget_max,
        onboarded: true,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) return Alert.alert('שגיאה', error.message);
    refreshProfile();
    Alert.alert('נשמר');
  }

  function toggleTag(tag: string) {
    const current = draft.vibe_tags ?? [];
    setDraft({
      ...draft,
      vibe_tags: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    });
  }

  if (!profile) return null;

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h}>הפרופיל שלי {profile.is_verified ? '✓' : ''}</Text>

      <TextInput
        style={s.input}
        value={draft.name ?? ''}
        onChangeText={(name) => setDraft({ ...draft, name })}
        placeholder="שם"
      />
      <TextInput
        style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]}
        value={draft.bio ?? ''}
        onChangeText={(bio) => setDraft({ ...draft, bio })}
        placeholder="קצת עליי"
        multiline
        maxLength={300}
      />

      <Text style={s.label}>אני מחפש</Text>
      <View style={s.row}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={[s.chip, draft.mode === m.key && s.chipOn]}
            onPress={() => setDraft({ ...draft, mode: m.key })}>
            <Text style={draft.mode === m.key ? s.chipTextOn : s.chipText}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.label}>וייב</Text>
      <View style={s.row}>
        {VIBE_TAGS.map((t) => (
          <Pressable
            key={t}
            style={[s.chip, draft.vibe_tags?.includes(t) && s.chipOn]}
            onPress={() => toggleTag(t)}>
            <Text style={draft.vibe_tags?.includes(t) ? s.chipTextOn : s.chipText}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.label}>תקציב לחודש (₪)</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          keyboardType="number-pad"
          value={draft.budget_min?.toString() ?? ''}
          onChangeText={(v) => setDraft({ ...draft, budget_min: v ? Number(v) : null })}
          placeholder="מ־"
        />
        <TextInput
          style={[s.input, { flex: 1 }]}
          keyboardType="number-pad"
          value={draft.budget_max?.toString() ?? ''}
          onChangeText={(v) => setDraft({ ...draft, budget_max: v ? Number(v) : null })}
          placeholder="עד"
        />
      </View>

      <Pressable style={s.save} disabled={saving} onPress={save}>
        <Text style={s.saveText}>{saving ? 'שומר…' : 'שמירה'}</Text>
      </Pressable>

      <Pressable onPress={signOut}>
        <Text style={s.signOut}>התנתקות</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  h: { fontSize: 24, fontWeight: '700' },
  label: { fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: '#E8543F', borderColor: '#E8543F' },
  chipText: { color: '#333' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  save: { backgroundColor: '#E8543F', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  signOut: { textAlign: 'center', color: '#888', padding: 16, textDecorationLine: 'underline' },
});
