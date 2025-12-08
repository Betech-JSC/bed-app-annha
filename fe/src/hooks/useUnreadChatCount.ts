import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { getDatabase, ref, get, onValue } from "firebase/database";
import { app } from "@/firebaseConfig";
import api from "@/api/api";

/**
 * Hook để lấy tổng số tin nhắn chưa đọc từ tất cả các chat
 */
export function useUnreadChatCount() {
    const user = useSelector((state: RootState) => state.user);
    const [unreadCount, setUnreadCount] = useState(0);
    const db = getDatabase(app);
    const listenersRef = useRef<(() => void)[]>([]);
    const chatUnreadMapRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        // Check cả user id và token để đảm bảo user đã đăng nhập
        if (!user?.id || !user?.token) {
            setUnreadCount(0);
            // Cleanup listeners nếu có
            listenersRef.current.forEach((unsubscribe) => unsubscribe());
            listenersRef.current = [];
            chatUnreadMapRef.current.clear();
            return;
        }

        let isMounted = true;
        // Lưu token hiện tại để check trong async function
        const currentToken = user?.token;

        const fetchAndListenUnreadCount = async () => {
            try {
                // Kiểm tra lại token trước khi gọi API
                if (!currentToken || !isMounted) {
                    return;
                }

                // Lấy orders từ API với error handling
                let ordersData = [];
                try {
                    const response = await api.get("orders/getList");
                    
                    if (response.data?.success) {
                        if (response.data.data?.data) {
                            ordersData = response.data.data.data;
                        } else if (Array.isArray(response.data.data)) {
                            ordersData = response.data.data;
                        }
                    }
                } catch (apiError: any) {
                    // Nếu là 401 (unauthorized), user đã logout - không cần xử lý
                    if (apiError.response?.status === 401) {
                        // Silent fail - user đã logout
                        return;
                    }
                    // Log các lỗi khác nhưng không throw
                    if (isMounted && currentToken) {
                        console.error("Error fetching orders for unread count:", apiError);
                    }
                    return;
                }

                // Kiểm tra lại sau khi fetch API (user có thể đã logout trong lúc fetch)
                if (!currentToken || !isMounted) {
                    return;
                }

                // Lọc orders có chat_id
                const ordersWithChat = ordersData.filter((order: any) => order.chat_id);

                // Cleanup listeners cũ
                listenersRef.current.forEach((unsubscribe) => unsubscribe());
                listenersRef.current = [];
                chatUnreadMapRef.current.clear();

                // Tính tổng unread count
                const updateTotalUnread = () => {
                    if (!isMounted) return;
                    const total = Array.from(chatUnreadMapRef.current.values()).reduce((sum, count) => sum + count, 0);
                    setUnreadCount(total);
                };

                // Setup listener cho mỗi chat
                for (const order of ordersWithChat) {
                    const chatId = order.chat_id;
                    if (!chatId) continue;

                    try {
                        // Lấy thông tin chat
                        const chatRef = ref(db, `chats/${chatId}`);
                        const chatSnap = await get(chatRef);
                        const chatData = chatSnap.val();
                        if (!chatData) continue;

                        // Tìm user đối phương
                        const usersList: any[] = Array.isArray(chatData.users)
                            ? chatData.users
                            : Object.keys(chatData.users || {});
                        const otherUserId = usersList.find((id: any) => String(id) !== String(user?.id));
                        if (!otherUserId) continue;

                        // Lấy thông tin user hiện tại để lấy last_read
                        const currentUserRef = ref(db, `users/${user.id}`);
                        const currentUserSnap = await get(currentUserRef);
                        const currentUserData = currentUserSnap.val() || {};

                        // Tính unread count cho chat này
                        const calculateUnread = (messagesData: any) => {
                            if (!messagesData) return 0;
                            
                            const messagesArray = Object.values(messagesData) as any[];
                            // last_read của user hiện tại cho chat này
                            const lastReadTimestamp = (currentUserData?.last_read?.[chatId] || 0);
                            
                            // Đếm tin nhắn từ đối phương sau thời điểm last_read
                            return messagesArray.filter((msg: any) => 
                                String(msg.sender_id) === String(otherUserId) && 
                                msg.timestamp > lastReadTimestamp
                            ).length;
                        };

                        // Lấy messages ban đầu
                        const messagesRef = ref(db, `chats/${chatId}/messages`);
                        const messagesSnap = await get(messagesRef);
                        const initialUnread = calculateUnread(messagesSnap.val());
                        chatUnreadMapRef.current.set(chatId, initialUnread);

                        // Setup listener để update realtime
                        const messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
                            if (!isMounted) return;
                            
                            const messagesData = snapshot.val();
                            const currentUnread = calculateUnread(messagesData);
                            chatUnreadMapRef.current.set(chatId, currentUnread);
                            updateTotalUnread();
                        });
                        listenersRef.current.push(messagesUnsubscribe);

                    } catch (error) {
                        // Chỉ log error nếu không phải do user logout
                        if (isMounted && currentToken) {
                            console.error(`Error fetching chat ${chatId}:`, error);
                        }
                    }
                }

                // Kiểm tra lại trước khi update (user có thể đã logout)
                if (!currentToken || !isMounted) {
                    return;
                }

                // Tính tổng ban đầu
                updateTotalUnread();

            } catch (error: any) {
                // Nếu là 401 (unauthorized), user đã logout - không cần xử lý
                if (error.response?.status === 401) {
                    // Silent fail - user đã logout
                    return;
                }
                // Chỉ log và update nếu user vẫn còn đăng nhập
                if (isMounted && currentToken) {
                    console.error("Error fetching unread count:", error);
                    setUnreadCount(0);
                }
            }
        };

        fetchAndListenUnreadCount();

        return () => {
            isMounted = false;
            listenersRef.current.forEach((unsubscribe) => unsubscribe());
            listenersRef.current = [];
            chatUnreadMapRef.current.clear();
        };
    }, [user?.id, user?.token, db]);

    return unreadCount;
}

