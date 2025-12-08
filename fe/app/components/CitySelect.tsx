import React, { useEffect, useState } from 'react';
import { View, useColorScheme, Text, Modal, FlatList, Pressable, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/api/api';

// Fallback list in case API response doesn't contain an array
const FALLBACK_CITIES = [
  { label: 'Hà Nội', value: 'HAN' },
  { label: 'TP. Hồ Chí Minh', value: 'SGN' },
  { label: 'Đà Nẵng', value: 'DAD' },
  { label: 'Hải Phòng', value: 'HPH' },
  { label: 'Cần Thơ', value: 'VCA' },
  { label: 'Nha Trang', value: 'CXR' },
  { label: 'Phú Quốc', value: 'PQC' },
  { label: 'Đà Lạt', value: 'DLI' },
  { label: 'Huế', value: 'HUI' },
];

const CitySelectModal = ({
  placeholder,
  iconName,
}: {
  placeholder: string;
  iconName: 'flight-takeoff' | 'flight-land';
}) => {
  const isDark = useColorScheme() === 'dark';
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let selectedLabel = cities.find((c) => c.value === value)?.label ?? '';
  if (!value && loading) selectedLabel = 'Đang tải...';
  if (!value && error) selectedLabel = `Lỗi: ${error}`;

  // FALLBACK_CITIES is a stable module-level constant; ignore exhaustive-deps for this effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let mounted = true;

    const fetchAirports = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/airports');
        const data = response.data;

        const findArray = (obj: any): any[] | null => {
          if (Array.isArray(obj)) return obj;
          if (!obj || typeof obj !== 'object') return null;
          if (Array.isArray(obj.data)) return obj.data;
          if (Array.isArray(obj.airports)) return obj.airports;
          if (obj.data && typeof obj.data === 'object') {
            if (Array.isArray(obj.data.data)) return obj.data.data;
            if (Array.isArray(obj.data.items)) return obj.data.items;
          }
          const vals = Object.values(obj);
          for (const v of vals) if (Array.isArray(v)) return v;
          return null;
        };

        const arr = findArray(data);
        const source = Array.isArray(arr) ? arr : FALLBACK_CITIES;
        const mapped = source
          .map((item: any) => {
            const value = item.iata || item.code || item.id || item.value || '';
            const label = item.name || item.city || item.label || value || '';
            return { label: String(label), value: String(value) };
          })
          .filter((it: any) => it.value);

        if (mounted && mapped.length > 0) {
          setCities(mapped);
        } else if (mounted) {
          // Nếu không có data từ API, dùng fallback
          setCities(FALLBACK_CITIES);
        }
      } catch (err: any) {
        console.error('Error fetching airports:', err);
        // Nếu có lỗi, dùng fallback cities
        if (mounted) {
          setCities(FALLBACK_CITIES);
          setError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAirports();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View className="relative">
      <MaterialIcons
        name={iconName}
        size={20}
        color={isDark ? '#9ca3af' : '#6b7280'}
        style={{ position: 'absolute', left: 12, top: 17, zIndex: 10 }}
      />

      <Pressable onPress={() => setOpen(true)}>
        <View
          className={`h-14 border bg-background-light pl-10 pr-4 dark:bg-gray-700 ${isDark ? 'border-gray-600' : 'border-gray-200'
            } justify-center rounded-lg`}
        >
          <Text style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>{selectedLabel || placeholder}</Text>
        </View>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent={Platform.OS === 'ios'} onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-xl p-4" style={{ maxHeight: '60%' }}>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-base font-semibold text-text-primary dark:text-white">Chọn thành phố</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text className="text-primary">Đóng</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={cities}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setValue(item.value);
                    setOpen(false);
                  }}
                  className="py-3 border-b border-gray-100 dark:border-gray-700"
                >
                  <Text className="text-base text-text-primary dark:text-white">{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CitySelectModal;
