jest.mock('src/auth/entities/auth.entity', () => ({ User: class User {} }));
jest.mock('src/products/entities/product.entity', () => ({
  Product: class Product {},
}));
jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/variant/schemas/variant.schema', () => ({
  Variant: class Variant {},
}));
jest.mock('src/variant-stock/schemas/variant-stock.schema', () => ({
  VariantStock: class VariantStock {},
}));
jest.mock('../config/config.service', () => ({
  __esModule: true,
  default: jest.fn(() => ({ FRONTEND_URL: 'frontend.example.com' })),
}));

import { MailService } from './mail.service';
import { TemplateService } from './template.service';
import { Logger } from '@nestjs/common';
import { Types } from 'mongoose';

describe('MailService', () => {
  let consoleLogSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let compileSpy: jest.SpyInstance;
  const mailSender = { sendMail: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue('Warehouse App') };
  const pdfService = { generateTransactionPdf: jest.fn() };

  let service: MailService;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    compileSpy = jest
      .spyOn(TemplateService, 'compile')
      .mockReturnValue('<html />');
    service = new MailService(
      mailSender as any,
      configService as any,
      pdfService as any,
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    loggerLogSpy.mockRestore();
  });

  it('sends invitation emails with compiled html', async () => {
    mailSender.sendMail.mockResolvedValue(undefined);

    await service.sendInvitationEmail('user@example.com', 'http://invite');

    expect(compileSpy).toHaveBeenCalledWith(
      'invitation',
      expect.objectContaining({ link: 'http://invite' }),
    );
    expect(mailSender.sendMail).toHaveBeenCalledWith(
      'user@example.com',
      'You have been invited',
      '<html />',
    );
  });

  it('sends otp email', async () => {
    mailSender.sendMail.mockResolvedValue(undefined);

    await service.sendOtpEmail('user@example.com', '123456');

    expect(compileSpy).toHaveBeenCalledWith(
      'otp',
      expect.objectContaining({
        otp: '123456',
      }),
    );

    expect(mailSender.sendMail).toHaveBeenCalledWith(
      'user@example.com',
      'Your OTP Confirmation Code',
      '<html />',
    );
  });

  it('skips low stock emails when email preference is disabled', async () => {
    await expect(
      service.sendLowStockEmail(
        'user@example.com',
        { preferences: { email: false } } as any,
        { name: 'Product' } as any,
        'product-1',
        { _id: 'warehouse-1', name: 'Warehouse' } as any,
        { _id: 'variant-1', sku: 'SKU-1' } as any,
        { quantity: 1 } as any,
      ),
    ).resolves.toBeUndefined();

    expect(mailSender.sendMail).not.toHaveBeenCalled();
  });

  it('sends pending shipment emails when email preference is enabled', async () => {
    mailSender.sendMail.mockResolvedValue(undefined);

    await service.sendPendingShipmentEmail(
      'user@example.com',
      {
        name: 'Sohan',
        preferences: { email: true },
      } as any,
      {
        name: 'Macbook Pro',
      } as any,
      {
        _id: 'warehouse-1',
        name: 'Main Warehouse',
      } as any,
      new Types.ObjectId('507f1f77bcf86cd799439011'),
    );

    expect(compileSpy).toHaveBeenCalledWith(
      'pending-shipment',
      expect.objectContaining({
        appName: 'Warehouse App',
        userName: 'Sohan',
        productName: 'Macbook Pro',
        warehouseName: 'Main Warehouse',
        link: expect.stringContaining('/reports?transactionId='),
      }),
    );

    expect(mailSender.sendMail).toHaveBeenCalledWith(
      'user@example.com',
      'Pending Shipment Alert: Macbook Pro',
      '<html />',
    );
  });

  it('sends delivered email with invoice attachment', async () => {
    const pdf = Buffer.from('pdf');

    pdfService.generateTransactionPdf.mockResolvedValue(pdf);
    mailSender.sendMail.mockResolvedValue(undefined);

    await service.sendOrderDeliveredEmail({
      _id: 'tx-1',
      shipment: 'DELIVERED',
      customer: {
        email: 'customer@example.com',
        name: 'Customer',
      },
    } as any);

    expect(pdfService.generateTransactionPdf).toHaveBeenCalled();

    expect(mailSender.sendMail).toHaveBeenCalledWith(
      'customer@example.com',
      'Your Order Has Been Delivered',
      '<html />',
      expect.arrayContaining([
        expect.objectContaining({
          filename: 'invoice.pdf',
          content: pdf,
        }),
      ]),
    );
  });
});
