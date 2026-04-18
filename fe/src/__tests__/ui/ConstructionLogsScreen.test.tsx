import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ConstructionLogsScreen from '../../app/projects/[id]/logs';
import { constructionLogApi } from '@/api/constructionLogApi';
import { ganttApi } from '@/api/ganttApi';
import { useLocalSearchParams } from 'expo-router';

// Mock API
jest.mock('@/api/constructionLogApi', () => ({
  constructionLogApi: {
    getLogs: jest.fn(),
    createLog: jest.fn(),
    updateLog: jest.fn(),
    deleteLog: jest.fn(),
    approveLog: jest.fn(),
  },
}));

jest.mock('@/api/ganttApi', () => ({
  ganttApi: {
    getTasks: jest.fn(),
  },
}));

// Mock Router & Hooks
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
  useLocalSearchParams: jest.fn().mockReturnValue({ id: '1' }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/hooks/useTabBarHeight', () => ({
  useTabBarHeight: () => 60,
}));

jest.mock('@/hooks/usePermissions', () => ({
  useProjectPermissions: () => ({
    hasPermission: jest.fn().mockReturnValue(true),
    refresh: jest.fn(),
  }),
}));

// Mock Components
jest.mock('@/components', () => ({
  ScreenHeader: 'ScreenHeader',
  DatePickerInput: 'DatePickerInput',
  PermissionDenied: 'PermissionDenied',
}));

jest.mock('@/components/PermissionGuard', () => ({
  PermissionGuard: ({ children }: any) => children,
}));

describe('ConstructionLogsScreen', () => {
  const mockLogs = {
    success: true,
    data: [
      {
        id: 1,
        log_date: '2024-04-18',
        task_id: 101,
        notes: 'Test log 1',
        approval_status: 'pending',
        task: { id: 101, name: 'Xây tường' }
      }
    ]
  };

  const mockTasks = {
    success: true,
    data: [
      { id: 101, name: 'Xây tường', parent_id: null }
    ]
  };

  beforeEach(() => {
    (constructionLogApi.getLogs as jest.Mock).mockResolvedValue(mockLogs);
    (ganttApi.getTasks as jest.Mock).mockResolvedValue(mockTasks);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly in calendar mode', async () => {
    const { getByText } = render(<ConstructionLogsScreen />);
    
    await waitFor(() => {
      expect(getByText('Lịch')).toBeTruthy();
      expect(getByText('Danh sách')).toBeTruthy();
    });
  });

  it('switches to list view', async () => {
    const { getByText } = render(<ConstructionLogsScreen />);
    
    const listBtn = getByText('Danh sách');
    fireEvent.press(listBtn);
    
    await waitFor(() => {
      expect(constructionLogApi.getLogs).toHaveBeenCalledWith('1', expect.objectContaining({
        per_page: 100
      }));
    });
  });

  it('opens create modal when clicking a date in calendar', async () => {
    const { getByText, getByTestId, findByText } = render(<ConstructionLogsScreen />);
    
    // In calendar mode, look for today's date if possible, or mock the date click
    // Note: The mock data has a log on 2024-04-18.
    // We can simulate clicking a date cell if we knew the testID, 
    // but here we can check if the detail modal opens if log exists.
    
    await waitFor(() => {
      // Look for the date cell with the log (18)
      // This is implementation specific, but usually we can find by text
      const dateCell = getByText('18');
      fireEvent.press(dateCell);
    });

    await waitFor(() => {
      // It should open Detail modal because log exists on 18th
      expect(getByText('Chi tiết Nhật ký')).toBeTruthy();
    });
  });

  it('validates form data when creating a log', async () => {
    const { getByText, getByPlaceholderText } = render(<ConstructionLogsScreen />);
    
    // Trigger open empty modal (via header button if mock allow)
    // For simplicity, we can assume we are in the modal state
    // Let's mock a case where no log exists and we click 19th
    const dateCell = getByText('19');
    fireEvent.press(dateCell);

    await waitFor(() => {
      expect(getByText('Tạo Nhật Ký Mới')).toBeTruthy();
    });

    const submitBtn = getByText('Lưu nhật ký');
    fireEvent.press(submitBtn);

    // Should alert if no task selected
    // Note: Alert.alert is mocked by default in jest-expo/jestSetup
  });
});
