import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ApprovalCenterScreen from '../../app/approvals/index';
import { approvalCenterApi } from '@/api/approvalCenterApi';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Mock API
jest.mock('@/api/approvalCenterApi', () => ({
  approvalCenterApi: {
    getApprovals: jest.fn(),
    quickApprove: jest.fn(),
    quickReject: jest.fn(),
  },
}));

// Mock Router & Hooks
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn().mockReturnValue({ tab: 'management' }),
}));

jest.mock('@/hooks/useTabBarHeight', () => ({
  useTabBarHeight: () => 60,
}));

jest.mock('@/components', () => ({
  ScreenHeader: 'ScreenHeader',
  PermissionDenied: 'PermissionDenied',
}));

describe('ApprovalCenterScreen', () => {
  const mockData = {
    success: true,
    data: {
      summary: [
        { type: 'management', total: 5, color: '#F59E0B' },
        { type: 'accountant', total: 2, color: '#10B981' }
      ],
      items: [
        {
          id: 1,
          type: 'company_cost',
          title: 'Văn phòng phẩm tháng 4',
          subtitle: 'Mua bút, giấy',
          amount: 500000,
          created_by: 'Kế toán A',
          created_at: '2024-04-18',
          status: 'pending',
          role_group: 'management'
        }
      ],
      recent_items: [],
      stats: {
        pending_total: 5,
        pending_amount: 15000000,
        approved_today: 2,
        rejected_today: 0
      }
    }
  };

  beforeEach(() => {
    (approvalCenterApi.getApprovals as jest.Mock).mockResolvedValue(mockData);
  });

  it('renders stats and tabs correctly', async () => {
    const { getByText } = render(<ApprovalCenterScreen />);
    
    await waitFor(() => {
      expect(getByText('5')).toBeTruthy(); // pending_total
      expect(getByText('Chờ duyệt')).toBeTruthy();
      expect(getByText('BĐH')).toBeTruthy();
      expect(getByText('Kế Toán')).toBeTruthy();
    });
  });

  it('displays approval items in the list', async () => {
    const { getByText } = render(<ApprovalCenterScreen />);
    
    await waitFor(() => {
      expect(getByText('Văn phòng phẩm tháng 4')).toBeTruthy();
      expect(getByText('500.000 ₫')).toBeTruthy();
    });
  });

  it('opens detail modal when item is pressed', async () => {
    const { getByText, queryByText } = render(<ApprovalCenterScreen />);
    
    await waitFor(() => {
      const item = getByText('Văn phòng phẩm tháng 4');
      fireEvent.press(item);
    });

    await waitFor(() => {
      expect(getByText('Số tiền')).toBeTruthy();
      expect(getByText('Phê duyệt')).toBeTruthy();
      expect(getByText('Từ chối')).toBeTruthy();
    });
  });
});
