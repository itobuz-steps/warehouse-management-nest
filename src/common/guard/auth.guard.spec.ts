jest.mock('src/auth/entities/auth.entity', () => ({
  User: class User {},
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('src/config/config.service', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    ACCESS_SECRET_KEY: 'access-secret',
    REFRESH_SECRET_KEY: 'refresh-secret',
  })),
}));

import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const userModel = {
    findOne: jest.fn(),
  };

  let guard: AuthGuard;

  const createContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AuthGuard(userModel as any);
  });

  it('allows qr routes without token validation', async () => {
    await expect(
      guard.canActivate(
        createContext({ path: '/product/qr/123', headers: {} }),
      ),
    ).resolves.toBe(true);
    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it('throws when no authorization header is provided', async () => {
    await expect(
      guard.canActivate(createContext({ path: '/secure', headers: {} })),
    ).rejects.toThrow(BadRequestException);
  });

  it('attaches user context for valid access tokens', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-1' });
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'user-1',
        isActive: true,
        isDeleted: false,
      }),
    });

    const request = {
      path: '/customer',
      headers: { authorization: 'Bearer token' },
    } as Record<string, unknown>;

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.userId).toBe('user-1');
    expect(request.user).toEqual(
      expect.objectContaining({ _id: 'user-1', isActive: true }),
    );
  });

  it('uses the refresh secret for refresh routes', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-1' });
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'user-1',
        isActive: true,
        isDeleted: false,
      }),
    });

    await guard.canActivate(
      createContext({
        path: '/user/auth/refresh',
        headers: { authorization: 'Bearer refresh-token' },
      }),
    );

    expect(jwt.verify).toHaveBeenCalledWith('refresh-token', 'refresh-secret');
  });

  it('throws when the user does not exist', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 'missing-user' });
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(
      guard.canActivate(
        createContext({
          path: '/secure',
          headers: { authorization: 'Bearer token' },
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws when the user is blocked', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-1' });
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'user-1',
        isActive: false,
        isDeleted: false,
      }),
    });

    await expect(
      guard.canActivate(
        createContext({
          path: '/secure',
          headers: { authorization: 'Bearer token' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
