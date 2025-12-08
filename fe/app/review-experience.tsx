import React, { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ReviewExperienceScreen() {
    const router = useRouter();

    // Đánh giá sao cho đối tác
    const [partnerRating, setPartnerRating] = useState(4);
    const [appRating, setAppRating] = useState(5);

    // Thumb feedback
    const [onTime, setOnTime] = useState<"yes" | "no" | null>(null);
    const [friendly, setFriendly] = useState<"yes" | "no" | null>(null);
    const [packaging, setPackaging] = useState<"yes" | "no" | null>(null);

    const [partnerComment, setPartnerComment] = useState("");
    const [appComment, setAppComment] = useState("");

    const StarButton = ({ filled, onPress }: { filled: boolean; onPress: () => void }) => (
        <TouchableOpacity onPress={onPress} className="p-2">
            <MaterialIcons
                name="star"
                size={36}
                color={filled ? "#2563EB" : "#9CA3AF"}
                style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}
            />
        </TouchableOpacity>
    );

    const ThumbButton = ({
        type,
        selected,
        onPress,
        label,
    }: {
        type: "yes" | "no";
        selected: boolean;
        onPress: () => void;
        label: string;
    }) => (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2 ${selected
                ? "border-primary bg-primary/10"
                : "border-gray-300 dark:border-white/20 bg-transparent"
                }`}
        >
            <MaterialIcons
                name={type === "yes" ? "thumb-up" : "thumb-down"}
                size={18}
                color={selected ? "#2563EB" : "#6B7280"}
            />
            <Text className={`text-sm font-medium ${selected ? "text-primary" : "text-text-primary dark:text-white"}`}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-10 flex-row items-center justify-between bg-background-light dark:bg-background-dark p-4 pb-2">
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#111318" className="dark:text-white" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-bold text-text-primary dark:text-white -ml-10">
                    Đánh giá
                </Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
                <Text className="text-[32px] font-bold text-text-primary dark:text-white pb-6">
                    Đánh giá trải nghiệm của bạn
                </Text>

                {/* Đánh giá đối tác */}
                <View className="mb-6 rounded-xl bg-white dark:bg-background-dark dark:border dark:border-white/10 p-4 shadow-sm">
                    <Text className="text-lg font-bold text-text-primary dark:text-white mb-4">
                        Đánh giá đối tác
                    </Text>

                    {/* Avatar + tên */}
                    <View className="flex-row items-center gap-4 mb-4">
                        <Image
                            source={{
                                uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuAXEF6fofl1m1gHH2nGbU5ZSoDFSmgDMn4jYEuD_k4IfCy8FqphIeBCLFKzadurQYQ8YuGnf6pH0wk1ksANyK6hF3TP9--kOvA3tA0cDGb_hcUykq3EfvfuagCa_E2whyAL5ZlmtlkK60TTTJGwwIwwwunu3Sif90Mu7KAb_vuxw8Pgtab9FMc_eEYADOL37FIzF4ul9Au-cRTqy1uFaSYPAoQazyxEdYCE8Ms5dqmZ0dj4zzlNSHwhmktazffqMLIuO2IBXmLat8ae",
                            }}
                            className="w-12 h-12 rounded-full"
                        />
                        <Text className="flex-1 text-base font-medium text-text-primary dark:text-white">
                            Nguyễn Văn A
                        </Text>
                    </View>

                    {/* 5 sao */}
                    <View className="flex-row justify-center gap-2 py-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <StarButton
                                key={star}
                                filled={star <= partnerRating}
                                onPress={() => setPartnerRating(star)}
                            />
                        ))}
                    </View>

                    <View className="border-t border-gray-200 dark:border-white/10 mb-4" />

                    {/* Thumb feedback */}
                    <View className="gap-4">
                        {[
                            { label: "Giao hàng đúng giờ?", state: onTime, setState: setOnTime },
                            { label: "Thái độ thân thiện?", state: friendly, setState: setFriendly },
                            { label: "Đóng gói cẩn thận?", state: packaging, setState: setPackaging },
                        ].map((item, i) => (
                            <View key={i} className="flex-row items-center justify-between">
                                <Text className="text-base text-text-primary dark:text-white">{item.label}</Text>
                                <View className="flex-row gap-2">
                                    <ThumbButton
                                        type="yes"
                                        selected={item.state === "yes"}
                                        onPress={() => item.setState("yes")}
                                        label="Có"
                                    />
                                    <ThumbButton
                                        type="no"
                                        selected={item.state === "no"}
                                        onPress={() => item.setState("no")}
                                        label="Không"
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Nhận xét */}
                    <TextInput
                        multiline
                        numberOfLines={4}
                        value={partnerComment}
                        onChangeText={setPartnerComment}
                        placeholder="Viết nhận xét của bạn..."
                        placeholderTextColor="#9CA3AF"
                        className="mt-4 min-h-[100px] rounded-lg border border-gray-200 dark:border-white/10 bg-background-light dark:bg-white/5 p-3 text-base text-text-primary dark:text-white"
                    />
                </View>

                {/* Đánh giá SkySend */}
                <View className="rounded-xl bg-white dark:bg-background-dark dark:border dark:border-white/10 p-4 shadow-sm">
                    <Text className="text-lg font-bold text-text-primary dark:text-white mb-4">
                        Đánh giá SkySend
                    </Text>

                    <View className="flex-row justify-center gap-2 py-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <StarButton
                                key={star}
                                filled={star <= appRating}
                                onPress={() => setAppRating(star)}
                            />
                        ))}
                    </View>

                    <TextInput
                        multiline
                        numberOfLines={4}
                        value={appComment}
                        onChangeText={setAppComment}
                        placeholder="Viết nhận xét của bạn..."
                        placeholderTextColor="#9CA3AF"
                        className="min-h-[100px] rounded-lg border border-gray-200 dark:border-white/10 bg-background-light dark:bg-white/5 p-3 text-base text-text-primary dark:text-white"
                    />
                </View>
            </ScrollView>

            {/* Nút Gửi đánh giá – fixed bottom */}
            <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-gray-200 dark:border-white/10 p-4">
                <TouchableOpacity
                    onPress={() => router.push("/review-success")}
                    className="h-14 rounded-lg bg-primary justify-center items-center"
                >
                    <Text className="text-white text-base font-bold">Gửi đánh giá</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}