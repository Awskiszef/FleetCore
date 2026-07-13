import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { Twilio } from 'twilio';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private settingsService: SettingsService) {}

  async sendEmail(to: string, subject: string, htmlContent: string) {
    const apiKey = await this.settingsService.getSecret('resendApiKey');

    if (!apiKey) {
      this.logger.warn(
        `Email simulation to ${to} (No API key). Subject: ${subject}`,
      );
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
        this.logger.error(
          `Resend API Error when sending to ${to}: ${error.message}`,
        );
        return;
      }

      this.logger.log(`Email sent successfully to ${to}: ${data?.id}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
    }
  }

  async sendSms(to: string, message: string) {
    const twilioSid = await this.settingsService.getSecret('twilioAccountSid');
    const twilioAuthToken =
      await this.settingsService.getSecret('twilioAuthToken');
    const twilioPhone =
      await this.settingsService.getValue('twilioPhoneNumber');

    if (!twilioSid || !twilioAuthToken) {
      this.logger.warn(
        `SMS simulation to ${to} (No API key). Message: ${message}`,
      );
      return;
    }

    try {
      const twilioClient = new Twilio(twilioSid, twilioAuthToken);
      const response = await twilioClient.messages.create({
        body: message,
        from: twilioPhone || undefined,
        to: to,
      });
      this.logger.log(`SMS sent successfully to ${to}: ${response.sid}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}`, error);
    }
  }
}
