import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Banner {
  id: number;
  imageUrl: string;
  linkUrl: string | null;
}

interface Props {
  banners: Banner[];
  autoPlayMs?: number;
}

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_H = SCREEN_W * 0.42; // ~42% of screen width → landscape ratio

export function BannerCarousel({ banners, autoPlayMs = 4000 }: Props) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
    setCurrent(index);
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(prev => {
        const next = (prev + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
        return next;
      });
    }, autoPlayMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length, autoPlayMs]);

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== current) {
      setCurrent(idx);
      // reset timer
      if (timerRef.current) clearInterval(timerRef.current);
      if (banners.length > 1) {
        timerRef.current = setInterval(() => {
          setCurrent(prev => {
            const next = (prev + 1) % banners.length;
            scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
            return next;
          });
        }, autoPlayMs);
      }
    }
  };

  if (!banners.length) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {banners.map((b) => (
          <TouchableOpacity
            key={b.id}
            activeOpacity={b.linkUrl ? 0.85 : 1}
            onPress={() => b.linkUrl && Linking.openURL(b.linkUrl)}
            style={styles.slide}
          >
            <Image
              source={{ uri: b.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dots */}
      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === current ? colors.primary : `${colors.primary}40`,
                    width: i === current ? 20 : 7,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 16, marginBottom: 4 },
  slide: { width: SCREEN_W, height: BANNER_H, paddingHorizontal: 16 },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    height: 7,
    borderRadius: 999,
  },
});
