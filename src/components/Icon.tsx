import { Text, TextStyle } from 'react-native';

// Lineicons 5.1 Free Solid — unicode map
const ICONS = {
  home:           57520,  // home-2
  rocket:         57602,  // rocket-5
  phone:          57583,  // phone
  box:            57386,  // box-closed
  user:           57680,  // user-4
  bell:           57374,  // bell-1
  wallet:         57689,  // wallet-1
  dollarCircle:   57459,  // dollar-circle
  barChartDollar: 57371,  // bar-chart-dollar
  search:         57613,  // search-1
  refresh:        57598,  // refresh-circle-1-clockwise
  clipboard:      57429,  // clipboard
  eye:            57481,  // eye
  chevronLeft:    57425,  // chevron-left
  chevronDown:    57423,  // chevron-down
  chevronUp:      57427,  // chevron-up
  arrowRight:     57364,  // arrow-right
  arrowLeft:      57362,  // arrow-left
  gear:           57498,  // gear-1
  exit:           57477,  // exit
  key:            57526,  // key-1
  message:        57554,  // message-2
  plus:           57591,  // plus
  check:          57420,  // check
  checkCircle:    57421,  // check-circle-1
  xmark:          57697,  // xmark
  funnel:         57494,  // funnel-1
  creditCard:     57449,  // credit-card-multiple
  trash:          57667,  // trash-3
  envelope:       57474,  // envelope-1
  locked:         57543,  // locked-1
  unlocked:       57677,  // unlocked-2
  handDollar:     57509,  // hand-taking-dollar
  trendUp:        57671,  // trend-up-1
  trendDown:      57670,  // trend-down-1
  calendar:       57406,  // calendar-days
  telephone:      57655,  // telephone-1
  power:          57593,  // power-button
  minusCircle:    57560,  // minus-circle
  ban:            57369,  // ban-2
  link:           57541,  // link-2-angular-right
  share:          57621,  // share-1
  dollar:         57458,  // dollar
  placeholder:    57588,  // placeholder-dollar
  notification:   57374,  // bell-1 (alias)
  orders:         57386,  // box-closed (alias)
  transactions:   57371,  // bar-chart-dollar (alias)
  numbers:        57583,  // phone (alias)
  eyeOff:         57481,  // eye (we'll use locked for eye-off)
} as const;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export function Icon({ name, size = 18, color = '#374151', style }: Props) {
  const code = ICONS[name];
  const safeCode = typeof code === 'number' && Number.isInteger(code) ? code : ICONS.xmark;
  return (
    <Text
      style={[
        {
          fontFamily: 'LineIcons-Solid',
          fontSize: size,
          color,
          lineHeight: size * 1.2,
        },
        style,
      ]}
      allowFontScaling={false}
    >
      {String.fromCodePoint(safeCode)}
    </Text>
  );
}
