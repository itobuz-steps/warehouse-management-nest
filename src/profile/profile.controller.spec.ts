jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('src/auth/entities/auth.entity', () => ({
  User: class User {},
}));

jest.mock('./profile.service', () => ({
  ProfileService: class MockProfileService {},
}));

import { ProfileController } from './profile.controller';

describe('ProfileController', () => {
  const mockService = {
    updateProfile: jest.fn(),
    getCurrentUser: jest.fn(),
    getUserDetails: jest.fn(),
    deleteUser: jest.fn(),
    changeStatus: jest.fn(),
    setUserNotificationPreference: jest.fn(),
    getUsers: jest.fn(),
  };

  let controller: ProfileController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProfileController(mockService as any);
  });

  it('wraps current user lookups', async () => {
    mockService.getCurrentUser.mockResolvedValue({ id: 'user-1' });

    await expect(
      controller.getCurrentUser({ user: { _id: 'user-1' } } as any),
    ).resolves.toEqual({
      success: true,
      user: { id: 'user-1' },
    });
  });

  it('passes managerId to changeStatus', async () => {
    mockService.changeStatus.mockResolvedValue({ message: 'changed' });

    await expect(
      controller.changeStatus(
        { managerId: 'manager-1' } as any,
        { user: { _id: 'user-1' } } as any,
      ),
    ).resolves.toEqual({
      success: true,
      message: 'changed',
    });
  });

  it('wraps preference updates', async () => {
    mockService.setUserNotificationPreference.mockResolvedValue({
      push: false,
    });

    await expect(
      controller.updateNotificationPreferece(
        { push: false } as any,
        { user: { _id: 'user-1' } } as any,
      ),
    ).resolves.toEqual({
      success: true,
      message: 'updated successfully',
      data: { push: false },
    });
  });
});
