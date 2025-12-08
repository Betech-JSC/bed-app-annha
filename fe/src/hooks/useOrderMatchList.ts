import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { getDatabase, ref, onValue } from "firebase/database";
import * as Notifications from "expo-notifications";
import { app } from "@/firebaseConfig";
import api from "@/api/api";
import { Alert } from "react-native";

const db = getDatabase(app);

interface MatchData {
    status: string;
    matched_order_id: string;
    chat_id?: string | null;
}

export function useOrderMatchList(
    orderIds: string[],
    onConfirm: (chatId: string) => void,
    onReject?: (orderId: string) => void
) {
    const user = useSelector((state: RootState) => state.user);
    const shownMatchesRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Chỉ chạy khi user đã đăng nhập và có orders
        if (!user?.token || !orderIds || orderIds.length === 0) {
            return;
        }

        const unsubscribes = orderIds.map(orderId => {
            const matchRef = ref(db, `matches/${orderId}`);

            return onValue(matchRef, async snapshot => {
                const data: MatchData = snapshot.val();

                if (
                    data?.status === "pending_confirmation" &&
                    !shownMatchesRef.current.has(orderId)
                ) {
                    shownMatchesRef.current.add(orderId);

                    const message = `Đơn ${orderId} đã được ghép với đơn ${data.matched_order_id}`;

                    // 🔔 Gửi thông báo local bằng Expo Notifications
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: "Đơn hàng đã được ghép!",
                            body: message,
                            data: { orderId, matched_order_id: data.matched_order_id },
                            sound: true,
                        },
                        trigger: null, // gửi ngay lập tức
                    });

                    // Nếu app đang mở, vẫn có thể hiển thị alert xác nhận
                    const confirmMatch = async () => {
                        // Kiểm tra authentication trước khi gọi API
                        if (!user?.token) {
                            return;
                        }
                        try {
                            const res = await api.post("/orders/confirm-match", {
                                orderId,
                                action: "confirm",
                            });
                            if (res.data.chat_id) onConfirm(res.data.chat_id);
                        } catch (err: any) {
                            // Chỉ log error nếu không phải 401 (unauthorized)
                            if (err.response?.status !== 401) {
                                console.error("Error confirming match", err);
                            }
                        }
                    };

                    const rejectMatch = async () => {
                        // Kiểm tra authentication trước khi gọi API
                        if (!user?.token) {
                            return;
                        }
                        try {
                            await api.post("/orders/confirm-match", {
                                orderId,
                                action: "reject",
                            });
                            if (onReject) onReject(orderId);
                            shownMatchesRef.current.delete(orderId);
                        } catch (err: any) {
                            // Chỉ log error nếu không phải 401 (unauthorized)
                            if (err.response?.status !== 401) {
                                console.error("Error rejecting match", err);
                            }
                        }
                    };

                    // (Tùy chọn) Nếu muốn vẫn hiển thị Alert khi app đang foreground
                    Alert.alert("Đơn hàng đã được ghép", message, [
                        { text: "Từ chối", onPress: rejectMatch, style: "cancel" },
                        { text: "Xác nhận", onPress: confirmMatch },
                    ]);
                }
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [orderIds, user?.token]);
}
