export interface ThemeColors {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSub: string;
  textMuted: string;
  border: string;
  input: string;
  inputBorder: string;
  tabBar: string;
  tabBorder: string;
  toggleBg: string;
  accent: string;
  accentLight: string;
  accentText: string;
  notifUnread: string;
  statusBar: 'light' | 'dark';
}

export const LIGHT: ThemeColors = {
  bg:          '#F0F2FA',
  card:        '#ffffff',
  cardAlt:     '#f3f4f6',
  text:        '#111827',
  textSub:     '#6b7280',
  textMuted:   '#9ca3af',
  border:      '#e5e7eb',
  input:       '#ffffff',
  inputBorder: '#e5e7eb',
  tabBar:      '#ffffff',
  tabBorder:   '#e5e7eb',
  toggleBg:    '#e5e7eb',
  accent:      '#7C5CFC',
  accentLight: '#ede9fe',
  accentText:  '#7c3aed',
  notifUnread: '#faf5ff',
  statusBar:   'dark',
};

export const DARK: ThemeColors = {
  bg:          '#0d0f1a',
  card:        '#1a1d2e',
  cardAlt:     '#232640',
  text:        '#f1f5f9',
  textSub:     '#94a3b8',
  textMuted:   '#64748b',
  border:      '#2d3148',
  input:       '#1a1d2e',
  inputBorder: '#2d3148',
  tabBar:      '#13152a',
  tabBorder:   '#2d3148',
  toggleBg:    '#2d3148',
  accent:      '#7C5CFC',
  accentLight: '#2d1f6e',
  accentText:  '#a78bfa',
  notifUnread: '#1f1a40',
  statusBar:   'light',
};
