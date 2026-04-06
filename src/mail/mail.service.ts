import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailSender } from './mail.sender';
import { TemplateService } from './template.service';
import { User } from 'src/auth/entities/auth.entity';
import { Product } from 'src/products/entities/product.entity';
import { WarehouseDocument } from 'src/warehouse/schemas/warehouse.schema';
import { PopulatedTransactionForPdfGeneration } from 'src/transaction/types/types';
import { PdfService } from 'src/transaction/services/pdf.service';
import { VariantDocument } from 'src/variant/schemas/variant.schema';
import { VariantStockDocument } from 'src/variant-stock/schemas/variant-stock.schema';
import config from '../config/config.service';
import { Types } from 'mongoose';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly appName: string;

  constructor(
    private readonly mailSender: MailSender,
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
  ) {
    this.appName =
      this.configService.get<string>('APP_NAME') ?? ' Warehouse App';
  }

  async sendInvitationEmail(email: string, link: string): Promise<void> {
    try {
      const html = TemplateService.compile('invitation', {
        appName: this.appName,
        link,
      });

      await this.mailSender.sendMail(email, 'You have been invited', html);
      this.logger.log(`Invitation email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${email}`, error);
      throw error;
    }
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    try {
      const html = TemplateService.compile('otp', {
        appName: this.appName,
        otp,
      });

      await this.mailSender.sendMail(email, 'Your OTP Confirmation Code', html);
      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      throw error;
    }
  }

  async sendLowStockEmail(
    email: string,
    user: User,
    product: Product,
    relatedProduct: string | Types.ObjectId,
    warehouse: WarehouseDocument,
    variant: VariantDocument,
    variantStock: VariantStockDocument,
  ): Promise<void> {
    if (!user.preferences.email) return;

    try {
      const link = `http://${config().FRONTEND_URL}/products?warehouseId=${warehouse._id.toString()}&productId=${relatedProduct.toString()}&variantId=${variant._id.toString()}`;

      const html = TemplateService.compile('low-stock', {
        appName: this.appName,
        userName: user.name,
        productName: product.name,
        warehouseName: warehouse.name,
        variantName: variant.sku ?? 'N/A',
        currentStock: variantStock.quantity,
        link,
      });

      await this.mailSender.sendMail(
        email,
        `Low Stock Alert: ${product.name}`,
        html,
      );
      this.logger.log(`Low stock email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send low stock email to ${email}`, error);
      throw error;
    }
  }

  async sendPendingShipmentEmail(
    email: string,
    user: User,
    product: Product,
    warehouse: WarehouseDocument,
    transactionId: Types.ObjectId,
  ): Promise<void> {
    if (!user.preferences.email) return;

    try {
      const link = `http://${config().FRONTEND_URL}/reports?transactionId=${transactionId.toString()}`;

      const html = TemplateService.compile('pending-shipment', {
        appName: this.appName,
        userName: user.name ?? '',
        productName: product.name,
        warehouseName: warehouse.name,
        link,
      });

      await this.mailSender.sendMail(
        email,
        `Pending Shipment Alert: ${product.name}`,
        html,
      );
      this.logger.log(`Pending shipment email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send pending shipment email to ${email}`,
        error,
      );
      throw error;
    }
  }

  async sendOrderDeliveredEmail(
    transaction: PopulatedTransactionForPdfGeneration,
  ): Promise<void> {
    try {
      const invoice = (await this.pdfService.generateTransactionPdf(
        transaction,
      )) as Buffer;

      const html = TemplateService.compile('order-delivered', {
        appName: this.appName,
        customerName: transaction.customer.name ?? '',
        orderId: transaction._id.toString(),
        shipmentStatus: transaction.shipment,
      });

      await this.mailSender.sendMail(
        transaction.customer.email,
        'Your Order Has Been Delivered',
        html,
        [
          {
            filename: 'invoice.pdf',
            content: invoice,
            contentType: 'application/pdf',
          },
        ],
      );
      this.logger.log(
        `Order delivered email sent to ${transaction.customer.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send order delivered email to ${transaction.customer.email}`,
        error,
      );
      throw error;
    }
  }

  async sendOrderCancelledEmail(
    transaction: PopulatedTransactionForPdfGeneration,
  ): Promise<void> {
    try {
      const invoice = (await this.pdfService.generateTransactionPdf(
        transaction,
      )) as Buffer;

      const html = TemplateService.compile('order-cancelled', {
        appName: this.appName,
        customerName: transaction.customer.name ?? '',
        orderId: transaction._id.toString(),
        shipmentStatus: transaction.shipment,
        performedByEmail: transaction.performedBy.email,
      });

      await this.mailSender.sendMail(
        transaction.customer.email,
        'Your Shipment Has Been Cancelled',
        html,
        [
          {
            filename: 'invoice.pdf',
            content: invoice,
            contentType: 'application/pdf',
          },
        ],
      );
      this.logger.log(
        `Order cancelled email sent to ${transaction.customer.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send order cancelled email to ${transaction.customer.email}`,
        error,
      );
      throw error;
    }
  }
}
