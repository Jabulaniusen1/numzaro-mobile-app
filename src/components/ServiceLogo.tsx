import { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

const SIZES = {
  sm: 28,
  md: 40,
  lg: 56,
};

interface Props {
  logo?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ServiceLogo({ logo, name, size = 'md' }: Props) {
  const [err, setErr] = useState(false);
  const dim = SIZES[size];
  const letter = name?.charAt(0)?.toUpperCase() ?? '?';

  if (logo && !err) {
    return (
      <Image
        source={{ uri: logo }}
        style={{ width: dim, height: dim, borderRadius: dim / 4 }}
        onError={() => setErr(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: dim, height: dim, borderRadius: dim / 4 },
      ]}
    >
      <Text style={[styles.letter, { fontSize: dim * 0.4 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#7C5CFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: { color: '#fff', fontWeight: '700' },
});
