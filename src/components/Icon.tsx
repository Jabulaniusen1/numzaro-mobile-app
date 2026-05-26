import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
import {
  Add01Icon,
  AndroidIcon,
  AppleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  BarChartIcon,
  Calendar03Icon,
  Call02Icon,
  Cancel01Icon,
  ChartDecreaseIcon,
  ChartIncreaseIcon,
  CheckmarkCircle02Icon,
  ClipboardIcon,
  Copy01Icon,
  CreditCardIcon,
  CubeIcon,
  Database01Icon,
  Delete02Icon,
  Dollar01Icon,
  DollarCircleIcon,
  FilterHorizontalIcon,
  GlobeIcon,
  HelpCircleIcon,
  Home09Icon,
  InformationCircleIcon,
  Key02Icon,
  Link01Icon,
  Location01Icon,
  LockIcon,
  Logout03Icon,
  Mail01Icon,
  Message02Icon,
  MinusSignCircleIcon,
  Notification03Icon,
  PackageIcon,
  PowerIcon,
  QrCode01Icon,
  Refresh01Icon,
  Rocket01Icon,
  Search01Icon,
  Settings02Icon,
  Share01Icon,
  ShieldBanIcon,
  Simcard01Icon,
  SmartPhone01Icon,
  Tick02Icon,
  Time01Icon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
  Wallet02Icon,
  Wifi01Icon,
  CircleUnlockIcon,
} from '@hugeicons/core-free-icons';
import { StyleProp, ViewStyle } from 'react-native';

const ICONS = {
  home: Home09Icon,
  rocket: Rocket01Icon,
  phone: Call02Icon,
  box: CubeIcon,
  user: UserIcon,
  bell: Notification03Icon,
  wallet: Wallet02Icon,
  dollarCircle: DollarCircleIcon,
  barChartDollar: BarChartIcon,
  search: Search01Icon,
  refresh: Refresh01Icon,
  clipboard: ClipboardIcon,
  eye: ViewIcon,
  chevronLeft: ArrowLeft01Icon,
  chevronDown: ArrowDown01Icon,
  chevronUp: ArrowUp01Icon,
  arrowRight: ArrowRight01Icon,
  arrowLeft: ArrowLeft01Icon,
  gear: Settings02Icon,
  exit: Logout03Icon,
  key: Key02Icon,
  message: Message02Icon,
  plus: Add01Icon,
  check: Tick02Icon,
  checkCircle: CheckmarkCircle02Icon,
  xmark: Cancel01Icon,
  funnel: FilterHorizontalIcon,
  creditCard: CreditCardIcon,
  trash: Delete02Icon,
  envelope: Mail01Icon,
  locked: LockIcon,
  unlocked: CircleUnlockIcon,
  handDollar: DollarCircleIcon,
  trendUp: ChartIncreaseIcon,
  trendDown: ChartDecreaseIcon,
  calendar: Calendar03Icon,
  telephone: Call02Icon,
  power: PowerIcon,
  minusCircle: MinusSignCircleIcon,
  ban: ShieldBanIcon,
  link: Link01Icon,
  share: Share01Icon,
  dollar: Dollar01Icon,
  placeholder: Location01Icon,
  notification: Notification03Icon,
  orders: PackageIcon,
  transactions: BarChartIcon,
  numbers: Call02Icon,
  eyeOff: ViewOffIcon,
  qrCode: QrCode01Icon,
  copy: Copy01Icon,
  logoAndroid: AndroidIcon,
  logoApple: AppleIcon,
  wifi: Wifi01Icon,
  smartphone: SmartPhone01Icon,
  sim: Simcard01Icon,
  globe: GlobeIcon,
  time: Time01Icon,
  database: Database01Icon,
  openInBrowser: ArrowUpRight01Icon,
  info: InformationCircleIcon,
} as const satisfies Record<string, IconSvgElement>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, color = '#374151', style, strokeWidth = 1.8 }: Props) {
  const icon = ICONS[name] ?? HelpCircleIcon;
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
}
