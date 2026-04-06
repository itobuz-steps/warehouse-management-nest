import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailSender } from './mail.sender';
import { PdfService } from 'src/transaction/services/pdf.service';

@Module({
  providers: [MailService, MailSender, PdfService],
  exports: [MailService],
})
export class MailModule {}
