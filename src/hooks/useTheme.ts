import { useAppStore } from '@/lib/store';
import { LIGHT, DARK, ThemeColors } from '@/lib/theme';

export function useTheme(): { colors: ThemeColors; dark: boolean } {
  const darkMode = useAppStore((s) => s.darkMode);
  return {
    colors: darkMode ? DARK : LIGHT,
    dark: darkMode,
  };
}
