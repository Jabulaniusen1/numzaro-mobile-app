import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

type Slide = { id: string; image: number };

const SLIDES: Slide[] = [
  { id: '1', image: require('@/assets/splash-screen/numzaro splash-screen1.jpg') },
  { id: '2', image: require('@/assets/splash-screen/numzaro splashscreen2.jpg') },
];

export default function SplashScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setIndex(first.index);
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      return;
    }
    router.replace('/auth/login');
  };

  const skip = () => router.replace('/auth/login');

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <Image source={item.image} style={styles.image} resizeMode="cover" />
          </View>
        )}
      />

      <SafeAreaView style={styles.overlay} edges={['bottom']}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={skip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goNext} style={styles.nextBtn}>
            <Text style={styles.nextText}>{index === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  image: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(17,24,39,0.25)' },
  dotActive: { width: 22, backgroundColor: '#111827' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 8 },
  skipText: { color: '#111827', fontSize: 14, fontWeight: '600' },
  nextBtn: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  nextText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
