import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { app } from "@/firebaseConfig";

/**
 * Hook để lấy số lượng notifications chưa đọc từ Firebase
 */
export function useUnreadNotificationCount(): number {
    const user = useSelector((state: RootState) => state.user);
    const [unreadCount, setUnreadCount] = useState(0);
    const db = getDatabase(app);
    const listenerRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!user?.id) {
            setUnreadCount(0);
            return;
        }

        const notificationsRef = ref(db, `notifications/${user.id}`);

        // Listen for changes
        const unsubscribe = onValue(
            notificationsRef,
            (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    // Convert Firebase object to array and count unread
                    const notificationsList = Object.values(data) as any[];
                    const unread = notificationsList.filter((n: any) => !n.read).length;
                    setUnreadCount(unread);
                } else {
                    setUnreadCount(0);
                }
            },
            (error) => {
                console.error("Error listening to unread notifications:", error);
                setUnreadCount(0);
            }
        );

        listenerRef.current = () => {
            off(notificationsRef);
        };

        return () => {
            if (listenerRef.current) {
                listenerRef.current();
            }
        };
    }, [user?.id, db]);

    return unreadCount;
}



