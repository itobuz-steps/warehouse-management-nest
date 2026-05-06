jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

import * as jwt from 'jsonwebtoken';
import { TokenGenerator } from './TokenGenerator';

describe('TokenGenerator', () => {
  const configService = {
    get: jest.fn(),
  };

  let generator: TokenGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new TokenGenerator(configService as any);
  });

  it('creates an invitation token with configured expiry', () => {
    configService.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'TOKEN_SECRET') return 'token-secret';
      if (key === 'TOKEN_EXPIRE') return '15m';
      return fallback;
    });
    (jwt.sign as jest.Mock).mockReturnValue('invite-token');

    expect(generator.invitationToken('user@example.com')).toBe('invite-token');
    expect(jwt.sign).toHaveBeenCalledWith(
      { email: 'user@example.com' },
      'token-secret',
      { expiresIn: '15m' },
    );
  });

  it('creates a reset password token with purpose metadata', () => {
    configService.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'TOKEN_SECRET') return 'token-secret';
      if (key === 'TOKEN_EXPIRE') return '15m';
      return fallback;
    });
    (jwt.sign as jest.Mock).mockReturnValue('reset-token');

    expect(generator.resetPasswordToken('user@example.com')).toBe(
      'reset-token',
    );
    expect(jwt.sign).toHaveBeenCalledWith(
      { email: 'user@example.com', purpose: 'password-reset' },
      'token-secret',
      { expiresIn: '15m' },
    );
  });

  it('throws when jwt config is incomplete for access/refresh tokens', () => {
    configService.get.mockReturnValue(undefined);

    expect(() => generator.generateToken('user-1')).toThrow(
      'JWT secrets are not properly configured',
    );
  });

  it('creates access and refresh tokens', () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        ACCESS_SECRET_KEY: 'access-secret',
        REFRESH_SECRET_KEY: 'refresh-secret',
        ACCESS_TOKEN_EXPIRY: '15m',
        REFRESH_TOKEN_EXPIRY: '7d',
      };
      return values[key];
    });
    (jwt.sign as jest.Mock)
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    expect(generator.generateToken('user-1')).toEqual({
      access: 'access-token',
      refresh: 'refresh-token',
    });
  });
});
