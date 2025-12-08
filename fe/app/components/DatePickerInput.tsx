import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

interface DatePickerInputProps {
  value: string; // Format: yyyy-mm-dd
  onValueChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onValueChange,
  placeholder = 'yyyy-mm-dd',
  label,
  minimumDate,
  maximumDate,
  disabled = false,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Parse string date to Date object
  const getDateFromString = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const selectedDate = value ? getDateFromString(value) : new Date();

  // Format date to yyyy-mm-dd
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date change
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      onValueChange(formatDate(selectedDate));
    }
  };

  // Handle press for iOS (need confirm button)
  const handleConfirmIOS = () => {
    setShowDatePicker(false);
  };

  return (
    <View className="w-full">
      {label && (
        <Text className="text-text-primary pb-2 text-sm font-medium dark:text-gray-300">
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => !disabled && setShowDatePicker(true)}
        disabled={disabled}
        className="relative w-full"
        activeOpacity={0.7}>
        <MaterialIcons
          name="calendar-today"
          size={20}
          color={disabled ? '#d1d5db' : '#6b7280'}
          style={{ position: 'absolute', left: 12, top: 17, zIndex: 10 }}
        />
        <View
          className={`h-14 w-full rounded-lg border pl-10 pr-4 ${
            disabled
              ? 'border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800'
              : 'border-gray-200 bg-background-light dark:border-gray-600 dark:bg-gray-700'
          }`}
          style={{ justifyContent: 'center' }}>
          <Text
            className={`text-base ${
              value
                ? 'text-text-primary dark:text-white'
                : 'text-gray-400 dark:text-gray-500'
            } ${disabled ? 'opacity-50' : ''}`}>
            {value || placeholder}
          </Text>
        </View>
      </TouchableOpacity>

      {showDatePicker && (
        <>
          {Platform.OS === 'ios' ? (
            // iOS Modal Style
            <View className="absolute bottom-0 left-0 right-0 z-50 rounded-t-xl bg-white dark:bg-gray-800">
              <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text className="text-base text-red-500">Hủy</Text>
                </TouchableOpacity>
                <Text className="text-base font-semibold text-text-primary dark:text-white">
                  Chọn ngày
                </Text>
                <TouchableOpacity onPress={handleConfirmIOS}>
                  <Text className="text-base font-semibold text-primary">Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                textColor={Platform.OS === 'ios' ? undefined : '#000000'}
              />
            </View>
          ) : (
            // Android Default Picker
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          )}
        </>
      )}
    </View>
  );
};

export default DatePickerInput;
