jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./notification.service', () => ({
  NotificationService: class MockNotificationService {},
}));

import { NotificationController } from './notification.controller';

describe('NotificationController', () => {
  const mockService = {
    subscribe: jest.fn(),
    getNotifications: jest.fn(),
    markAllAsSeen: jest.fn(),
    markOneAsSeen: jest.fn(),
  };

  let controller: NotificationController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NotificationController(mockService as any);
  });

  it('wraps subscription results', () => {
    mockService.subscribe.mockReturnValue({ endpoint: 'https://push' });

    const result = controller.subscribe({
      userId: 'user-1',
      body: { endpoint: 'https://push' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Subscription saved in database.');
    expect(mockService.subscribe).toHaveBeenCalledWith('user-1', {
      endpoint: 'https://push',
    });
  });

  it('delegates notification queries with the user id', async () => {
    mockService.getNotifications.mockResolvedValue({ notifications: [] });

    await expect(
      controller.getNotificationsWithQuery(
        { userId: 'user-1' } as any,
        { unread: true } as any,
      ),
    ).resolves.toEqual({ notifications: [] });
    expect(mockService.getNotifications).toHaveBeenCalledWith('user-1', {
      unread: true,
    });
  });

  it('marks one notification as seen', async () => {
    mockService.markOneAsSeen.mockResolvedValue(undefined);

    await expect(
      controller.markOneSeen({ userId: 'user-1' } as any, 'notification-1'),
    ).resolves.toEqual({
      success: true,
      message: 'Notification marked as seen',
    });
  });
});
