// src/utils/firebaseChat.ts
import { database } from "@/firebaseConfig";
import { ref, push, onValue } from "firebase/database";

/**
 * Gửi 1 tin nhắn test
 */
export const testSendMessage = async () => {
    const chatRef = ref(database, "messages/testChat");
    await push(chatRef, {
        senderId: "user_1",
        receiverId: "user_2",
        text: "Xin chào từ React Native 👋",
        timestamp: Date.now(),
    });
    console.log("✅ Tin nhắn test đã gửi lên Firebase!");
};

/**
 * Lắng nghe tin nhắn realtime trong node testChat
 */
export const listenMessages = () => {
    const messagesRef = ref(database, "messages/testChat");
    onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        console.log("📩 Dữ liệu hiện tại:", data);
    });
};
