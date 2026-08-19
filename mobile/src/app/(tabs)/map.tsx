import { AppleMaps, GoogleMaps } from 'expo-maps';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

// Single-city launch: everything is inside Beer Sheva, so we load the whole set
// once and filter in memory. ponytail: swap to PostGIS + viewport queries when
// listings pass a few thousand or a second city ships.
const BEER_SHEVA = { latitude: 31.2530, longitude: 34.7915 };

type Apartment = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  price: number;
  bedrooms: number;
  is_sublet: boolean;
  status: string;
};

export default function MapTab() {
  const { session, profile } = useSession();
  const [apts, setApts] = useState<Apartment[]>([]);
  const [subletsOnly, setSubletsOnly] = useState(false);
  const [selected, setSelected] = useState<Apartment | null>(null);
  const [hype, setHype] = useState<{ count: number; mine: boolean }>({ count: 0, mine: false });
  const [groupSize, setGroupSize] = useState(1);

  useEffect(() => {
    supabase
      .from('apartments')
      .select('id,title,lat,lng,price,bedrooms,is_sublet,status')
      .eq('status', 'active')
      .then(({ data, error }) => {
        if (error) Alert.alert('שגיאה', error.message);
        setApts((data as Apartment[]) ?? []);
      });
  }, []);

  // Group size drives the "too few bedrooms" warning.
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .then(async ({ data }) => {
        if (!data?.length) return setGroupSize(1);
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', data[0].group_id);
        setGroupSize(count ?? 1);
      });
  }, [session?.user?.id]);

  async function open(apt: Apartment) {
    setSelected(apt);
    const [{ data: stats }, { data: mine }] = await Promise.all([
      supabase.from('apartment_stats').select('interest_count').eq('apartment_id', apt.id).single(),
      supabase.from('apartment_interests').select('user_id').eq('apartment_id', apt.id).limit(1),
    ]);
    setHype({ count: stats?.interest_count ?? 0, mine: !!mine?.length });
  }

  async function toggleInterest() {
    if (!selected || !session?.user) return;
    if (hype.mine) {
      await supabase.from('apartment_interests').delete()
        .eq('apartment_id', selected.id).eq('user_id', session.user.id);
      setHype((h) => ({ count: h.count - 1, mine: false }));
    } else {
      await supabase.from('apartment_interests')
        .insert({ apartment_id: selected.id, user_id: session.user.id });
      setHype((h) => ({ count: h.count + 1, mine: true }));
    }
  }

  async function reportTaken() {
    if (!selected || !session?.user) return;
    // The primary key does the deduping — one report per user, no counter to inflate.
    const { error } = await supabase.from('apartment_reports')
      .insert({ apartment_id: selected.id, user_id: session.user.id });
    Alert.alert(error ? 'כבר דיווחתם על הדירה הזו' : 'תודה, הדיווח נקלט');
  }

  const visible = subletsOnly ? apts.filter((a) => a.is_sublet) : apts;
  const markers = visible.map((a) => ({
    id: a.id,
    coordinates: { latitude: a.lat, longitude: a.lng },
    title: `₪${a.price}`,
    tintColor: '#E8543F',
  }));
  const camera = { coordinates: BEER_SHEVA, zoom: 13 };
  const onClick = (e: { id?: string }) => {
    const apt = visible.find((a) => a.id === e.id);
    if (apt) open(apt);
  };

  return (
    <View style={{ flex: 1 }}>
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          style={{ flex: 1 }}
          cameraPosition={camera}
          annotations={markers}
          onMarkerClick={onClick}
        />
      ) : (
        <GoogleMaps.View
          style={{ flex: 1 }}
          cameraPosition={camera}
          markers={markers}
          onMarkerClick={onClick}
        />
      )}

      <View style={s.filter}>
        <Text style={s.filterLabel}>סאבלטים בלבד</Text>
        <Switch value={subletsOnly} onValueChange={setSubletsOnly} />
      </View>

      {selected && (
        <View style={s.sheet}>
          <Pressable style={s.close} onPress={() => setSelected(null)}>
            <Text style={{ fontSize: 20 }}>×</Text>
          </Pressable>
          <Text style={s.title}>{selected.title}</Text>
          <Text style={s.meta}>
            ₪{selected.price} · {selected.bedrooms} חדרים{selected.is_sublet ? ' · סאבלט' : ''}
          </Text>

          {groupSize > selected.bedrooms && (
            <Text style={s.warn}>⚠️ יש לכם {groupSize} שותפים אבל בדירה {selected.bedrooms} חדרים</Text>
          )}

          <Pressable style={[s.btn, hype.mine && s.btnOn]} onPress={toggleInterest}>
            <Text style={[s.btnText, hype.mine && { color: '#fff' }]}>
              {hype.mine ? 'מתעניינים ✓' : 'אני מתעניין'} · {hype.count}
            </Text>
          </Pressable>

          {!profile?.is_pro && hype.count > 0 && (
            <Text style={s.pro}>שדרגו ל־Pro כדי לראות מי עוד מתעניין</Text>
          )}

          <Pressable onPress={reportTaken}>
            <Text style={s.report}>דיווח: הדירה נתפסה</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  filter: {
    position: 'absolute', top: 60, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, elevation: 3, shadowOpacity: 0.15, shadowRadius: 8,
  },
  filterLabel: { fontWeight: '600' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', padding: 20, paddingBottom: 32, gap: 10,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 8,
  },
  close: { position: 'absolute', top: 10, left: 16, padding: 8, zIndex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  meta: { opacity: 0.6 },
  warn: { color: '#B8860B', backgroundColor: '#FFF8E1', padding: 10, borderRadius: 10 },
  btn: { backgroundColor: '#eee', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnOn: { backgroundColor: '#E8543F' },
  btnText: { fontWeight: '700', fontSize: 16 },
  pro: { fontSize: 13, opacity: 0.6, textAlign: 'center' },
  report: { fontSize: 13, color: '#888', textAlign: 'center', textDecorationLine: 'underline' },
});
