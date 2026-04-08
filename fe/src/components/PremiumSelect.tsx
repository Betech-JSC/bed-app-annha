import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    SafeAreaView,
    ScrollView,
    TextInput,
    ViewStyle,
    TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface SelectOption {
    value: string | number;
    label: string;
}

interface PremiumSelectProps {
    label?: string | React.ReactNode;
    value: string | number | null;
    options: SelectOption[];
    onSelect: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    containerStyle?: ViewStyle;
    inputStyle?: ViewStyle;
    labelStyle?: TextStyle;
    showLabel?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
}

export default function PremiumSelect({
    label,
    value,
    options,
    onSelect,
    placeholder = "Chọn mục",
    disabled = false,
    required = false,
    error,
    containerStyle,
    inputStyle,
    labelStyle,
    showLabel = true,
    searchable = false,
    searchPlaceholder = "Tìm kiếm...",
}: PremiumSelectProps) {
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const insets = useSafeAreaInsets();

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = searchable
        ? options.filter((opt) =>
              opt.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : options;

    const handleSelect = (option: SelectOption) => {
        onSelect(option.value);
        setShowModal(false);
        setSearchQuery("");
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {showLabel && label && (
                <View style={styles.labelContainer}>
                    {typeof label === "string" ? (
                        <Text style={[styles.label, labelStyle]}>
                            {label}
                            {required && <Text style={styles.required}> *</Text>}
                        </Text>
                    ) : (
                        label
                    )}
                </View>
            )}

            <TouchableOpacity
                style={[
                    styles.selectButton,
                    disabled && styles.disabled,
                    error && styles.errorBorder,
                    inputStyle,
                ]}
                onPress={() => !disabled && setShowModal(true)}
                disabled={disabled}
            >
                <Text
                    style={[
                        styles.selectButtonText,
                        !selectedOption && styles.placeholder,
                    ]}
                    numberOfLines={1}
                >
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Ionicons
                    name="chevron-down"
                    size={20}
                    color={disabled ? "#9CA3AF" : error ? "#EF4444" : "#6B7280"}
                />
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                visible={showModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        activeOpacity={1} 
                        onPress={() => setShowModal(false)} 
                    />
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {typeof label === "string" ? label : "Chọn mục"}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        {searchable && (
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={searchPlaceholder}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>
                        )}

                        <ScrollView style={styles.optionsList}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.optionItem,
                                            value === option.value && styles.optionItemActive,
                                        ]}
                                        onPress={() => handleSelect(option)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                value === option.value && styles.optionTextActive,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                        {value === option.value && (
                                            <Ionicons name="checkmark" size={20} color="#1B4F72" />
                                        )}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                                </View>
                            )}
                            <View style={{ height: insets.bottom + 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    labelContainer: {
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    required: {
        color: "#EF4444",
    },
    selectButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 14,
        backgroundColor: "#FFFFFF",
        minHeight: 48,
    },
    disabled: {
        backgroundColor: "#F3F4F6",
        opacity: 0.6,
    },
    errorBorder: {
        borderColor: "#EF4444",
    },
    selectButtonText: {
        fontSize: 15,
        color: "#1F2937",
        flex: 1,
        marginRight: 8,
    },
    placeholder: {
        color: "#9CA3AF",
    },
    errorText: {
        fontSize: 12,
        color: "#EF4444",
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 15,
        color: "#1F2937",
    },
    optionsList: {
        paddingHorizontal: 8,
    },
    optionItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginVertical: 2,
    },
    optionItemActive: {
        backgroundColor: "#F0F9FF",
    },
    optionText: {
        fontSize: 16,
        color: "#4B5563",
    },
    optionTextActive: {
        color: "#1B4F72",
        fontWeight: "700",
    },
    emptyContainer: {
        padding: 40,
        alignItems: "center",
    },
    emptyText: {
        color: "#9CA3AF",
        fontSize: 15,
    },
});
