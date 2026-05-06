jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./transaction-logs.service', () => ({
  TransactionLogsService: class MockTransactionLogsService {},
}));

import { TransactionLogsController } from './transaction-logs.controller';

describe('TransactionLogsController', () => {
  const mockService = {
    getLogs: jest.fn(),
    exportLogsCsv: jest.fn(),
    findAll: jest.fn(),
    getEntityTimeline: jest.fn(),
    getAllAnalytics: jest.fn(),
  };

  let controller: TransactionLogsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TransactionLogsController(mockService as any);
  });

  it('passes filter body and authenticated user to getLogs', () => {
    const body = { page: 1 } as any;
    const user = { _id: 'user-1' };

    controller.getLogs(body, { user } as any);

    expect(mockService.getLogs).toHaveBeenCalledWith(body, user);
  });

  it('exports audit logs csv through the response', async () => {
    const res = { set: jest.fn(), send: jest.fn() };
    mockService.exportLogsCsv.mockResolvedValue('csv-data');

    await controller.exportLogsCsv(
      { page: 1 } as any,
      { user: { _id: 'user-1' } } as any,
      res as any,
    );

    expect(res.set).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('csv-data');
  });

  it('delegates analytics', () => {
    controller.getAnalytics();
    expect(mockService.getAllAnalytics).toHaveBeenCalled();
  });
});
