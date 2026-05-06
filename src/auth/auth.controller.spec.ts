jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {
    canActivate() {
      return true;
    }
  },
}));

jest.mock('src/common/guard/resetPassword.guard', () => ({
  ResetPasswordGuard: class MockResetPasswordGuard {
    canActivate() {
      return true;
    }
  },
}));

jest.mock('./auth.service', () => ({
  AuthService: class MockAuthService {},
}));

import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    signup: jest.fn(),
    setPassword: jest.fn(),
    login: jest.fn(),
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    forgotPassword: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(mockAuthService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates signup', async () => {
    const dto = { email: 'user@example.com', name: 'User' } as any;
    mockAuthService.signup.mockResolvedValue({ success: true });

    await expect(controller.signup(dto)).resolves.toEqual({ success: true });
    expect(mockAuthService.signup).toHaveBeenCalledWith(dto);
  });

  it('delegates setPassword', async () => {
    const dto = { name: 'User', password: 'secret123' } as any;
    mockAuthService.setPassword.mockResolvedValue({ success: true });

    await expect(controller.setPassword('signup-token', dto)).resolves.toEqual({
      success: true,
    });
    expect(mockAuthService.setPassword).toHaveBeenCalledWith(
      'signup-token',
      dto,
    );
  });

  it('delegates forgotPassword with reset guard context email', async () => {
    const dto = { password: 'new-secret' } as any;
    mockAuthService.forgotPassword.mockResolvedValue({ success: true });

    await expect(
      controller.forgotPassword({ userEmail: 'user@example.com' } as any, dto),
    ).resolves.toEqual({ success: true });
    expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
      'user@example.com',
      dto,
    );
  });

  it('delegates refresh with authenticated user id', () => {
    mockAuthService.refresh.mockReturnValue({ success: true });

    const result = controller.refresh({ user: { _id: 'user-1' } } as any);

    expect(result).toEqual({ success: true });
    expect(mockAuthService.refresh).toHaveBeenCalledWith('user-1');
  });
});
