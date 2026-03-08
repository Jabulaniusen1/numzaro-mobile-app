import { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { differenceInSeconds, parseISO } from 'date-fns';

interface Props {
  expiresAt: string | null;
  style?: object;
}

function formatDiff(diff: number): string {
  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function CountdownTimer({ expiresAt, style }: Props) {
  const [display, setDisplay] = useState('—');

  useEffect(() => {
    if (!expiresAt) {
      setDisplay('—');
      return;
    }

    const tick = () => {
      const diff = differenceInSeconds(parseISO(expiresAt), new Date());
      setDisplay(formatDiff(diff));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return <Text style={[styles.text, style]}>{display}</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 14, color: '#6b7280' },
});
