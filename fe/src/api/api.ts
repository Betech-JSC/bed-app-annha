import axios from "axios";
import { store } from "@/store";
import { API_URL } from "@env";
import { clearUser } from "@/reducers/userSlice";
import { router } from "expo-router";


const getBaseURL = (): string => {
    // Ưu tiên sử dụng API_URL từ .env
    if (API_URL && API_URL.trim() !== '') {
        // Đảm bảo có /api ở cuối
        const url = API_URL.trim();
        return url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
    }

    // Fallback dựa trên __DEV__
    if (__DEV__) {
        return 'http://localhost:8000/api';
    }

    // Production default
    return 'https://annha.betech-digital.com/api';
};

const baseURL = getBaseURL();
console.log('🌐 API BaseURL:', baseURL);

const api = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const state = store.getState();
        const user = state.user;

        if (user?.token) {
            config.headers['Authorization'] = `Bearer ${user.token}`;
        } else {
            // Log warning if no token is available
            console.warn('API request without token:', config.url);
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
            console.warn('401 Unauthorized - Clearing user and redirecting to login');

            // Clear user từ Redux store
            store.dispatch(clearUser());

            // Redirect về login
            // Sử dụng setTimeout để tránh lỗi navigation trong quá trình render
            setTimeout(() => {
                try {
                    // Check if we're not already on login page
                    router.replace('/login');
                } catch (e) {
                    console.error('Error redirecting to login:', e);
                }
            }, 100);
        }

        return Promise.reject(error);
    }
);

export default api;