import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Tab content is never shown — the "services" tab intercepts tabPress in
// (tabs)/_layout.tsx and pushes to /esim instead of focusing this screen.
// This effect is just a fallback in case this screen is ever focused directly.
export default function ServicesScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/esim');
  }, [router]);

  return null;
}
