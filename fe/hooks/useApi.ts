// hooks/useApi.ts
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';
import api from '@/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: any;
  data?: any;
  headers?: any;
  requireAuth?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

// Token key trong AsyncStorage
const TOKEN_KEY = process.env.EXPO_PUBLIC_TOKEN_KEY || '@auth_token';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useSelector((state: any) => state.user);

  const callApi = async (endpoint: string, options: ApiCallOptions = {}) => {
    const {
      method = 'GET',
      params,
      data,
      headers = {},
      requireAuth = true,
      onSuccess,
      onError,
    } = options;

    // Get token từ AsyncStorage hoặc Redux
    let token = user?.token;
    
    if (!token && requireAuth) {
      try {
        token = await AsyncStorage.getItem(TOKEN_KEY);
      } catch (e) {
        console.error('Error reading token from storage:', e);
      }
    }

    // Check authentication if required
    if (requireAuth && !token) {
      alert('Bạn cần đăng nhập để thực hiện thao tác này');
      router.push('/login');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare headers
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...(requireAuth && token && {
          Authorization: `Bearer ${token}`,
        }),
        ...headers,
      };

      // Make API call based on method
      let response;
      const config = {
        headers: requestHeaders,
        ...(params && { params }),
      };

      switch (method.toUpperCase()) {
        case 'GET':
          response = await api.get(endpoint, config);
          break;
        case 'POST':
          response = await api.post(endpoint, data, config);
          break;
        case 'PUT':
          response = await api.put(endpoint, data, config);
          break;
        case 'PATCH':
          response = await api.patch(endpoint, data, config);
          break;
        case 'DELETE':
          response = await api.delete(endpoint, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      console.log(`API ${method} ${endpoint} success:`, response.data);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response.data);
      }

      setLoading(false);
      return response.data;
    } catch (err: any) {
      console.error(`API ${method} ${endpoint} error:`, err);
      console.error('Error response:', err?.response?.data);

      const errorMessage = err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(errorMessage);

      // Handle authentication errors
      if (err?.response?.status === 401) {
        // Clear token khi hết hạn
        try {
          await AsyncStorage.removeItem(TOKEN_KEY);
        } catch (e) {
          console.error('Error removing token:', e);
        }
        
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        router.push('/login');
      } else if (onError) {
        onError(err);
      } else {
        alert(errorMessage);
      }

      setLoading(false);
      return null;
    }
  };

  return { callApi, loading, error };
};

export default useApi;