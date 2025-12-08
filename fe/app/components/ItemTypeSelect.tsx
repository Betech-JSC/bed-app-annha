import React, { useState } from 'react';
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

interface ItemType {
  label: string;
  value: string;
}

const ITEM_TYPES: ItemType[] = [
  { label: 'Tài liệu', value: 'document' },
  { label: 'Hợp đồng', value: 'contract' },
  { label: 'Gói hàng', value: 'package' },
  { label: 'Quà tặng', value: 'gift' },
  { label: 'Khác', value: 'other' },
];

interface ItemTypeSelectProps {
  placeholder: string;
  value?: string;
  onValueChange?: (value: string, label: string) => void;
}

const ItemTypeSelect = ({ placeholder, value: externalValue, onValueChange }: ItemTypeSelectProps) => {
  const isDark = useColorScheme() === 'dark';
  const [value, setValue] = useState(externalValue || '');
  const [open, setOpen] = useState(false);

  const selectedLabel = ITEM_TYPES.find((type) => type.value === value)?.label || '';

  const handleSelect = (itemValue: string) => {
    setValue(itemValue);
    const selectedType = ITEM_TYPES.find((type) => type.value === itemValue);
    if (onValueChange && selectedType) {
      onValueChange(itemValue, selectedType.label);
    }
    setOpen(false);
  };

  return (
    <View className="relative">
      <MaterialIcons
        name="description"
        size={20}
        color={isDark ? '#9ca3af' : '#6b7280'}
        style={{ position: 'absolute', left: 12, top: 17, zIndex: 10 }}
      />

      <Pressable onPress={() => setOpen(true)}>
        <View
          className={`h-14 border bg-background-light pl-10 pr-4 dark:bg-gray-700 ${
            isDark ? 'border-gray-600' : 'border-gray-200'
          } justify-center rounded-lg`}>
          <Text
            className={value ? 'text-text-primary dark:text-white' : 'text-gray-400'}
            style={{ color: value ? (isDark ? '#e5e7eb' : '#1f2937') : '#9ca3af' }}>
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
                Chọn loại tài liệu
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text className="text-primary">Đóng</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={ITEM_TYPES}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
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

export default ItemTypeSelect;
