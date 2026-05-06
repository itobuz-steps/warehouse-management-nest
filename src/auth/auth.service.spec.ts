jest.mock('src/auth/entities/auth.entity', () => ({
  User: class User {},
}));

jest.mock('src/auth/entities/otp.entity', () => ({
  OTP: class OTP {},
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../config/config.service', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    FRONTEND_URL: 'localhost:3000',
    TOKEN_SECRET: 'secret',
  })),
}));

jest.mock(
  '../utils/TokenGenerator.js',
  () => ({
    TokenGenerator: class MockTokenGenerator {},
  }),
  { virtual: true },
);

jest.mock(
  '../utils/OtpGenerator.js',
  () => ({
    __esModule: true,
    default: class MockOtpGenerator {},
  }),
  { virtual: true },
);

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { MailService } from 'src/mail/mail.service';
import { User } from './entities/auth.entity';
import { OTP } from './entities/otp.entity';

const { TokenGenerator } = jest.requireMock('../utils/TokenGenerator.js');
const { default: OtpGenerator } = jest.requireMock('../utils/OtpGenerator.js');

describe('AuthService', () => {
  let service: AuthService;
  let consoleLogSpy: jest.SpyInstance;

  const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockOtpModel = {
    findOne: jest.fn(),
  };

  const mockTokenGenerator = {
    invitationToken: jest.fn(),
    generateToken: jest.fn(),
    resetPasswordToken: jest.fn(),
  };

  const mockOtpGenerator = {
    generateOtp: jest.fn(),
  };

  const mockMailService = {
    sendInvitationEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(OTP.name), useValue: mockOtpModel },
        { provide: TokenGenerator, useValue: mockTokenGenerator },
        { provide: OtpGenerator, useValue: mockOtpGenerator },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('signup creates a manager invite for a new user', async () => {
    mockUserModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockUserModel.create.mockResolvedValue({ _id: 'user-1' });
    mockTokenGenerator.invitationToken.mockReturnValue('invite-token');
    mockMailService.sendInvitationEmail.mockResolvedValue(undefined);

    const result = await service.signup({
      name: 'New User',
      email: 'new@example.com',
    } as any);

    expect(mockUserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        role: 'manager',
      }),
    );
    expect(mockMailService.sendInvitationEmail).toHaveBeenCalledWith(
      'new@example.com',
      expect.stringContaining('invite-token'),
    );
    expect(result).toEqual({
      message: 'Invitation link sent successfully',
      success: true,
    });
  });

  it('signup rejects already verified users', async () => {
    mockUserModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ isVerified: true }),
    });

    await expect(
      service.signup({
        email: 'existing@example.com',
        name: 'Existing',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('login returns generated access and refresh tokens', async () => {
    mockUserModel.findOneAndUpdate.mockResolvedValue({
      _id: { toString: () => 'user-1' },
      password: 'hashed-password',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockTokenGenerator.generateToken.mockReturnValue({
      access: 'access-token',
      refresh: 'refresh-token',
    });

    const result = await service.login({
      email: 'user@example.com',
      password: 'password',
    } as any);

    expect(result).toEqual({
      message: 'Login Successful',
      success: true,
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
  });

  it('login rejects invalid credentials', async () => {
    mockUserModel.findOneAndUpdate.mockResolvedValue(null);

    await expect(
      service.login({ email: 'user@example.com', password: 'bad' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('verifyOtp returns a reset token for the latest otp', async () => {
    mockOtpModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ otp: ['1111', '2222'] }),
    });
    mockTokenGenerator.resetPasswordToken.mockReturnValue('reset-token');

    const result = await service.verifyOtp({
      email: 'user@example.com',
      otp: '2222',
    } as any);

    expect(result).toEqual({
      message: 'OTP verified successfully',
      success: true,
      data: { resetToken: 'reset-token' },
    });
  });

  it('forgotPassword updates password for an existing user', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    mockUserModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ save }),
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    const result = await service.forgotPassword('user@example.com', {
      password: 'new-password',
    } as any);

    expect(save).toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      message: 'Password reset successful',
    });
  });

  it('forgotPassword rejects missing users', async () => {
    mockUserModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.forgotPassword('missing@example.com', {
        password: 'new-password',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('setPassword rejects invalid signup tokens', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({});

    await expect(
      service.setPassword('bad-token', {
        name: 'User',
        password: 'secret123',
      } as any),
    ).rejects.toThrow(UnauthorizedException);
  });
});
