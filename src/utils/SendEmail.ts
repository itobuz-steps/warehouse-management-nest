import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer/index.js';
import config from '../config/config.service';

type AppConfig = ReturnType<typeof config>;

export default class SendEmail {
  private appConfig: AppConfig = config();

  mailSender = async (
    email: string,
    title: string,
    body: string,
    attachment: Buffer | null = null
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
    link: string
  ): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mailResponse = await this.mailSender(
      email,
      'Invitation Link',
      `<h1>Please click on the link to signup and set password</h1>
       <p>Here is your link: ${link}</p>
       <p>Link will be valid only for 5 minutes.</p>`
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
        </div>`
    );

    console.log('Email sent successfully: ', mailResponse);
    return 'Success';
  };
}
