// src/utils/firebaseOrderMatch.ts
import { database } from "@/firebaseConfig";
import { ref, onValue, set, push, remove, get, child } from "firebase/database";

/**
 * Tạo một đơn hàng mới chờ match
 * @param order Thông tin đơn hàng
 */
export const createOrder = async (order: {
    id: string;
    userId: string;
    type: "send" | "receive"; // Loại đơn: người gửi hoặc người nhận
    from: string;
    to: string;
}) => {
    const orderRef = ref(database, `orders/${order.id}`);
    await set(orderRef, {
        ...order,
        status: "waiting",
        createdAt: Date.now(),
    });
    console.log("✅ Đã tạo đơn hàng chờ match:", order.id);
};

/**
 * Theo dõi realtime danh sách đơn hàng để check match
 * Khi có match phù hợp, gọi callback matchFound(orderA, orderB)
 */
export const listenForOrderMatch = (currentOrderId: string, matchFound: Function) => {
    const ordersRef = ref(database, "orders");

    onValue(ordersRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const currentOrder = data[currentOrderId];
        if (!currentOrder || currentOrder.status !== "waiting") return;

        // Duyệt danh sách order tìm match
        for (const [id, order] of Object.entries<any>(data)) {
            if (id === currentOrderId) continue;
            if (order.status === "waiting" && order.type !== currentOrder.type) {
                // Match thành công
                console.log("🎯 Match found:", currentOrderId, "↔", id);

                // Cập nhật trạng thái match trong database
                await set(ref(database, `matches/${currentOrderId}_${id}`), {
                    orderA: currentOrder,
                    orderB: order,
                    matchedAt: Date.now(),
                });

                // Đánh dấu cả 2 đơn là matched
                await set(ref(database, `orders/${currentOrderId}/status`), "matched");
                await set(ref(database, `orders/${id}/status`), "matched");

                // Gọi callback để xử lý trong app (ví dụ: điều hướng đến chat)
                matchFound(currentOrder, order);
                break;
            }
        }
    });
};

/**
 * Theo dõi match realtime dành cho user — khi đơn của họ được match
 */
export const listenForUserMatch = (userId: string, callback: Function) => {
    const matchesRef = ref(database, "matches");

    onValue(matchesRef, (snapshot) => {
        const matches = snapshot.val();
        if (!matches) return;

        Object.entries<any>(matches).forEach(([matchId, match]) => {
            if (
                match.orderA.userId === userId ||
                match.orderB.userId === userId
            ) {
                callback(match);
            }
        });
    });
};

/**
 * Xoá đơn hàng khi huỷ
 */
export const cancelOrder = async (orderId: string) => {
    await remove(ref(database, `orders/${orderId}`));
    console.log("❌ Đã huỷ đơn hàng:", orderId);
};
