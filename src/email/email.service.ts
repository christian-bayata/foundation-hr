import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailDispatcherDto } from './dto/send-mail.dto';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async emailDispatcher(mailDispatcher: MailDispatcherDto) {
    try {
      const port = parseInt(this.configService.get('SMTP_PORT') || '587');
      const mailOptions = {
        to: mailDispatcher.to,
        from: mailDispatcher.from || {
          name: this.configService.get('EMAIL_FROM_NAME'),
          address: this.configService.get('EMAIL_FROM'),
        },
        subject: mailDispatcher.subject ?? 'Testing Email',
        text: mailDispatcher.text,
        html: mailDispatcher.html,
        attachments: mailDispatcher.attachments,
      };

      const transporter = nodemailer.createTransport({
        host: this.configService.get('SMTP_SERVER'),
        port: parseInt(this.configService.get('SMTP_PORT') || '465'),
        secure: false, // true for 465, false for other ports.
        auth: {
          user: this.configService.get('EMAIL_USER'),
          pass: this.configService.get('EMAIL_PASSWORD'),
        },
      });

      transporter
        .sendMail(mailOptions)
        .then((response: any) => {
          this.logger.log('Email sent successfully');
        })
        .catch((error: any) => {
          this.logger.error('Error sending email:', error);
        });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: dedicated service for sending emails via Brevo
   *
   * @param  {mailDispatcher}
   * @returns {Promise<any>}
   */

  async brevoEmailDispatcher(mailDispatcher: MailDispatcherDto) {
    try {
      const mail_options = {
        to: mailDispatcher.to,
        subject: mailDispatcher.subject ?? 'Testing Email',
        text: mailDispatcher.text,
        html: mailDispatcher.html,
        attachments: mailDispatcher.attachments,
      };

      const url = this.configService.get<string>('BREVO_API_URL') ?? '';
      const apiKey = this.configService.get<string>('BREVO_API_KEY');
      const email_data = {
        sender: {
          name: this.configService.get<string>('EMAIL_FROM_NAME'),
          email: this.configService.get<string>('EMAIL_FROM_EMAIL'),
        },
        to: [
          {
            email: mail_options?.to,
          },
        ],
        subject: mail_options?.subject,
        htmlContent: mail_options?.html,
      };

      await lastValueFrom(
        this.httpService.post(url, email_data, {
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
        }),
      )
        .then((response: any) => {
          this.logger.log('Email sent successfully');
        })
        .catch((error: any) => {
          this.logger.error('Error sending email:', error);
        });
    } catch (error) {
      throw error;
    }
  }
}
