jest.mock(
  '../auth/entities/otp.entity.js',
  () => ({
    OTP: class OTP {},
  }),
  { virtual: true },
);

import OtpGenerator from './OtpGenerator';

describe('OtpGenerator', () => {
  const configService = {
    get: jest.fn(),
  };
  const sendEmail = {
    sendOtpEmail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new otp document when one does not exist', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const otpModel = function (
      this: any,
      payload: { email: string; otp: string[] },
    ) {
      this.email = payload.email;
      this.otp = payload.otp;
      this.save = save;
      return this;
    } as any;
    otpModel.findOne = jest.fn().mockResolvedValue(null);
    sendEmail.sendOtpEmail.mockResolvedValue('sent');

    const generator = new OtpGenerator(
      configService as any,
      otpModel,
      sendEmail as any,
    );

    await expect(generator.generateOtp('user@example.com')).resolves.toBe(
      'sent',
    );
    expect(otpModel.findOne).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
    expect(save).toHaveBeenCalled();
    expect(sendEmail.sendOtpEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it('appends otp values to an existing document', async () => {
    const existingDoc = {
      otp: ['111111'],
      save: jest.fn().mockResolvedValue(undefined),
    };
    const otpModel = {
      findOne: jest.fn().mockResolvedValue(existingDoc),
    };
    sendEmail.sendOtpEmail.mockResolvedValue('sent');

    const generator = new OtpGenerator(
      configService as any,
      otpModel as any,
      sendEmail as any,
    );

    await generator.generateOtp('user@example.com');

    expect(existingDoc.otp).toHaveLength(2);
    expect(existingDoc.save).toHaveBeenCalled();
  });
});
