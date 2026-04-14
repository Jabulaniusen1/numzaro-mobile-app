import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  animation: ReturnType<typeof require>;
  title: string;
  subtitle: string;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    animation: require('@/assets/animations/virtual-numbers.json'),
    title: 'One App.\nEvery Number.',
    subtitle: 'Get virtual phone numbers worldwide instantly — for OTPs, verifications, and more.',
    accentColor: '#a78bfa',
  },
  {
    id: '2',
    animation: require('@/assets/animations/boost-socials.json'),
    title: 'Grow Your\nAudience Fast.',
    subtitle: 'Boost followers, likes, and views across every major social platform in seconds.',
    accentColor: '#fbbf24',
  },
  {
    id: '3',
    animation: require('@/assets/animations/esim-globe.json'),
    title: 'Stay Connected\nAnywhere.',
    subtitle: 'Instant eSIM for 190+ countries. No physical SIM. No roaming surprises.',
    accentColor: '#34d399',
  },
];

export default function SplashScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) setIndex(first.index);
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    if (!isLast) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      router.replace('/auth/login');
    }
  };

  const skip = () => router.replace('/auth/login');

  const currentSlide = SLIDES[index];

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScrollToIndexFailed={() => {}}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Animation */}
            <View style={styles.animationWrap}>
              <LottieView
                source={item.animation}
                autoPlay
                loop
                style={styles.lottie}
              />
            </View>

            {/* Text */}
            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: '#fff' }]}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      {/* Bottom controls */}
      <SafeAreaView style={styles.footer} edges={['bottom']}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.id}
              style={[
                styles.dot,
                i === index && [styles.dotActive, { backgroundColor: currentSlide.accentColor }],
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          {!isLast ? (
            <TouchableOpacity onPress={skip} style={styles.skipBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          <TouchableOpacity
            onPress={goNext}
            style={[styles.nextBtn, { backgroundColor: currentSlide.accentColor }, isLast && styles.nextBtnLast]}
          >
            <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3b0fa0',
  },

  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  animationWrap: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },

  lottie: {
    width: 280,
    height: 280,
  },

  textWrap: {
    alignItems: 'center',
    gap: 12,
  },

  title: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
    maxWidth: 300,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingBottom: 16,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  dotActive: {
    width: 28,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },

  skipText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },

  nextBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 999,
  },

  nextBtnLast: {
    flex: 1,
    alignItems: 'center',
  },

  nextText: {
    color: '#1e0a3c',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
});
