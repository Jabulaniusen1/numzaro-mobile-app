import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { createOrder } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useBalance } from '@/hooks/useBalance';
import { useCurrency } from '@/hooks/useCurrency';
import { ServiceLogo } from '@/components/ServiceLogo';
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

export default function ServicesScreen() {
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.userId);
  const { data: balance } = useBalance(userId ?? '');
  const { format } = useCurrency();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
        .order('category')
        .order('name');
      return data ?? [];
    },
  });

  const categories = useMemo(
    () => [...new Set(services.map((s) => s.category).filter(Boolean))],
    [services]
  );

  const filteredServices = useMemo(() => {
    let list = selectedCategory
      ? services.filter((s) => s.category === selectedCategory)
      : services;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [services, selectedCategory, search]);

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
      return Alert.alert(
        'Error',
        `Quantity must be between ${selectedService.min_quantity} and ${selectedService.max_quantity}.`
      );
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Icon name="rocket" size={22} color="#111827" />
          <Text style={styles.headerTitle}>Boost Socials</Text>
        </View>
        <Text style={styles.headerSub}>Grow your social media presence</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Icon name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search services..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        <TouchableOpacity
          style={[styles.pill, !selectedCategory && styles.pillActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.pillText, !selectedCategory && styles.pillTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.pill, selectedCategory === cat && styles.pillActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.pillText, selectedCategory === cat && styles.pillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Services List */}
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => {
              setSelectedService(item);
              setOrderModalVisible(true);
            }}
          >
            <ServiceLogo name={item.name} size="md" />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.serviceRate}>${Number(item.rate).toFixed(4)} / 1000</Text>
              <Text style={styles.serviceQty}>
                Min: {item.min_quantity.toLocaleString()} · Max: {item.max_quantity.toLocaleString()}
              </Text>
            </View>
            <View style={styles.serviceChevron}>
              <Icon name="chevronDown" size={16} color="#d1d5db" style={{ transform: [{ rotate: '-90deg' }] }} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="search" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No services found</Text>
          </View>
        }
      />

      {/* Order Modal */}
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
                  <ServiceLogo name={selectedService.name} size="md" />
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
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={styles.inputLabel}>
                  Quantity ({selectedService.min_quantity.toLocaleString()} –{' '}
                  {selectedService.max_quantity.toLocaleString()})
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder={`Min ${selectedService.min_quantity}`}
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />

                <View style={styles.summary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Rate</Text>
                    <Text style={styles.summaryVal}>
                      ${Number(selectedService.rate).toFixed(4)} / 1000
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Estimated Charge</Text>
                    <Text style={[styles.summaryVal, styles.summaryCharge]}>
                      ${charge.toFixed(4)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Balance</Text>
                    <Text style={styles.summaryVal}>{format(balance ?? 0)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
                  onPress={handleOrder}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Place Order — ${charge.toFixed(4)}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setOrderModalVisible(false)}
                >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 8 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, padding: 12, fontSize: 14, color: '#111827' },
  categoryScroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#7C5CFC', borderColor: '#7C5CFC' },
  pillText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 100 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  serviceInfo: { flex: 1, marginLeft: 12 },
  serviceName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  serviceRate: { fontSize: 12, color: '#7C5CFC', fontWeight: '600' },
  serviceQty: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  serviceChevron: { paddingLeft: 8 },
  empty: { alignItems: 'center', padding: 48, gap: 12 },
  emptyText: { color: '#6b7280', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalService: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalServiceName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  modalServiceCat: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  modalInput: {
    backgroundColor: '#F0F2FA',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summary: { backgroundColor: '#F0F2FA', borderRadius: 12, padding: 14, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryVal: { fontSize: 13, fontWeight: '600', color: '#111827' },
  summaryCharge: { color: '#7C5CFC' },
  submitBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#6b7280', fontSize: 14 },
});
