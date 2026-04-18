import MockAdapter from 'axios-mock-adapter';
import api from '@/api/api';
import { materialBillApi } from '@/api/materialBillApi';

const mock = new MockAdapter(api);

describe('materialBillApi', () => {
  const projectId = '1';

  afterEach(() => {
    mock.reset();
  });

  it('should list material bills', async () => {
    const mockData = { data: [{ id: 1, bill_number: 'BILL-001' }] };
    mock.onGet(`/projects/${projectId}/material-bills`).reply(200, mockData);

    const result = await materialBillApi.getBills(projectId);

    expect(result).toEqual(mockData);
  });

  it('should create a material bill', async () => {
    const billData = {
      bill_number: 'BILL-002',
      supplier_id: 1,
      total_amount: 5000
    };
    mock.onPost(`/projects/${projectId}/material-bills`).reply(201, { id: 2, ...billData });

    const result = await materialBillApi.createBill(projectId, billData);

    expect(result.bill_number).toBe('BILL-002');
  });

  it('should approve material bill by management', async () => {
    mock.onPost(`/projects/${projectId}/material-bills/1/approve-management`).reply(200, { success: true });

    const result = await materialBillApi.approveManagement(projectId, '1');

    expect(result.success).toBe(true);
  });

  it('should reject material bill', async () => {
    mock.onPost(`/projects/${projectId}/material-bills/1/reject`).reply(200, { success: true });

    const result = await materialBillApi.rejectBill(projectId, '1', 'Reason');

    expect(result.success).toBe(true);
  });
});
