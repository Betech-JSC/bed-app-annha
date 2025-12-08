import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import CitySelectModal from './CitySelectModal';
import ItemTypeSelect from './ItemTypeSelect';
import DatePickerInput from './DatePickerInput';

interface SearchFlightModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (searchParams: any) => void;
  searchLoading?: boolean;
}

export default function SearchFlightModal({
  visible,
  onClose,
  onSearch,
  searchLoading = false,
}: SearchFlightModalProps) {
  const [departureCity, setDepartureCity] = useState({ value: '', label: '' });
  const [arrivalCity, setArrivalCity] = useState({ value: '', label: '' });
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [itemType, setItemType] = useState('');
  const [itemValue, setItemValue] = useState('');

  const handleSearch = () => {
    // Validation
    if (!departureCity.value) {
      Alert.alert('Thông báo', 'Vui lòng chọn thành phố đi');
      return;
    }
    if (!arrivalCity.value) {
      Alert.alert('Thông báo', 'Vui lòng chọn thành phố đến');
      return;
    }
    if (!date) {
      Alert.alert('Thông báo', 'Vui lòng chọn ngày gửi');
      return;
    }

    const searchParams = {
      from_airport: departureCity.value,
      to_airport: arrivalCity.value,
      date: date,
      time_slot: timeSlot,
      item_type: itemType,
      item_value: itemValue,
      departureLabel: departureCity.label,
      arrivalLabel: arrivalCity.label,
    };

    onSearch(searchParams);
  };

  const handleReset = () => {
    setDepartureCity({ value: '', label: '' });
    setArrivalCity({ value: '', label: '' });
    setDate('');
    setTimeSlot('');
    setItemType('');
    setItemValue('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-800">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <Text className="text-xl font-bold text-text-primary dark:text-white">
              Tìm hành khách
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
            >
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <View className="py-4 gap-4">
              {/* Thành phố đi */}
              <View>
                <Text className="text-text-primary pb-2 text-sm font-medium dark:text-gray-300">
                  Thành phố đi
                </Text>
                <CitySelectModal
                  placeholder="Ví dụ: Hà Nội"
                  iconName="flight-takeoff"
                  value={departureCity.value}
                  onValueChange={(value, label) => setDepartureCity({ value, label })}
                />
              </View>

              {/* Thành phố đến */}
              <View>
                <Text className="text-text-primary pb-2 text-sm font-medium dark:text-gray-300">
                  Thành phố đến
                </Text>
                <CitySelectModal
                  placeholder="Ví dụ: TP. HCM"
                  iconName="flight-land"
                  value={arrivalCity.value}
                  onValueChange={(value, label) => setArrivalCity({ value, label })}
                />
              </View>

              {/* Ngày gửi */}
              <View>
                <DatePickerInput
                  label="Ngày gửi"
                  placeholder="Chọn ngày"
                  value={date}
                  onValueChange={setDate}
                  minimumDate={new Date()}
                />
              </View>

              {/* Loại tài liệu */}
              <View>
                <Text className="text-text-primary pb-2 text-sm font-medium dark:text-gray-300">
                  Loại tài liệu
                </Text>
                <ItemTypeSelect
                  placeholder="Chọn loại tài liệu"
                  value={itemType}
                  onValueChange={(value, label) => setItemType(value)}
                />
              </View>

              {/* Giá trị ước tính */}
              <View>
                <Text className="text-text-primary pb-2 text-sm font-medium dark:text-gray-300">
                  Giá trị ước tính tài liệu (VND)
                </Text>
                <View className="relative">
                  <MaterialIcons
                    name="payments"
                    size={20}
                    color="#6b7280"
                    style={{ position: 'absolute', left: 12, top: 17, zIndex: 10 }}
                  />
                  <TextInput
                    placeholder="Ví dụ: 5,000,000"
                    keyboardType="numeric"
                    value={itemValue}
                    onChangeText={setItemValue}
                    className="text-text-primary h-14 rounded-lg border border-gray-200 bg-background-light pl-10 pr-4 text-base dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions - Fixed at bottom */}
          <View className="px-4 pb-4 pt-3 border-t border-gray-200 dark:border-gray-700 gap-2 bg-white dark:bg-gray-800">
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleReset}
                className="flex-1 h-12 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <Text className="text-base font-semibold text-text-primary dark:text-white">
                  Đặt lại
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSearch}
                disabled={searchLoading}
                className={`flex-1 h-12 items-center justify-center rounded-lg ${searchLoading ? 'bg-gray-400' : 'bg-primary'
                  }`}
              >
                {searchLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="search" size={20} color="#fff" />
                    <Text className="text-base font-bold text-white">
                      Tìm kiếm
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

