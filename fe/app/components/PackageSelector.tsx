import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

export default function PackageSelector({ formData, handleInputChange }) {
    const items = [
        { label: "Hộp", image: require("@assets/images/box.webp") },
        { label: "Tài liệu", image: require("@assets/images/document.webp") },
        { label: "Khác", image: require("@assets/images/orther.webp") },
    ];

    const selectItem = (label) => {
        handleInputChange("special_instructions", label);
    };

    return (
        <View className="flex-row items-center gap-x-[12px]">
            {items.map((item) => {
                const isSelected = formData.special_instructions === item.label;
                return (
                    <TouchableOpacity
                        key={item.label}
                        onPress={() => selectItem(item.label)}
                        className={`flex-row items-center gap-x-[8px] py-[8px] px-[12px] rounded-[10px] border ${isSelected ? "border-blue-500 bg-blue-100" : "border-[#D0D5DD] bg-white"
                            }`}
                    >
                        <Image source={item.image} className="w-[24px] h-[24px]" />
                        <Text>{item.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
