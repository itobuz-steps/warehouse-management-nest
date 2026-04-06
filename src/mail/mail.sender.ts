import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Attachment } from 'nodemailer/lib/mailer';

@Injectable()
export class MailSender {
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private readonly logger = new Logger(MailSender.name);

  constructor(private readonly configService: ConfigService) {
    this.transporter =
      nodemailer.createTransport<SMTPTransport.SentMessageInfo>({
        service: this.configService.get<string>('MAIL_SERVICE'),
        auth: {
          user: this.configService.get<string>('MAIL_USER'),
          pass: this.configService.get<string>('MAIL_PASS'),
        },
      } as SMTPTransport.Options);
  }

  async sendMail(
    to: string,
    subject: string,
    html: string,
    attachments?: Attachment[],
  ): Promise<SMTPTransport.SentMessageInfo> {
    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_USER'),
        to,
        subject,
        html,
        ...(attachments?.length && { attachments }),
      });

      this.logger.log(`Mail sent to ${to}`);
      return info;
    } catch (error) {
      this.logger.error(`Mail sending failed to ${to}`, error);
      throw error;
    }
  }
}
