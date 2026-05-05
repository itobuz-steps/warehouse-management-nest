jest.mock('./entities/notification.entity', () => ({
  Notification: class Notification {},
}));

jest.mock('./entities/subscription.entity', () => ({
  Subscription: class Subscription {},
}));

jest.mock('src/storage/storage.service', () => ({
  StorageService: class MockStorageService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { Subscription } from './entities/subscription.entity';
import { StorageService } from 'src/storage/storage.service';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockNotificationModel = {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockSubscriptionModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockStorageService = {
    getPresignedSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('returns an existing subscription instead of creating a duplicate', async () => {
    const existing = { endpoint: 'https://push' };
    mockSubscriptionModel.findOne.mockResolvedValue(existing);

    await expect(
      service.subscribe('user-1', { endpoint: 'https://push' } as any),
    ).resolves.toBe(existing);
  });

  it('creates a new subscription when needed', async () => {
    mockSubscriptionModel.findOne.mockResolvedValue(null);
    mockSubscriptionModel.create.mockResolvedValue({
      endpoint: 'https://push',
    });

    await expect(
      service.subscribe('user-1', { endpoint: 'https://push' } as any),
    ).resolves.toEqual({ endpoint: 'https://push' });
  });

  it('hydrates notification image urls and unseen counts', async () => {
    mockNotificationModel.aggregate.mockResolvedValue([
      { performedByImageKey: 'profile-key' },
    ]);
    mockNotificationModel.countDocuments.mockResolvedValue(2);
    mockStorageService.getPresignedSignedUrl.mockResolvedValue(
      'https://signed/profile-key',
    );

    const result = await service.getNotifications('507f1f77bcf86cd799439011', {
      unread: true,
      offset: 0,
      limit: 10,
    } as any);

    expect(result).toEqual({
      notifications: [{ performedByImage: 'https://signed/profile-key' }],
      unseenCount: 2,
    });
  });

  it('rejects invalid notification ids when marking one as seen', async () => {
    await expect(service.markOneAsSeen('invalid-id', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when a notification cannot be found for the user', async () => {
    mockNotificationModel.findOneAndUpdate.mockResolvedValue(null);

    await expect(
      service.markOneAsSeen(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
