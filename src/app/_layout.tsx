import '../global.css';
import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { Redirect, Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/hooks/useTheme';
import { ActivityIndicator, View, Text, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

// Apply Poppins globally to all Text and TextInput components
(Text as any).defaultProps = { style: { fontFamily: 'Poppins_400Regular' } };
(TextInput as any).defaultProps = { style: { fontFamily: 'Poppins_400Regular' } };

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
});

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const setUserId = useAppStore((s) => s.setUserId);
  const { colors } = useTheme();

  const [fontsLoaded] = useFonts({
    'LineIcons-Solid': require('@/assets/lineicons-5.1-free/free-solid-fonts/lineicons-free-solid.ttf'),
    'LineIcons': require('@/assets/lineicons-5.1-free/free-regular-font/lineicons-free.ttf'),
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUserId(session?.user?.id ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F2FA' }}>
        <ActivityIndicator size="large" color="#7C5CFC" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={colors.statusBar} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
        <Stack.Screen name="my-numbers/index" options={{ headerShown: false }} />
        <Stack.Screen name="numbers/[id]/messages" options={{ headerShown: false }} />
        <Stack.Screen name="numbers/[id]/otps" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="transactions" options={{ headerShown: false }} />
        <Stack.Screen name="fund-wallet" options={{ headerShown: false }} />
      </Stack>
      {!session && <Redirect href="/auth/login" />}
      <Toast />
    </QueryClientProvider>
  );
}
