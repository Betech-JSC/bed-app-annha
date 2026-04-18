import MockAdapter from 'axios-mock-adapter';
import api from '@/api/api';
import { approvalCenterApi } from '@/api/approvalCenterApi';

const mock = new MockAdapter(api);

describe('approvalCenterApi', () => {
  afterEach(() => {
    mock.reset();
  });

  it('should fetch approvals catalog', async () => {
    const mockData = {
      success: true,
      data: {
        items: [{ id: 1, type: 'company_cost', title: 'Test Approval' }],
        stats: { pending_total: 1 }
      }
    };
    mock.onGet('/approval-center').reply(200, mockData);

    const result = await approvalCenterApi.getApprovals();

    expect(result.success).toBe(true);
    expect(result.data.items[0].title).toBe('Test Approval');
  });

  it('should quick approve an item', async () => {
    mock.onPost('/approval-center/quick-approve').reply(200, { success: true, message: 'Approved' });

    const result = await approvalCenterApi.quickApprove('company_cost', 1, 'Notes');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Approved');
  });

  it('should quick reject an item', async () => {
    mock.onPost('/approval-center/quick-reject').reply(200, { success: true, message: 'Rejected' });

    const result = await approvalCenterApi.quickReject('company_cost', 1, 'Reason');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Rejected');
  });
});
