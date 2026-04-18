import MockAdapter from 'axios-mock-adapter';
import api from '@/api/api';
import { constructionLogApi } from '@/api/constructionLogApi';

const mock = new MockAdapter(api);

describe('constructionLogApi', () => {
  const projectId = '1';

  afterEach(() => {
    mock.reset();
  });

  it('should list construction logs', async () => {
    const mockData = { data: [{ id: 1, notes: 'Daily log' }] };
    mock.onGet(`/projects/${projectId}/logs`).reply(200, mockData);

    const result = await constructionLogApi.getLogs(projectId);

    expect(result).toEqual(mockData);
  });

  it('should create a construction log', async () => {
    const logData = {
      log_date: '2024-04-18',
      completion_percentage: 50,
      notes: 'Progressing'
    };
    mock.onPost(`/projects/${projectId}/logs`).reply(201, { id: 2, ...logData });

    const result = await constructionLogApi.createLog(projectId, logData);

    expect(result.notes).toBe('Progressing');
  });

  it('should approve a construction log', async () => {
    mock.onPost(`/projects/${projectId}/logs/1/approve`).reply(200, { success: true });

    const result = await constructionLogApi.approveLog(projectId, 1, { status: 'approved' });

    expect(result.success).toBe(true);
  });
});
