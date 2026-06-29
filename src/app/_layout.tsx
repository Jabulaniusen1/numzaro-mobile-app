import '../global.css';
import 'react-native-url-polyfill/auto';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
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
import { ActivityIndicator, View, Text, TextInput, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { Icon, IconName } from '@/components/Icon';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Apply Poppins globally to all Text and TextInput components
(Text as any).defaultProps = { style: { fontFamily: 'Poppins_400Regular' } };
(TextInput as any).defaultProps = { style: { fontFamily: 'Poppins_400Regular' } };

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type AppToastProps = {
  text1?: string;
  text2?: string;
  type: 'success' | 'error' | 'info';
};

function AppToast(props: AppToastProps) {
  const isError = props.type === 'error';
  const isSuccess = props.type === 'success';
  const accent = isError ? '#ef4444' : isSuccess ? '#16a34a' : '#7C5CFC';
  const bg = isError ? '#fef2f2' : isSuccess ? '#f0fdf4' : '#f5f3ff';
  const iconName: IconName = isError ? 'xmark' : isSuccess ? 'checkCircle' : 'bell';

  return (
    <View style={[toastStyles.wrap, { backgroundColor: bg, borderColor: accent }]}>
      <View style={[toastStyles.iconWrap, { backgroundColor: accent }]}>
        <Icon name={iconName} size={14} color="#fff" />
      </View>
      <View style={toastStyles.content}>
        {!!props.text1 && <Text style={toastStyles.title}>{props.text1}</Text>}
        {!!props.text2 && <Text style={toastStyles.body}>{props.text2}</Text>}
      </View>
    </View>
  );
}

const toastConfig = {
  success: (props: { text1?: string; text2?: string }) => <AppToast {...props} type="success" />,
  error: (props: { text1?: string; text2?: string }) => <AppToast {...props} type="error" />,
  info: (props: { text1?: string; text2?: string }) => <AppToast {...props} type="info" />,
};

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.log('Unhandled render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.body}>Please try again.</Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const setUserId = useAppStore((s) => s.setUserId);
  const { colors } = useTheme();
  const segments = useSegments();

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

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let cancelled = false;

    const registerPushToken = async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7C5CFC',
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        let status = existing.status;
        if (status !== 'granted') {
          const requested = await Notifications.requestPermissionsAsync();
          status = requested.status;
        }
        if (status !== 'granted') return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants as any)?.easConfig?.projectId;

        const tokenResult = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getExpoPushTokenAsync();

        const token = tokenResult.data;
        if (!token || cancelled) return;

        await supabase.from('users').update({ push_token: token }).eq('id', userId);
      } catch (error) {
        console.log('Push token registration failed:', error);
      }
    };

    registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  if (authLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F2FA' }}>
        <ActivityIndicator size="large" color="#7C5CFC" />
      </View>
    );
  }

  const inAuth = segments[0] === 'auth';
  const inResetPassword = segments[0] === 'auth' && segments[1] === 'reset-password';
  const inSplash = segments[0] === 'splash';

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={colors.statusBar} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="splash" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
          <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="my-numbers/index" options={{ headerShown: false }} />
          <Stack.Screen name="numbers/[id]/messages" options={{ headerShown: false }} />
          <Stack.Screen name="numbers/[id]/otps" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="esim/index" options={{ headerShown: false }} />
          <Stack.Screen name="esim/buy" options={{ headerShown: false }} />
          <Stack.Screen name="esim/my" options={{ headerShown: false }} />
          <Stack.Screen name="esim/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="transactions" options={{ headerShown: false }} />
          <Stack.Screen name="fund-wallet" options={{ headerShown: false }} />
        </Stack>
        {!session && !inSplash && !inAuth && <Redirect href="/splash" />}
        {session && (inSplash || inAuth) && !inResetPassword && <Redirect href="/(tabs)" />}
        <Toast
          config={toastConfig}
          position="top"
          topOffset={58}
          visibilityTime={2800}
          autoHide
        />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

const toastStyles = StyleSheet.create({
  wrap: {
    width: '92%',
    minHeight: 66,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#111827',
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
  body: {
    color: '#4b5563',
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2FA',
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
  },
  body: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#6b7280',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#7C5CFC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});
