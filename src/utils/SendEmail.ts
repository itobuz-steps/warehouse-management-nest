import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer/index.js';
import config from '../config/config.service';
import { WarehouseDocument } from 'src/warehouse/schemas/warehouse.schema';
import { Product } from 'src/products/entities/product.entity';
import { User } from 'src/auth/entities/auth.entity';
import { Injectable } from '@nestjs/common';
import { PopulatedTransaction } from 'src/transaction/types/types';
import { PdfService } from 'src/transaction/services/pdf.service';

type AppConfig = ReturnType<typeof config>;

@Injectable()
export default class SendEmail {
  private appConfig: AppConfig = config();

  mailSender = async (
    email: string,
    title: string,
    body: string,
    attachment: Buffer | null = null,
  ): Promise<nodemailer.SentMessageInfo> => {
    console.log('sending email...');

    const transporter = nodemailer.createTransport({
      service: this.appConfig.MAIL_SERVICE,
      auth: {
        user: this.appConfig.MAIL_USER,
        pass: this.appConfig.MAIL_PASS,
      },
    });

    const mailFields: Mail.Options = {
      from: this.appConfig.MAIL_USER,
      to: email,
      subject: title,
      html: body,
    };

    if (attachment) {
      mailFields.attachments = [
        {
          filename: 'invoice.pdf',
          content: attachment,
          contentType: 'application/pdf',
        },
      ];
    }

    const info = await transporter.sendMail(mailFields);

    return info;
  };

  sendInvitationEmail = async (
    email: string,
    link: string,
  ): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mailResponse = await this.mailSender(
      email,
      'Invitation Link',
      `<h1>Please click on the link to signup and set password</h1>
       <p>Here is your link: ${link}</p>
       <p>Link will be valid only for 5 minutes.</p>`,
    );

    console.log('Email sent successfully: ', mailResponse);
    return 'OK';
  };

  sendOtpViaMail = async (email: string, otp: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mailResponse = await this.mailSender(
      email,
      'OTP Confirmation',
      `<div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #4a90e2;">Please Confirm Your OTP</h2>
          <p>Your one-time password (OTP) is:</p>
          <p style="font-size: 18px; font-weight: bold; color: #000;">${otp}</p>
          <p>This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
        </div>`,
    );

    console.log('Email sent successfully: ', mailResponse);
    return 'Success';
  };

  sendLowStockEmail = async (
    email: string,
    user: User,
    product: Product,
    warehouse: WarehouseDocument,
  ): Promise<void> => {
    await this.mailSender(
      email,
      'Low Stock Alert',
      `
      <h2>Low Stock Alert</h2>
      <p>Hello ${user.name || ''},</p>
      <p>The product <b>${product.name}</b> in <b>${warehouse.name}</b> is below the stock limit.</p>
      <p>Please restock it as soon as possible.</p>
      `,
    );

    console.log('Low stock email sent');
  };

  sendPendingShipmentEmail = async (
    email: string,
    user: User,
    product: Product,
    warehouse: WarehouseDocument,
  ): Promise<void> => {
    await this.mailSender(
      email,
      'Pending Shipment Alert',
      `
      <h2>Pending Shipment Alert</h2>
      <p>Hello ${user.name || ''},</p>
      <p>A shipment for <b>${product.name}</b> in <b>${warehouse.name}</b> is still pending.</p>
      `,
    );

    console.log('Pending shipment email sent');
  };

  sendProductShippedEmailToCustomer = async (
    transaction: PopulatedTransaction,
  ): Promise<void> => {
    const invoice = (await new PdfService().generateTransactionPdf(
      transaction,
    )) as Buffer;

    await this.mailSender(
      transaction.customerEmail as string,
      'Product Shipment Details',
      `
      <h2>Shipment Delivered</h2>
      <p>Hello ${transaction.customerName || ''},</p>
      <p>Your shipment for Order ID <b>${transaction._id.toString()}</b> has been delivered.</p>
      <p>Status: <b>${transaction.shipment}</b></p>
      <p>Please find your invoice attached.</p>
      <br>
      <p>Thank you for your business!</p>
      `,
      invoice,
    );

    console.log('Shipment delivered email sent');
  };

  sendProductCancelEmailToCustomer = async (
    transaction: PopulatedTransaction,
  ): Promise<void> => {
    const invoice = (await new PdfService().generateTransactionPdf(
      transaction,
    )) as Buffer;

    await this.mailSender(
      transaction.customerEmail as string,
      'Shipment Cancelled',
      `
      <h2>Shipment Cancelled</h2>
      <p>Hello ${transaction.customerName || ''},</p>
      <p>Your shipment for Order ID <b>${transaction._id.toString()}</b> has been cancelled.</p>
      <p>Status: <b>${transaction.shipment}</b></p>
      <p>For more information contact: ${transaction.performedBy.email}</p>
      `,
      invoice,
    );

    console.log('Shipment cancellation email sent');
  };
}
