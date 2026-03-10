import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { createOrder } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useBalance } from '@/hooks/useBalance';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';

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

interface PlatformMeta { color: string; icon: string; iconSet?: 'fa5' | 'text'; iconText?: string }

const PLATFORMS: Record<string, PlatformMeta> = {
  instagram: { color: '#E1306C', icon: 'instagram',       iconSet: 'fa5' },
  facebook:  { color: '#1877F2', icon: 'facebook',        iconSet: 'fa5' },
  tiktok:    { color: '#010101', icon: 'tiktok',          iconSet: 'fa5' },
  youtube:   { color: '#FF0000', icon: 'youtube',         iconSet: 'fa5' },
  twitter:   { color: '#1DA1F2', icon: 'twitter',         iconSet: 'fa5' },
  x:         { color: '#222222', icon: 'twitter',         iconSet: 'fa5' },
  telegram:  { color: '#0088CC', icon: 'telegram',        iconSet: 'fa5' },
  linkedin:  { color: '#0A66C2', icon: 'linkedin',        iconSet: 'fa5' },
  spotify:   { color: '#1DB954', icon: 'spotify',         iconSet: 'fa5' },
  discord:   { color: '#5865F2', icon: 'discord',         iconSet: 'fa5' },
  snapchat:  { color: '#F7C900', icon: 'snapchat',        iconSet: 'fa5' },
  pinterest: { color: '#E60023', icon: 'pinterest',       iconSet: 'fa5' },
  threads:   { color: '#101010', icon: 'at',              iconSet: 'fa5' },
  whatsapp:  { color: '#25D366', icon: 'whatsapp',        iconSet: 'fa5' },
  twitch:    { color: '#9146FF', icon: 'twitch',          iconSet: 'fa5' },
  soundcloud:{ color: '#FF5500', icon: 'soundcloud',      iconSet: 'fa5' },
  reddit:    { color: '#FF4500', icon: 'reddit',          iconSet: 'fa5' },
  vimeo:     { color: '#1AB7EA', icon: 'vimeo',           iconSet: 'fa5' },
  tumblr:    { color: '#35465C', icon: 'tumblr',          iconSet: 'fa5' },
};

function getPlatformMeta(category: string): PlatformMeta {
  const key = category.toLowerCase().trim();
  for (const [name, meta] of Object.entries(PLATFORMS)) {
    if (key.includes(name)) return meta;
  }
  return { color: '#7C5CFC', icon: 'star', iconSet: 'fa5' };
}

function getPlatformColor(category: string): string {
  return getPlatformMeta(category).color;
}

function PlatformIcon({ category, size, color }: { category: string; size: number; color?: string }) {
  const meta = getPlatformMeta(category);
  return (
    <FontAwesome5
      name={meta.icon}
      size={size}
      color={color ?? '#fff'}
      brand
    />
  );
}

export default function ServicesScreen() {
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const { data: balance } = useBalance(userId ?? '');
  const { format } = useCurrency();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [search, setSearch] = useState('');
  const [platformSearch, setPlatformSearch] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('id, service_id, name, category, type, rate, min_quantity, max_quantity, refill_allowed, cancel_allowed')
        .order('category')
        .order('name');
      return data ?? [];
    },
  });

  const platforms = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      if (s.category) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    });
    const all = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    if (!platformSearch.trim()) return all;
    const q = platformSearch.toLowerCase();
    return all.filter((p) => p.name.toLowerCase().includes(q));
  }, [services, platformSearch]);

  const filteredServices = useMemo(() => {
    const list = selectedPlatform ? services.filter((s) => s.category === selectedPlatform) : [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, selectedPlatform, search]);

  const charge = useMemo(() => {
    if (!selectedService || !quantity) return 0;
    return (Number(quantity) / 1000) * Number(selectedService.rate);
  }, [selectedService, quantity]);

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance', userId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['recent-orders', userId] });
      setOrderModalVisible(false);
      setLink('');
      setQuantity('');
      setSelectedService(null);
      Alert.alert('Success', 'Order placed successfully!');
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
    mutation.mutate({ service_id: selectedService.service_id, link, quantity: qty });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C5CFC" />
      </View>
    );
  }

  // Platform Selection
  if (!selectedPlatform) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Icon name="rocket" size={22} color={colors.text} />
            <Text style={styles.headerTitle}>Boost Socials</Text>
          </View>
          <Text style={styles.headerSub}>Choose a platform to see services</Text>
        </View>

        <View style={styles.searchWrap}>
          <Icon name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={platformSearch}
            onChangeText={setPlatformSearch}
            placeholder="Search platforms..."
            placeholderTextColor={colors.textMuted}
          />
          {platformSearch.length > 0 && (
            <TouchableOpacity onPress={() => setPlatformSearch('')} style={{ padding: 4 }}>
              <Icon name="xmark" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          key="platforms-grid"
          data={platforms}
          keyExtractor={(item) => item.name}
          numColumns={2}
          columnWrapperStyle={styles.platformRow}
          contentContainerStyle={styles.platformGrid}
          renderItem={({ item }) => {
            const color = getPlatformColor(item.name);
            const isDark = color !== '#F7C900';
            return (
              <TouchableOpacity
                style={[styles.platformCard, { backgroundColor: color }]}
                onPress={() => setSelectedPlatform(item.name)}
                activeOpacity={0.82}
              >
                <View style={styles.platformIconWrap}>
                  <PlatformIcon category={item.name} size={28} color={isDark ? '#fff' : '#111827'} />
                </View>
                <Text style={[styles.platformName, !isDark && { color: '#111827' }]}>
                  {item.name}
                </Text>
                <Text style={[styles.platformCount, !isDark && { color: 'rgba(0,0,0,0.45)' }]}>
                  {item.count} service{item.count !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="search" size={40} color="#d1d5db" />
              <Text style={styles.emptyText}>No platforms found</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  // Services List
  const platformColor = getPlatformColor(selectedPlatform);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.servicesHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { setSelectedPlatform(null); setSearch(''); }}
        >
          <Icon name="chevronLeft" size={22} color="#7C5CFC" />
        </TouchableOpacity>
        <View style={[styles.platformBadge, { backgroundColor: platformColor }]}>
          <Text style={styles.platformBadgeLetter}>
            {selectedPlatform.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.servicesTitle}>{selectedPlatform}</Text>
          <Text style={styles.servicesSubtitle}>{filteredServices.length} services</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Icon name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${selectedPlatform}...`}
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
            <Icon name="xmark" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        key="services-list"
        data={filteredServices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => { setSelectedService(item); setOrderModalVisible(true); }}
          >
            <View style={[styles.serviceIconWrap, { backgroundColor: platformColor + '1A' }]}>
              <PlatformIcon category={selectedPlatform} size={20} color={platformColor} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={2}>{item.name}</Text>
              <View style={styles.serviceMetaRow}>
                <View style={[styles.rateTag, { backgroundColor: platformColor + '18' }]}>
                  <Text style={[styles.rateTagText, { color: platformColor }]}>
                    ₦{Number(item.rate).toFixed(4)}/1k
                  </Text>
                </View>
                <Text style={styles.serviceQty}>
                  {item.min_quantity.toLocaleString()} – {item.max_quantity.toLocaleString()}
                </Text>
              </View>
            </View>
            <Icon name="arrowRight" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="search" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No services found</Text>
          </View>
        }
      />

      <Modal
        visible={orderModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Place Order</Text>
            {selectedService && (
              <>
                <View style={styles.modalService}>
                  <View style={[styles.serviceIconWrap, { backgroundColor: platformColor + '1A' }]}>
                    <PlatformIcon category={selectedService.category} size={20} color={platformColor} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.modalServiceName}>{selectedService.name}</Text>
                    <Text style={styles.modalServiceCat}>{selectedService.category}</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Link / URL</Text>
                <TextInput
                  style={styles.modalInput}
                  value={link}
                  onChangeText={setLink}
                  placeholder="https://..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={styles.inputLabel}>
                  Quantity ({selectedService.min_quantity.toLocaleString()} – {selectedService.max_quantity.toLocaleString()})
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder={`Min ${selectedService.min_quantity}`}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />

                <View style={styles.summary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Rate</Text>
                    <Text style={styles.summaryVal}>₦{Number(selectedService.rate).toFixed(4)} / 1000</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Estimated Charge</Text>
                    <Text style={[styles.summaryVal, { color: '#7C5CFC' }]}>₦{charge.toFixed(4)}</Text>
                  </View>
                  <View style={[styles.summaryRow, { marginBottom: 0 }]}>
                    <Text style={styles.summaryLabel}>Your Balance</Text>
                    <Text style={styles.summaryVal}>{format(balance ?? 0)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, mutation.isPending && { opacity: 0.7 }]}
                  onPress={handleOrder}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Place Order — ₦{charge.toFixed(4)}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setOrderModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
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
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    headerTitle: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: c.text },
    headerSub: { fontSize: 13, color: c.textSub },
    platformGrid: { padding: 16, paddingBottom: 100 },
    platformRow: { gap: 12, marginBottom: 12 },
    platformCard: {
      flex: 1, borderRadius: 20, padding: 18, minHeight: 120,
      justifyContent: 'space-between', overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
    },
    platformIconWrap: { marginBottom: 10 },
    platformName: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#fff', marginBottom: 2 },
    platformCount: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins_500Medium' },
    servicesHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12 },
    backBtn: { padding: 4 },
    platformBadge: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    platformBadgeLetter: { fontSize: 20, fontFamily: 'Poppins_800ExtraBold', color: '#fff' },
    servicesTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: c.text },
    servicesSubtitle: { fontSize: 12, color: c.textSub, marginTop: 1 },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.input, borderRadius: 12,
      marginHorizontal: 16, marginBottom: 12,
      paddingHorizontal: 12, borderWidth: 1, borderColor: c.inputBorder,
    },
    searchInput: { flex: 1, padding: 12, fontSize: 14, color: c.text },
    listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
    serviceCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    serviceIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    serviceInfo: { flex: 1, marginLeft: 12 },
    serviceName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text, marginBottom: 6 },
    serviceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rateTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
    rateTagText: { fontSize: 11, fontFamily: 'Poppins_700Bold' },
    serviceQty: { fontSize: 11, color: c.textMuted },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { color: c.textSub, fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40,
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: c.text, marginBottom: 16 },
    modalService: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    modalServiceName: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: c.text },
    modalServiceCat: { fontSize: 12, color: c.textSub, marginTop: 2 },
    inputLabel: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text, marginBottom: 6 },
    modalInput: {
      backgroundColor: c.cardAlt, borderRadius: 10, padding: 12,
      fontSize: 14, color: c.text, marginBottom: 14,
      borderWidth: 1, borderColor: c.inputBorder,
    },
    summary: { backgroundColor: c.cardAlt, borderRadius: 12, padding: 14, marginBottom: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 13, color: c.textSub },
    summaryVal: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text },
    submitBtn: { backgroundColor: '#7C5CFC', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
    submitBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
    cancelBtn: { alignItems: 'center', padding: 10 },
    cancelBtnText: { color: c.textSub, fontSize: 14 },
  });
}
