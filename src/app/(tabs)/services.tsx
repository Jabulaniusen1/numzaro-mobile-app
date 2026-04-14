import { Icon } from '@/components/Icon';
import { useBalance } from '@/hooks/useBalance';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { createOrder } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ThemeColors } from '@/lib/theme';
import { FontAwesome5 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Service {
  id: string;
  service_id: string;
  name: string;
  category: string;
  type: string;
  rate: number;
  min_quantity: number;
  max_quantity: number;
  refill_allowed: boolean;
  cancel_allowed: boolean;
}

interface PlatformMeta { color: string; icon: string }

const PLATFORMS: Record<string, PlatformMeta> = {
  instagram:  { color: '#E1306C', icon: 'instagram' },
  facebook:   { color: '#1877F2', icon: 'facebook' },
  tiktok:     { color: '#010101', icon: 'tiktok' },
  youtube:    { color: '#FF0000', icon: 'youtube' },
  twitter:    { color: '#1DA1F2', icon: 'twitter' },
  x:          { color: '#222222', icon: 'twitter' },
  telegram:   { color: '#0088CC', icon: 'telegram' },
  linkedin:   { color: '#0A66C2', icon: 'linkedin' },
  spotify:    { color: '#1DB954', icon: 'spotify' },
  discord:    { color: '#5865F2', icon: 'discord' },
  snapchat:   { color: '#F7C900', icon: 'snapchat' },
  pinterest:  { color: '#E60023', icon: 'pinterest' },
  threads:    { color: '#101010', icon: 'at' },
  whatsapp:   { color: '#25D366', icon: 'whatsapp' },
  twitch:     { color: '#9146FF', icon: 'twitch' },
  soundcloud: { color: '#FF5500', icon: 'soundcloud' },
  reddit:     { color: '#FF4500', icon: 'reddit' },
  vimeo:      { color: '#1AB7EA', icon: 'vimeo' },
  tumblr:     { color: '#35465C', icon: 'tumblr' },
};

// Platforms shown at the top, in order of popularity
const POPULAR_ORDER = [
  'instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'x',
  'telegram', 'snapchat', 'discord', 'spotify', 'twitch', 'linkedin',
  'whatsapp', 'pinterest', 'reddit', 'soundcloud', 'threads', 'vimeo', 'tumblr',
];

function normKey(v: string) { return v.toLowerCase().trim(); }
function getPlatformKey(cat: string) {
  const n = normKey(cat);
  for (const k of Object.keys(PLATFORMS)) { if (n.includes(k)) return k; }
  return cat.trim();
}
function getPlatformLabel(key: string) {
  if (PLATFORMS[key]) return key.charAt(0).toUpperCase() + key.slice(1);
  return key;
}
function getPlatformMeta(cat: string): PlatformMeta {
  const n = normKey(cat);
  for (const [k, m] of Object.entries(PLATFORMS)) { if (n.includes(k)) return m; }
  return { color: '#7C5CFC', icon: 'star' };
}
function getPlatformColor(cat: string) { return getPlatformMeta(cat).color; }
function getSubcategoryLabel(cat: string, pKey: string) {
  const pCap = pKey.charAt(0).toUpperCase() + pKey.slice(1);
  const stripped = cat.trim().replace(new RegExp(`^${pCap}\\s*[-–]?\\s*`, 'i'), '').trim();
  return stripped.length > 0 ? stripped : cat.trim();
}

function PlatformIcon({ category, size, color }: { category: string; size: number; color?: string }) {
  const meta = getPlatformMeta(category);
  return <FontAwesome5 name={meta.icon} size={size} color={color ?? '#fff'} brand />;
}

export default function ServicesScreen() {
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const { data: balance } = useBalance(userId ?? '');
  const { format } = useCurrency();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [search, setSearch] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('id, service_id, name, category, type, rate, min_quantity, max_quantity, refill_allowed, cancel_allowed')
        .order('category').order('name');
      return data ?? [];
    },
  });

  // Derive platform list — popular platforms first, rest alphabetically after
  const platforms = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      if (!s.category) return;
      const k = getPlatformKey(s.category);
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count, label: getPlatformLabel(key) }))
      .sort((a, b) => {
        const ai = POPULAR_ORDER.indexOf(a.key);
        const bi = POPULAR_ORDER.indexOf(b.key);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [services]);

  const platformServices = useMemo(() => {
    if (!selectedPlatform) return [];
    const k = normKey(selectedPlatform);
    return services.filter((s) => s.category && normKey(s.category).includes(k));
  }, [services, selectedPlatform]);

  const subcategories = useMemo(() => {
    if (!selectedPlatform) return [];
    const seen = new Set<string>();
    platformServices.forEach((s) => seen.add(getSubcategoryLabel(s.category, selectedPlatform)));
    return Array.from(seen).sort();
  }, [platformServices, selectedPlatform]);

  const filteredServices = useMemo(() => {
    let list = platformServices;
    if (selectedSubcategory) list = list.filter((s) => getSubcategoryLabel(s.category, selectedPlatform!) === selectedSubcategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [platformServices, selectedSubcategory, search, selectedPlatform]);

  const charge = useMemo(() => {
    if (!selectedService || !quantity) return 0;
    return (Number(quantity) / 1000) * Number(selectedService.rate);
  }, [selectedService, quantity]);

  const balanceNum = balance ?? 0;
  const insufficientBalance = charge > 0 && charge > balanceNum;

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance', userId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['recent-orders', userId] });
      setOrderModalVisible(false);
      setLink(''); setQuantity(''); setSelectedService(null);
      Alert.alert('Order Placed!', 'Your order has been placed successfully.');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const handleOrder = () => {
    if (!selectedService) return;
    if (!link.trim()) return Alert.alert('Error', 'Please enter a link.');
    const qty = Number(quantity);
    if (isNaN(qty) || qty < selectedService.min_quantity || qty > selectedService.max_quantity) {
      return Alert.alert('Error', `Quantity must be between ${selectedService.min_quantity} and ${selectedService.max_quantity}.`);
    }
    if (insufficientBalance) {
      return Alert.alert('Insufficient Balance', 'You do not have enough balance.', [
        { text: 'Top Up', onPress: () => setOrderModalVisible(false) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
    mutation.mutate({ service_id: selectedService.service_id, link, quantity: qty });
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#7C5CFC" /></View>;
  }

  // ─── Platform Selection ──────────────────────────────────────────────────────
  if (!selectedPlatform) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Boost Socials</Text>
            <Text style={styles.pageSub}>Grow your audience on any platform</Text>
          </View>
          <View style={styles.headerBadge}>
            <Icon name="rocket" size={18} color="#7C5CFC" />
          </View>
        </View>

        <FlatList
          data={platforms}
          keyExtractor={(item) => item.key}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.gridSectionLabel}>Select a platform</Text>
          }
          renderItem={({ item }) => {
            const color = getPlatformColor(item.key);
            const isLight = color === '#F7C900';
            const textColor = isLight ? '#1a1a1a' : '#fff';
            const subColor = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.65)';
            return (
              <TouchableOpacity
                style={[styles.platformCard, { backgroundColor: color }]}
                onPress={() => { setSelectedPlatform(item.key); setSelectedSubcategory(null); setSearch(''); }}
                activeOpacity={0.8}
              >
                {/* Subtle overlay circle for depth */}
                <View style={styles.platformCardCircle} />
                <View style={styles.platformCardContent}>
                  <View style={[styles.platformIconWrap, { backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' }]}>
                    <PlatformIcon category={item.key} size={26} color={textColor} />
                  </View>
                  <Text style={[styles.platformName, { color: textColor }]} numberOfLines={1}>{item.label}</Text>
                  <Text style={[styles.platformCount, { color: subColor }]}>
                    {item.count} service{item.count !== 1 ? 's' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="rocket" size={44} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No services available</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  // ─── Services List ───────────────────────────────────────────────────────────
  const platformColor = getPlatformColor(selectedPlatform);
  const platformLabel = getPlatformLabel(selectedPlatform);
  const isLight = platformColor === '#F7C900';

  return (
    <SafeAreaView style={styles.container}>
      {/* Platform header banner */}
      <View style={[styles.platformBanner, { backgroundColor: platformColor }]}>
        <TouchableOpacity
          style={styles.bannerBack}
          onPress={() => { setSelectedPlatform(null); setSelectedSubcategory(null); setSearch(''); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrowLeft" size={20} color={isLight ? '#1a1a1a' : '#fff'} />
        </TouchableOpacity>
        <View style={styles.bannerInfo}>
          <View style={[styles.bannerIcon, { backgroundColor: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)' }]}>
            <PlatformIcon category={selectedPlatform} size={22} color={isLight ? '#1a1a1a' : '#fff'} />
          </View>
          <View>
            <Text style={[styles.bannerTitle, { color: isLight ? '#1a1a1a' : '#fff' }]}>{platformLabel}</Text>
            <Text style={[styles.bannerSub, { color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)' }]}>
              {filteredServices.length} services
            </Text>
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Icon name="search" size={15} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${platformLabel} services...`}
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Icon name="xmark" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Subcategory tabs */}
      {subcategories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
          keyboardShouldPersistTaps="handled"
        >
          {[null, ...subcategories].map((sub) => {
            const active = selectedSubcategory === sub;
            return (
              <TouchableOpacity
                key={sub ?? 'all'}
                style={[styles.tab, active && { backgroundColor: platformColor, borderColor: platformColor }]}
                onPress={() => setSelectedSubcategory(sub)}
              >
                <Text style={[styles.tabText, active && { color: isLight && active ? '#1a1a1a' : '#fff', fontFamily: 'Poppins_600SemiBold' }]}>
                  {sub ?? 'All'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Services */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.servicesList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.serviceRow}
            onPress={() => { setSelectedService(item); setOrderModalVisible(true); }}
            activeOpacity={0.75}
          >
            <View style={[styles.serviceIconBox, { backgroundColor: platformColor + '18' }]}>
              <PlatformIcon category={selectedPlatform} size={18} color={platformColor} />
            </View>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName} numberOfLines={2}>{item.name}</Text>
              <View style={styles.serviceFooter}>
                <View style={[styles.rateChip, { backgroundColor: platformColor + '15' }]}>
                  <Text style={[styles.rateChipText, { color: platformColor }]}>
                    {format(Number(item.rate))} / 1k
                  </Text>
                </View>
                <Text style={styles.serviceRange}>
                  {item.min_quantity.toLocaleString()} – {item.max_quantity.toLocaleString()}
                </Text>
              </View>
            </View>
            <Icon name="chevronDown" size={14} color={colors.textMuted} style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="search" size={44} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptySub}>Try a different filter or search term</Text>
          </View>
        }
      />

      {/* ── Order Modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={orderModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {selectedService && (
              <>
                {/* Service title */}
                <View style={[styles.sheetServiceBanner, { backgroundColor: platformColor + '15', borderColor: platformColor + '30' }]}>
                  <View style={[styles.serviceIconBox, { backgroundColor: platformColor + '25' }]}>
                    <PlatformIcon category={selectedService.category} size={20} color={platformColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetServiceName} numberOfLines={2}>{selectedService.name}</Text>
                    <Text style={[styles.sheetServiceCat, { color: platformColor }]}>{selectedService.category}</Text>
                  </View>
                </View>

                {/* Link */}
                <Text style={styles.fieldLabel}>Link / URL</Text>
                <View style={styles.fieldRow}>
                  <Icon name="link" size={15} color={colors.textMuted} />
                  <TextInput
                    style={styles.fieldInput}
                    value={link}
                    onChangeText={setLink}
                    placeholder="https://..."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                {/* Quantity */}
                <Text style={styles.fieldLabel}>
                  Quantity&nbsp;
                  <Text style={styles.fieldLabelHint}>
                    ({selectedService.min_quantity.toLocaleString()} – {selectedService.max_quantity.toLocaleString()})
                  </Text>
                </Text>
                <View style={styles.fieldRow}>
                  <Icon name="barChartDollar" size={15} color={colors.textMuted} />
                  <TextInput
                    style={styles.fieldInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder={`Min ${selectedService.min_quantity}`}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>

                {/* Summary */}
                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Rate</Text>
                    <Text style={styles.summaryValue}>{format(Number(selectedService.rate))} / 1,000</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryDivider]}>
                    <Text style={styles.summaryLabel}>Estimated Charge</Text>
                    <Text style={[styles.summaryValue, { color: '#7C5CFC' }]}>{format(charge)}</Text>
                  </View>
                  <View style={[styles.summaryRow, { marginBottom: 0 }]}>
                    <Text style={styles.summaryLabel}>Your Balance</Text>
                    <Text style={[styles.summaryValue, insufficientBalance && charge > 0 && { color: '#ef4444' }]}>
                      {format(balanceNum)}
                    </Text>
                  </View>
                </View>

                {/* Insufficient balance warning */}
                {insufficientBalance && (
                  <View style={styles.balanceWarn}>
                    <Icon name="wallet" size={13} color="#ef4444" />
                    <Text style={styles.balanceWarnText}>
                      Need {format(charge - balanceNum)} more to place this order.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.placeBtn, (mutation.isPending || insufficientBalance) && styles.placeBtnDisabled]}
                  onPress={handleOrder}
                  disabled={mutation.isPending || insufficientBalance}
                  activeOpacity={0.82}
                >
                  {mutation.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.placeBtnText}>
                        {insufficientBalance ? 'Insufficient Balance' : `Place Order — ${format(charge)}`}
                      </Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={styles.dismissBtn} onPress={() => setOrderModalVisible(false)}>
                  <Text style={styles.dismissBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },

    // ── Page header ─────────────────────────────────────────────
    pageHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    },
    pageTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: c.text },
    pageSub: { fontSize: 13, color: c.textSub, fontFamily: 'Poppins_400Regular', marginTop: 1 },
    headerBadge: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      justifyContent: 'center', alignItems: 'center',
    },

    // ── Platform grid ────────────────────────────────────────────
    gridSectionLabel: {
      fontSize: 12,
      fontFamily: 'Poppins_600SemiBold',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    gridContent: { paddingHorizontal: 16, paddingBottom: 100 },
    gridRow: { gap: 12, marginBottom: 12 },

    platformCard: {
      width: CARD_WIDTH,
      height: 130,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    platformCardCircle: {
      position: 'absolute',
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: 'rgba(255,255,255,0.08)',
      bottom: -30,
      right: -20,
    },
    platformCardContent: {
      flex: 1,
      padding: 16,
      justifyContent: 'space-between',
    },
    platformIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
    },
    platformName: {
      fontSize: 15,
      fontFamily: 'Poppins_700Bold',
      marginTop: 6,
    },
    platformCount: {
      fontSize: 11,
      fontFamily: 'Poppins_500Medium',
    },

    // ── Platform banner (services header) ───────────────────────
    platformBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    bannerBack: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center', alignItems: 'center',
    },
    bannerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    bannerIcon: {
      width: 44, height: 44, borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
    },
    bannerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
    bannerSub: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 1 },

    // ── Search ───────────────────────────────────────────────────
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.input, borderRadius: 12,
      marginHorizontal: 16, marginTop: 12, marginBottom: 8,
      paddingHorizontal: 14, paddingVertical: 11,
      borderWidth: 1, borderColor: c.inputBorder,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.text, fontFamily: 'Poppins_400Regular', padding: 0 },

    // ── Subcategory tabs ─────────────────────────────────────────
    tabBar: { paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
    tab: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },
    tabText: { fontSize: 12, color: c.text, fontFamily: 'Poppins_500Medium' },

    // ── Service rows ─────────────────────────────────────────────
    servicesList: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
    serviceRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.card, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 13,
      marginBottom: 8,
      borderWidth: 1, borderColor: c.border,
    },
    serviceIconBox: {
      width: 42, height: 42, borderRadius: 11,
      justifyContent: 'center', alignItems: 'center',
      flexShrink: 0,
    },
    serviceDetails: { flex: 1 },
    serviceName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text, marginBottom: 6, lineHeight: 18 },
    serviceFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rateChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    rateChipText: { fontSize: 11, fontFamily: 'Poppins_700Bold' },
    serviceRange: { fontSize: 11, color: c.textMuted, fontFamily: 'Poppins_400Regular' },

    // ── Empty ────────────────────────────────────────────────────
    empty: { alignItems: 'center', paddingTop: 64, gap: 10 },
    emptyTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: c.textSub },
    emptySub: { fontSize: 13, color: c.textMuted, fontFamily: 'Poppins_400Regular' },

    // ── Order modal ──────────────────────────────────────────────
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 26, borderTopRightRadius: 26,
      paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40,
    },
    sheetHandle: {
      width: 38, height: 4, borderRadius: 2,
      backgroundColor: c.border, alignSelf: 'center', marginBottom: 20,
    },

    sheetServiceBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: 14, padding: 12,
      borderWidth: 1, marginBottom: 20,
    },
    sheetServiceName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: c.text, lineHeight: 20 },
    sheetServiceCat: { fontSize: 11, fontFamily: 'Poppins_500Medium', marginTop: 2 },

    fieldLabel: {
      fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: c.text,
      marginBottom: 8,
    },
    fieldLabelHint: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: c.textMuted },
    fieldRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.cardAlt, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12,
      borderWidth: 1, borderColor: c.inputBorder, marginBottom: 16,
    },
    fieldInput: { flex: 1, fontSize: 14, color: c.text, fontFamily: 'Poppins_400Regular', padding: 0 },

    summaryBox: {
      backgroundColor: c.cardAlt, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
      borderWidth: 1, borderColor: c.border,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    summaryDivider: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    summaryLabel: { fontSize: 13, color: c.textSub, fontFamily: 'Poppins_400Regular' },
    summaryValue: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text },

    balanceWarn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10,
      padding: 10, marginBottom: 12,
      borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    },
    balanceWarnText: { flex: 1, fontSize: 12, color: '#ef4444', fontFamily: 'Poppins_500Medium' },

    placeBtn: {
      backgroundColor: '#7C5CFC', borderRadius: 14,
      paddingVertical: 15, alignItems: 'center', marginBottom: 10,
      shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    },
    placeBtnDisabled: { backgroundColor: '#9ca3af', shadowOpacity: 0 },
    placeBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },

    dismissBtn: { alignItems: 'center', paddingVertical: 10 },
    dismissBtnText: { color: c.textSub, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  });
}
