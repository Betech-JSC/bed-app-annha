import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32; // 16px padding each side

interface BannerItem {
  id: string;
  title: string;
  description?: string;
  image?: string;
  icon?: string;
  color?: string;
  action?: () => void;
  route?: string;
}

interface BannerSliderProps {
  items: BannerItem[];
  height?: number;
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

export default function BannerSlider({
  items,
  height = 160,
  autoScroll = true,
  autoScrollInterval = 4000,
}: BannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (autoScroll && items.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % items.length;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }, autoScrollInterval);

      return () => clearInterval(interval);
    }
  }, [items.length, autoScroll, autoScrollInterval]);

  const renderItem = ({ item }: { item: BannerItem }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={item.action}
        style={[
          styles.bannerItem,
          {
            width: BANNER_WIDTH,
            height,
            backgroundColor: item.color || '#2563EB',
          },
        ]}
        className="rounded-2xl overflow-hidden"
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            {item.icon && (
              <MaterialIcons
                name={item.icon as any}
                size={48}
                color="#FFFFFF"
              />
            )}
          </View>
        )}
        <View className="absolute inset-0 bg-black/30 p-4 justify-end">
          <Text className="text-white text-lg font-bold mb-1">
            {item.title}
          </Text>
          {item.description && (
            <Text className="text-white/90 text-sm" numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== undefined) {
        setCurrentIndex(index);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const getItemLayout = (_: any, index: number) => ({
    length: BANNER_WIDTH + 16,
    offset: (BANNER_WIDTH + 16) * index,
    index,
  });

  if (items.length === 0) return null;

  return (
    <View className="mb-4">
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + 16}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.flatListContent}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />
      {items.length > 1 && (
        <View className="flex-row justify-center gap-2 mt-3">
          {items.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full ${
                index === currentIndex ? 'bg-primary w-6' : 'bg-gray-300 w-2'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerItem: {
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  flatListContent: {
    paddingHorizontal: 0,
  },
});

