import axios from "axios";
import { store } from "@/store";
import { API_URL } from "@env";
import { clearUser } from "@/reducers/userSlice";
import { clearPermissions } from "@/reducers/permissionsSlice";
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

// Interceptor xử lý response - Xử lý các lỗi HTTP
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;

        // Xử lý lỗi 401 (Unauthorized)
        if (status === 401) {
            console.warn('401 Unauthorized - Clearing user and redirecting to login');

            // Clear user và permissions từ Redux store
            store.dispatch(clearUser());
            store.dispatch(clearPermissions());

            // Redirect về login
            setTimeout(() => {
                try {
                    router.replace('/login');
                } catch (e) {
                    console.error('Error redirecting to login:', e);
                }
            }, 100);
        }
        // Xử lý lỗi 429 (Too Many Requests) - Rate Limiting
        else if (status === 429) {
            const retryAfter = parseInt(error.response?.headers['retry-after'] || error.response?.headers['x-ratelimit-reset'] || '60');
            const remaining = error.response?.headers['x-ratelimit-remaining'] || '0';

            console.warn(`429 Too Many Requests - Rate limit exceeded. Retry after ${retryAfter} seconds. Remaining: ${remaining}`);

            // Store retry information
            error.retryAfter = retryAfter;
            error.rateLimitRemaining = remaining;
            error.userMessage = `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retryAfter} giây.`;

            // Note: User-friendly alert should be shown in the component that catches this error
            // This prevents showing multiple alerts for the same rate limit event
        }
        // Xử lý lỗi 500 (Internal Server Error)
        else if (status === 500) {
            console.error('500 Internal Server Error:', error.response?.data);
            error.userMessage = message || 'Lỗi máy chủ. Vui lòng thử lại sau.';
        }
        // Xử lý lỗi 403 (Forbidden) - Không có quyền
        else if (status === 403) {
            // Không log error để tránh hiển thị toast notification tự động
            // Chỉ log warning để debug
            console.warn('403 Forbidden - Insufficient permissions:', error.config?.url);
            error.userMessage = message || 'Bạn không có quyền thực hiện thao tác này.';
            // Đánh dấu không hiển thị toast cho lỗi này
            error.suppressToast = true;
            error.suppressErrorLog = true;
        }
        // Xử lý lỗi 404 (Not Found)
        else if (status === 404) {
            console.warn('404 Not Found:', error.config?.url);
            error.userMessage = message || 'Không tìm thấy tài nguyên.';
        }
        // Xử lý lỗi validation (422)
        else if (status === 422) {
            const errors = error.response?.data?.errors;
            if (errors) {
                const firstError = Object.values(errors)[0];
                error.userMessage = Array.isArray(firstError) ? firstError[0] : firstError;
            } else {
                error.userMessage = message || 'Dữ liệu không hợp lệ.';
            }
        }
        // Lỗi network hoặc không có response
        else if (!error.response) {
            console.error('Network Error:', error.message);
            error.userMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
        }
        // Các lỗi khác
        else {
            error.userMessage = message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
        }

        return Promise.reject(error);
    }
);

export default api;