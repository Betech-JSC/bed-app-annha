import { renderHook, waitFor } from '@testing-library/react-native';
import useRole from '@/hooks/useRole';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('useRole hook', () => {
  it('should fetch role from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('admin');

    const { result } = renderHook(() => useRole());

    await waitFor(() => {
      expect(result.current).toBe('admin');
    });
  });

  it('should return null if no role is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useRole());

    await waitFor(() => {
      expect(result.current).toBe(null);
    });
  });
});
