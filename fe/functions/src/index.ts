
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const sendChatNotification = functions.database
    .ref("/chats/{chatId}/messages/{messageId}")
    .onCreate(async (snapshot, context) => {
        const message = snapshot.val();
        const chatId = context.params.chatId;

        if (!message) return null;

        // Lấy token người nhận từ DB (ví dụ /users/{userId}/fcmToken)
        const recipientId = message.toUserId;
        const userSnapshot = await admin.database().ref(`/users/${recipientId}/fcmToken`).once("value");
        const token = userSnapshot.val();

        if (!token) return null;

        const payload = {
            notification: {
                title: `Tin nhắn mới từ ${message.fromUserName}`,
                body: message.text,
                sound: "default",
            },
            data: {
                chatId,
            },
        };

        try {
            await admin.messaging().sendToDevice(token, payload);
            console.log("Notification sent successfully");
        } catch (err) {
            console.error("Error sending notification", err);
        }

        return null;
    });
