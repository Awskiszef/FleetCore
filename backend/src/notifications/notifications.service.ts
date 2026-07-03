import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async sendEmail(to: string, subject: string, htmlContent: string) {
    const apiKeySetting = await this.prisma.setting.findUnique({ where: { key: 'resendApiKey' } });
    const apiKey = apiKeySetting?.value || process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.warn(`Email simulation to ${to} (No API key). Subject: ${subject}`);
      return;
    }

    const resend = new Resend(apiKey);

    try {
      const { data, error } = await resend.emails.send({
        from: 'Warsztat AtlasHC <powiadomienia@warsztat.atlashc.pl>',
        to: [to],
        subject: subject,
        html: htmlContent,
      });

      if (error) {
        this.logger.error(`Resend API Error when sending to ${to}: ${error.message}`);
        return;
      }

      this.logger.log(`Email sent successfully to ${to}: ${data?.id}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
    }
  }

  async sendSms(to: string, message: string) {
    const sidSetting = await this.prisma.setting.findUnique({ where: { key: 'twilioAccountSid' } });
    const tokenSetting = await this.prisma.setting.findUnique({ where: { key: 'twilioAuthToken' } });
    const phoneSetting = await this.prisma.setting.findUnique({ where: { key: 'twilioPhoneNumber' } });

    const twilioSid = sidSetting?.value || process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = tokenSetting?.value || process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = phoneSetting?.value || process.env.TWILIO_PHONE_NUMBER || '+1234567890';

    if (!twilioSid || !twilioAuthToken) {
      this.logger.warn(`SMS simulation to ${to} (No API key). Message: ${message}`);
      return;
    }

    try {
      const twilioClient = new Twilio(twilioSid, twilioAuthToken);
      const response = await twilioClient.messages.create({
        body: message,
        from: twilioPhone,
        to: to,
      });
      this.logger.log(`SMS sent successfully to ${to}: ${response.sid}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}`, error);
    }
  }
}
