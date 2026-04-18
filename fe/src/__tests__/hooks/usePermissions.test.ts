import { renderHook } from '@testing-library/react-native';
import { usePermissions } from '@/hooks/usePermissions';
import { useSelector, useDispatch } from 'react-redux';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

describe('usePermissions hook', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return permissions and hasPermission function', () => {
    (useSelector as jest.Mock).mockReturnValue({
      permissions: ['view_projects', 'create_cost'],
      loading: false,
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.permissions).toEqual(['view_projects', 'create_cost']);
    expect(result.current.hasPermission('view_projects')).toBe(true);
    expect(result.current.hasPermission('admin_access')).toBe(false);
  });

  it('should return true for any permission if super_admin (*) exists', () => {
    (useSelector as jest.Mock).mockReturnValue({
      permissions: ['*'],
      loading: false,
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasPermission('anything')).toBe(true);
  });

  it('hasAnyPermission should work correctly', () => {
    (useSelector as jest.Mock).mockReturnValue({
      permissions: ['p1', 'p2'],
      loading: false,
    });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasAnyPermission(['p1', 'p3'])).toBe(true);
    expect(result.current.hasAnyPermission(['p4', 'p5'])).toBe(false);
  });
});
