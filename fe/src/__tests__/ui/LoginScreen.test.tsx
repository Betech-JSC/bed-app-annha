import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../app/login';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../reducers/userSlice';
import permissionsReducer from '../reducers/permissionsSlice';
import api from '../api/api';
import { router } from 'expo-router';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Notifications
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
}));

// Mock API
jest.mock('../api/api', () => ({
  post: jest.fn(),
}));

// Mock Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  const store = configureStore({
    reducer: {
      user: userReducer,
      permissions: permissionsReducer,
    },
  });
  return render(<Provider store={store}>{component}</Provider>);
};

describe('LoginScreen', () => {
  it('renders correctly', () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(<LoginScreen />);
    
    expect(getByPlaceholderText('Nhập email của bạn')).toBeTruthy();
    expect(getByPlaceholderText('Nhập mật khẩu')).toBeTruthy();
    expect(getByText('Đăng Nhập')).toBeTruthy();
  });

  it('shows error message if fields are empty', async () => {
    const { getByText } = renderWithProviders(<LoginScreen />);
    
    fireEvent.press(getByText('Đăng Nhập'));
    
    await waitFor(() => {
      expect(getByText('Vui lòng nhập đầy đủ email và mật khẩu')).toBeTruthy();
    });
  });

  it('handles successful login', async () => {
    const mockResponse = {
      data: {
        status: 'success',
        data: {
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            token: 'test-token',
          }
        }
      }
    };
    
    (api.post as jest.Mock).mockResolvedValue(mockResponse);
    
    const { getByPlaceholderText, getByText } = renderWithProviders(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Nhập email của bạn'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Nhập mật khẩu'), 'password123');
    fireEvent.press(getByText('Đăng Nhập'));
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/login', expect.objectContaining({
        email: 'test@example.com',
        password: 'password123',
      }));
    });
  });

  it('shows error if login fails', async () => {
    (api.post as jest.Mock).mockRejectedValue({
      response: {
        status: 401,
        data: { message: 'Invalid credentials' }
      }
    });
    
    const { getByPlaceholderText, getByText } = renderWithProviders(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Nhập email của bạn'), 'wrong@example.com');
    fireEvent.changeText(getByPlaceholderText('Nhập mật khẩu'), 'wrong');
    fireEvent.press(getByText('Đăng Nhập'));
    
    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });
});
