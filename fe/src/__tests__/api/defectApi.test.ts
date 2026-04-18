import MockAdapter from 'axios-mock-adapter';
import api from '@/api/api';
import { defectApi } from '@/api/defectApi';

const mock = new MockAdapter(api);

describe('defectApi', () => {
  const projectId = '1';

  afterEach(() => {
    mock.reset();
  });

  it('should list defects', async () => {
    const mockData = { data: [{ id: 1, description: 'Leaking pipe' }] };
    mock.onGet(`/projects/${projectId}/defects`).reply(200, mockData);

    const result = await defectApi.getDefects(projectId);

    expect(result).toEqual(mockData);
  });

  it('should create a defect', async () => {
    const defectData = {
      description: 'Wall crack',
      severity: 'high' as const
    };
    mock.onPost(`/projects/${projectId}/defects`).reply(201, { id: 2, ...defectData });

    const result = await defectApi.createDefect(projectId, defectData);

    expect(result.description).toBe('Wall crack');
  });

  it('should update defect status', async () => {
    mock.onPut(`/projects/${projectId}/defects/1`).reply(200, { success: true });

    const result = await defectApi.updateDefect(projectId, '1', { status: 'in_progress' });

    expect(result.success).toBe(true);
  });
});
