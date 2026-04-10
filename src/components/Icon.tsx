import { Ionicons } from '@expo/vector-icons';
import { TextStyle } from 'react-native';

const ICONS = {
  home: 'home-outline',
  rocket: 'rocket-outline',
  phone: 'call-outline',
  box: 'cube-outline',
  user: 'person-outline',
  bell: 'notifications-outline',
  wallet: 'wallet-outline',
  dollarCircle: 'cash-outline',
  barChartDollar: 'bar-chart-outline',
  search: 'search-outline',
  refresh: 'refresh-outline',
  clipboard: 'clipboard-outline',
  eye: 'eye-outline',
  chevronLeft: 'chevron-back',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  arrowRight: 'arrow-forward',
  arrowLeft: 'arrow-back',
  gear: 'settings-outline',
  exit: 'log-out-outline',
  key: 'key-outline',
  message: 'chatbubble-ellipses-outline',
  plus: 'add',
  check: 'checkmark',
  checkCircle: 'checkmark-circle',
  xmark: 'close',
  funnel: 'funnel-outline',
  creditCard: 'card-outline',
  trash: 'trash-outline',
  envelope: 'mail-outline',
  locked: 'lock-closed-outline',
  unlocked: 'lock-open-outline',
  handDollar: 'cash-outline',
  trendUp: 'trending-up-outline',
  trendDown: 'trending-down-outline',
  calendar: 'calendar-outline',
  telephone: 'call-outline',
  power: 'power-outline',
  minusCircle: 'remove-circle-outline',
  ban: 'ban-outline',
  link: 'link-outline',
  share: 'share-social-outline',
  dollar: 'logo-usd',
  placeholder: 'location-outline',
  notification: 'notifications-outline',
  orders: 'cube-outline',
  transactions: 'bar-chart-outline',
  numbers: 'call-outline',
  eyeOff: 'eye-off-outline',
} as const;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export function Icon({ name, size = 18, color = '#374151', style }: Props) {
  const iconName = ICONS[name] ?? 'help-circle-outline';
  return <Ionicons name={iconName} size={size} color={color} style={style} />;
}
