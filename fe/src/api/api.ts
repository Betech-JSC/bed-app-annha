import axios from "axios";
import { store } from "@/store";
import { API_URL } from "@env";
import { clearUser } from "@/reducers/userSlice";
import { router } from "expo-router";

const api = axios.create({
    baseURL: "http://localhost:8000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// const api = axios.create({
//     baseURL: "http://192.168.1.90:8000/api", // dùng IP LAN thay vì localhost
//     headers: {
//         "Content-Type": "application/json",
//     },
// });

// const api = axios.create({
//     baseURL: "https://annha.betech-digital.com/api",
//     headers: {
//         "Content-Type": "application/json",
//     },
// });

api.interceptors.request.use(
    (config) => {
        const state = store.getState();
        const user = state.user;

        if (user?.token) {
            config.headers['Authorization'] = `Bearer ${user.token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor xử lý response - Xử lý 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Xử lý lỗi 401 (Unauthorized)
        if (error.response?.status === 401) {
            // Clear user từ Redux store
            store.dispatch(clearUser());

            // Redirect về login (chỉ nếu không đang ở trang login)
            const currentRoute = router.pathname || '';
            if (!currentRoute.includes('/login')) {
                router.replace('/login');
            }
        }

        return Promise.reject(error);
    }
);

export default api;