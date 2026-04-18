import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import api from '@/api/api';
import { authApi } from '@/api/authApi';

const mock = new MockAdapter(api);

describe('authApi', () => {
  afterEach(() => {
    mock.reset();
  });

  it('should login successfully', async () => {
    const mockResponse = {
      token: 'test-token',
      user: { id: 1, name: 'Test User' }
    };

    mock.onPost('/login').reply(200, mockResponse);

    const result = await authApi.login('test@example.com', 'password123');

    expect(result).toEqual(mockResponse);
  });

  it('should logout successfully', async () => {
    mock.onPost('/logout').reply(200, { success: true });

    const result = await authApi.logout();

    expect(result).toEqual({ success: true });
  });

  it('should handle forgot password', async () => {
    mock.onPost('/forgot-password').reply(200, { message: 'Reset email sent' });

    const result = await authApi.forgotPassword('test@example.com');

    expect(result).toEqual({ message: 'Reset email sent' });
  });

  it('should handle reset password', async () => {
    const resetData = {
      token: 'reset-token',
      email: 'test@example.com',
      password: 'new-password',
      password_confirmation: 'new-password'
    };

    mock.onPost('/reset-password').reply(200, { success: true });

    const result = await authApi.resetPassword(resetData);

    expect(result).toEqual({ success: true });
  });
});
