import MockAdapter from 'axios-mock-adapter';
import api from '@/api/api';
import { companyCostApi } from '@/api/companyCostApi';

const mock = new MockAdapter(api);

describe('companyCostApi', () => {
  afterEach(() => {
    mock.reset();
  });

  it('should list company costs', async () => {
    const mockData = { data: [{ id: 1, name: 'Cost 1' }] };
    mock.onGet('/company-costs').reply(200, mockData);

    const result = await companyCostApi.getCompanyCosts();

    expect(result).toEqual(mockData);
  });

  it('should create a company cost', async () => {
    const costData = {
      name: 'New Cost',
      amount: 1000,
      cost_group_id: 1,
      cost_date: '2024-04-18'
    };
    mock.onPost('/company-costs').reply(201, { id: 2, ...costData });

    const result = await companyCostApi.createCompanyCost(costData);

    expect(result.name).toBe('New Cost');
    expect(result.id).toBe(2);
  });

  it('should approve a company cost by management', async () => {
    mock.onPost('/company-costs/1/approve-management').reply(200, { success: true });

    const result = await companyCostApi.approveByManagement(1);

    expect(result.success).toBe(true);
  });

  it('should reject a company cost', async () => {
    mock.onPost('/company-costs/1/reject').reply(200, { success: true });

    const result = await companyCostApi.rejectCompanyCost(1, 'Reason');

    expect(result.success).toBe(true);
  });
});
