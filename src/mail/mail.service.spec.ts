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
});
