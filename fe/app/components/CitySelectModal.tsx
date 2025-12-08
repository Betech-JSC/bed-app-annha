// CitySelectModal.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  useColorScheme,
  Text,
  Modal,
  FlatList,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/api/api';

interface CitySelectModalProps {
  placeholder: string;
  iconName: 'flight-takeoff' | 'flight-land';
  value?: string;
  onValueChange?: (value: string, label: string) => void;
}

const CitySelectModal = ({
  placeholder,
  iconName,
  value: externalValue,
  onValueChange,
}: CitySelectModalProps) => {
  const isDark = useColorScheme() === 'dark';
  const [value, setValue] = useState(externalValue || '');
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let selectedLabel = cities.find((c) => c.value === value)?.label ?? '';
  if (!value && loading) selectedLabel = 'Đang tải...';
  if (!value && error) selectedLabel = `Lỗi: ${error}`;

  useEffect(() => {
    let mounted = true;

    const fetchAirports = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/airports');
        const data = response.data;

        // Xử lý các format response khác nhau
        let airportsData = [];
        if (data.status === 'success' && Array.isArray(data.data)) {
          airportsData = data.data;
        } else if (Array.isArray(data.data)) {
          airportsData = data.data;
        } else if (Array.isArray(data)) {
          airportsData = data;
        }

        if (mounted && airportsData.length > 0) {
          const mapped = airportsData
            .map((airport: any) => ({
              label: airport.display_vi || airport.name_vi || airport.name || '',
              value: airport.code || airport.city_code || airport.airport_code || '',
            }))
            .filter((item: any) => item.value && item.label);

          if (mounted && mapped.length > 0) {
            setCities(mapped);
          } else if (mounted) {
            setError('Không tìm thấy dữ liệu sân bay');
          }
        } else if (mounted) {
          setError('Không có dữ liệu sân bay');
        }
      } catch (err: any) {
        console.error('Error fetching airports:', err);
        const errorMessage = 
          err.response?.data?.message || 
          err.response?.data?.error || 
          err.message || 
          'Không thể tải danh sách sân bay';
        if (mounted) {
          setError(errorMessage);
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

  // Sync external value
  useEffect(() => {
    if (externalValue !== undefined) {
      setValue(externalValue);
    }
  }, [externalValue]);

  const handleSelect = (itemValue: string) => {
    setValue(itemValue);
    const selectedCity = cities.find((c) => c.value === itemValue);
    if (onValueChange && selectedCity) {
      onValueChange(itemValue, selectedCity.label);
    }
    setOpen(false);
  };

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
            } justify-center rounded-lg`}>
          <Text style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>
            {selectedLabel || placeholder}
          </Text>
        </View>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent={Platform.OS === 'ios'}
        onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end">
          <View className="rounded-t-xl bg-white p-4 dark:bg-gray-800" style={{ maxHeight: '60%' }}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-text-primary text-base font-semibold dark:text-white">
                Chọn thành phố
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text className="text-primary">Đóng</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={cities}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View className="py-8 items-center">
                  <Text className="text-gray-500 dark:text-gray-400">Không có dữ liệu</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item.value)}
                  className="border-b border-gray-100 py-3 dark:border-gray-700">
                  <Text className="text-text-primary text-base dark:text-white">{item.label}</Text>
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
