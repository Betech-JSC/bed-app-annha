// app/chat/[chatId].tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import ChatRoom from "../components/ChatRoom";
import { MaterialIcons } from "@expo/vector-icons";

export default function ChatDetailScreen() {
    const { chatId, partnerName } = useLocalSearchParams<{
        chatId: string;
        partnerName?: string;
    }>();
    const router = useRouter();

    if (!chatId) {
        return (
            <View style={styles.container}>
                <Text>Chat ID không hợp lệ</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: partnerName || "Chat",
                    headerShown: true,
                }}
            />
            <ChatRoom chatId={chatId} />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});