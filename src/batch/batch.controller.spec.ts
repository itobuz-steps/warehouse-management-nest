jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./batch.service', () => ({
  BatchService: class MockBatchService {},
}));

import { BatchController } from './batch.controller';

describe('BatchController', () => {
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    markDamaged: jest.fn(),
    getDamageStats: jest.fn(),
  };

  let controller: BatchController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BatchController(mockService as any);
  });

  it('delegates create', () => {
    const dto = { code: 'B-1' } as any;
    controller.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('passes authenticated user to findAll', () => {
    const query = { warehouseId: 'warehouse-1' } as any;
    const user = { _id: 'user-1' };
    controller.findAll(query, { user } as any);
    expect(mockService.findAll).toHaveBeenCalledWith(query, user);
  });

  it('passes damage stats warehouse filter', () => {
    controller.getDamageStats({ warehouseId: 'warehouse-1' } as any);
    expect(mockService.getDamageStats).toHaveBeenCalledWith('warehouse-1');
  });
});
