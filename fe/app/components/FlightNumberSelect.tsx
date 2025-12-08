// FlightNumberSelect.tsx
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
    TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/api/api';
import { Image } from 'react-native';
import { getAirlineLogo } from '@/constants/airlines';

interface FlightNumberSelectProps {
    placeholder?: string;
    value?: string; // Full flight number: "VN123"
    onValueChange?: (value: string) => void; // Returns full flight number
    airline?: string; // Current airline value
    onAirlineChange?: (airline: string, airlineName: string) => void; // Optional: separate airline callback
}

interface Airline {
    id: number;
    iata_code: string;
    icao_code: string;
    name_vi: string;
    name_en: string;
}

const FlightNumberSelect = ({
    placeholder = 'Chọn hãng bay và nhập số chuyến',
    value: externalValue,
    onValueChange,
    airline: externalAirline,
    onAirlineChange,
}: FlightNumberSelectProps) => {
    const isDark = useColorScheme() === 'dark';
    const [airlineModalOpen, setAirlineModalOpen] = useState(false);
    const [airlines, setAirlines] = useState<Airline[]>([]);
    const [selectedAirline, setSelectedAirline] = useState<Airline | null>(null);
    const [flightNumber, setFlightNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Parse external value to extract airline code and number
    useEffect(() => {
        if (externalValue) {
            // Try to extract airline code (2-3 letters) and number
            const match = externalValue.match(/^([A-Z]{2,3})(\d+)$/i);
            if (match) {
                const [, code, num] = match;
                setFlightNumber(num);
                // Find airline by IATA or ICAO code
                const found = airlines.find(
                    (a) => a.iata_code?.toUpperCase() === code.toUpperCase() ||
                        a.icao_code?.toUpperCase() === code.toUpperCase()
                );
                if (found) {
                    setSelectedAirline(found);
                }
            } else {
                // If can't parse, try to find airline from externalAirline prop
                if (externalAirline && airlines.length > 0) {
                    const found = airlines.find(
                        (a) => a.iata_code?.toUpperCase() === externalAirline.toUpperCase() ||
                            a.icao_code?.toUpperCase() === externalAirline.toUpperCase() ||
                            a.name_vi?.toLowerCase().includes(externalAirline.toLowerCase())
                    );
                    if (found) {
                        setSelectedAirline(found);
                    }
                }
            }
        }
    }, [externalValue, externalAirline, airlines]);

    // Fetch airlines
    useEffect(() => {
        let mounted = true;

        const fetchAirlines = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get('airlines');
                let data = response.data;

                // Handle different response structures
                if (data?.success && Array.isArray(data.data)) {
                    data = data.data;
                } else if (data?.status === 'success' && Array.isArray(data.data)) {
                    data = data.data;
                } else if (Array.isArray(data)) {
                    data = data;
                }

                if (mounted && Array.isArray(data) && data.length > 0) {
                    setAirlines(data);
                }
            } catch (err: any) {
                console.error('Error fetching airlines:', err);
                setError(err?.message || 'Không thể tải danh sách hãng bay');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchAirlines();

        return () => {
            mounted = false;
        };
    }, []);

    // Update full flight number when airline or number changes
    useEffect(() => {
        if (selectedAirline && flightNumber) {
            const fullNumber = `${selectedAirline.iata_code}${flightNumber}`;
            if (onValueChange) {
                onValueChange(fullNumber);
            }
            if (onAirlineChange) {
                onAirlineChange(selectedAirline.iata_code, selectedAirline.name_vi);
            }
        }
    }, [selectedAirline, flightNumber, onValueChange, onAirlineChange]);

    const handleSelectAirline = (airline: Airline) => {
        setSelectedAirline(airline);
        setAirlineModalOpen(false);
    };

    const displayValue = selectedAirline && flightNumber
        ? `${selectedAirline.iata_code}${flightNumber}`
        : selectedAirline
            ? `${selectedAirline.iata_code}...`
            : '';

    return (
        <View className="flex-row gap-2">
            {/* Airline Select */}
            <View className="flex-1">
                <Pressable onPress={() => setAirlineModalOpen(true)}>
                    <View
                        className={`h-14 border bg-background-light pl-4 pr-4 dark:bg-gray-700 ${isDark ? 'border-gray-600' : 'border-gray-200'
                            } justify-center rounded-lg flex-row items-center`}>
                        <MaterialIcons
                            name="flight"
                            size={20}
                            color={isDark ? '#9ca3af' : '#6b7280'}
                        />
                        <Text
                            className="ml-2 flex-1"
                            style={{ color: isDark ? '#e5e7eb' : '#1f2937' }}>
                            {selectedAirline ? selectedAirline.name_vi : 'Chọn hãng bay'}
                        </Text>
                        <MaterialIcons
                            name="arrow-drop-down"
                            size={24}
                            color={isDark ? '#9ca3af' : '#6b7280'}
                        />
                    </View>
                </Pressable>

                <Modal
                    visible={airlineModalOpen}
                    animationType="slide"
                    transparent={Platform.OS === 'ios'}
                    onRequestClose={() => setAirlineModalOpen(false)}>
                    <View className="flex-1 justify-end">
                        <View className="rounded-t-xl bg-white p-4 dark:bg-gray-800" style={{ maxHeight: '60%' }}>
                            <View className="mb-2 flex-row items-center justify-between">
                                <Text className="text-text-primary text-base font-semibold dark:text-white">
                                    Chọn hãng hàng không
                                </Text>
                                <TouchableOpacity onPress={() => setAirlineModalOpen(false)}>
                                    <Text className="text-primary">Đóng</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={airlines}
                                keyExtractor={(item) => item.id?.toString() || item.iata_code}
                                keyboardShouldPersistTaps="handled"
                                ListEmptyComponent={
                                    <View className="py-8 items-center">
                                        {loading ? (
                                            <Text className="text-gray-500 dark:text-gray-400">Đang tải...</Text>
                                        ) : (
                                            <Text className="text-gray-500 dark:text-gray-400">Không có dữ liệu</Text>
                                        )}
                                    </View>
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelectAirline(item)}
                                        className={`flex-row items-center gap-3 border-b border-gray-100 py-3 dark:border-gray-700 ${selectedAirline?.id === item.id ? 'bg-primary/10' : ''
                                            }`}>
                                        <Image 
                                            source={{ uri: getAirlineLogo(item.name_vi, item.logo_url) }} 
                                            className="h-8 w-8" 
                                            resizeMode="contain" 
                                        />
                                        <View className="flex-1">
                                            <Text className="text-text-primary text-base font-medium dark:text-white">
                                                {item.name_vi}
                                            </Text>
                                            <Text className="text-text-secondary text-sm dark:text-gray-400">
                                                {item.iata_code} {item.icao_code ? `(${item.icao_code})` : ''}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>
            </View>

            {/* Flight Number Input */}
            <View className="flex-1">
                <View className="relative">
                    <TextInput
                        placeholder="Số chuyến (VD: 123)"
                        value={flightNumber}
                        onChangeText={setFlightNumber}
                        keyboardType="numeric"
                        editable={!!selectedAirline}
                        className={`h-14 border bg-background-light px-4 dark:bg-gray-700 ${isDark ? 'border-gray-600' : 'border-gray-200'
                            } rounded-lg text-text-primary dark:text-white ${!selectedAirline ? 'opacity-50' : ''
                            }`}
                        placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                    />
                </View>
            </View>
        </View>
    );
};

export default FlightNumberSelect;

