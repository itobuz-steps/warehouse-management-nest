jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./admin.service', () => ({
  AdminService: class MockAdminService {},
}));

import { AdminController } from './admin.controller';

describe('AdminController', () => {
  const mockAdminService = {
    getManagers: jest.fn(),
    getAllManagers: jest.fn(),
    getManagerTransactionStats: jest.fn(),
    getManagerAddedTrend: jest.fn(),
  };

  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminController(mockAdminService as any);
  });

  it('delegates manager lookups', () => {
    controller.getManagers('warehouse-1');
    expect(mockAdminService.getManagers).toHaveBeenCalledWith('warehouse-1');
  });

  it('defaults analytics trend period to 7 days', () => {
    controller.getManagerTrend(undefined, 'warehouse-1');
    expect(mockAdminService.getManagerAddedTrend).toHaveBeenCalledWith(
      7,
      'warehouse-1',
    );
  });

  it('uses 30 day trend when requested', () => {
    controller.getManagerTrend('30', 'warehouse-1');
    expect(mockAdminService.getManagerAddedTrend).toHaveBeenCalledWith(
      30,
      'warehouse-1',
    );
  });
});
