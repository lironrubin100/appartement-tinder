import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, I18nManager, useColorScheme, View } from 'react-native';

import { SessionProvider, useSession } from '@/lib/session';

// Hebrew-only app, so no i18n library — just force RTL once and write the
// strings in Hebrew. Takes effect after one reload on a fresh install.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function Gate() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inApp = segments[0] === '(tabs)';
    if (!session && inApp) router.replace('/sign-in');
    if (session && !inApp) router.replace('/');
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </ThemeProvider>
  );
}
