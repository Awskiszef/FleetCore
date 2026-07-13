import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

export const SECRET_SETTING_KEYS = new Set([
  'infaktApiKey',
  'vincarioApiKey',
  'vincarioApiSecret',
  'resendApiKey',
  'twilioAccountSid',
  'twilioAuthToken',
  'awsCognitoClientSecret',
]);

const ENV_FALLBACK_MAP: Record<string, string> = {
  infaktApiKey: 'INFAKT_API_KEY',
  vincarioApiKey: 'VIN_API_KEY',
  vincarioApiSecret: 'VIN_API_SECRET',
  resendApiKey: 'RESEND_API_KEY',
  twilioAccountSid: 'TWILIO_ACCOUNT_SID',
  twilioAuthToken: 'TWILIO_AUTH_TOKEN',
  awsCognitoClientSecret: 'AWS_COGNITO_CLIENT_SECRET',
  awsCognitoDomain: 'AWS_COGNITO_DOMAIN',
  awsCognitoClientId: 'AWS_COGNITO_CLIENT_ID',
  awsCognitoRedirectUri: 'AWS_COGNITO_REDIRECT_URI',
  twilioPhoneNumber: 'TWILIO_PHONE_NUMBER',
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly oldAlgorithm = 'aes-256-cbc';
  private readonly newAlgorithm = 'aes-256-gcm';
  private readonly oldKey: Buffer;
  private readonly newKey: Buffer;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const jwtSecret = this.config.get<string>('JWT_SECRET') || 'default_secret';
    this.oldKey = crypto.scryptSync(jwtSecret, 'salt', 32);

    const encryptionKey = this.config.get<string>('SETTINGS_ENCRYPTION_KEY');
    if (!encryptionKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SETTINGS_ENCRYPTION_KEY is required in production');
      }
      this.logger.warn(
        'SETTINGS_ENCRYPTION_KEY missing. Using fallback key for development.',
      );
      this.newKey = crypto.scryptSync('dev_encryption_key', 'salt', 32);
    } else {
      // Use sha256 to derive a 32-byte key from the provided string (or just scrypt again, but sha256 is fine)
      this.newKey = crypto.createHash('sha256').update(encryptionKey).digest();
    }
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.newAlgorithm, this.newKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decrypt(text: string): string {
    if (!text) return text;

    const parts = text.split(':');

    if (parts[0] === 'v1' && parts.length === 4) {
      try {
        const iv = Buffer.from(parts[1], 'hex');
        const authTag = Buffer.from(parts[2], 'hex');
        const encryptedText = Buffer.from(parts[3], 'hex');

        const decipher = crypto.createDecipheriv(
          this.newAlgorithm,
          this.newKey,
          iv,
        );
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
      } catch (e) {
        this.logger.error(
          'Failed to decrypt GCM secret (integrity compromised or wrong key)',
        );
        throw new Error('Secret integrity compromised');
      }
    } else if (parts.length === 2) {
      try {
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = Buffer.from(parts[1], 'hex');
        const decipher = crypto.createDecipheriv(
          this.oldAlgorithm,
          this.oldKey,
          iv,
        );
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
      } catch {
        return text;
      }
    }

    return text;
  }

  isSecretKey(key: string): boolean {
    return SECRET_SETTING_KEYS.has(key);
  }

  async getValue(key: string): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });

    if (setting) {
      if (this.isSecretKey(key)) {
        throw new Error(`Key ${key} is a secret. Use getSecret() instead.`);
      }
      return setting.value;
    }

    const envKey = ENV_FALLBACK_MAP[key];
    if (envKey && process.env[envKey]) {
      return process.env[envKey] || null;
    }

    return null;
  }

  async getSecret(key: string): Promise<string | null> {
    if (!this.isSecretKey(key)) {
      throw new Error(`Key ${key} is not marked as secret.`);
    }

    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (setting && setting.value) {
      return this.decrypt(setting.value);
    }

    const envKey = ENV_FALLBACK_MAP[key];
    if (envKey && process.env[envKey]) {
      return process.env[envKey] || null;
    }

    return null;
  }

  async getPublicSettings(): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const setting of settings) {
      if (!this.isSecretKey(setting.key)) {
        result[setting.key] = setting.value;
      }
    }
    return result;
  }

  async getAll(maskSecrets = true): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const setting of settings) {
      if (this.isSecretKey(setting.key)) {
        if (maskSecrets && setting.value) {
          result[setting.key] = '********';
        } else {
          result[setting.key] = this.decrypt(setting.value);
        }
      } else {
        result[setting.key] = setting.value;
      }
    }
    return result;
  }

  async upsert(
    data: Record<string, string>,
    auditMeta?: any,
  ): Promise<Record<string, string>> {
    const oldSettings = await this.getAll(false);

    const transactions = Object.entries(data)
      .map(([key, value]) => {
        if (value === '********') return null;
        if (this.isSecretKey(key) && value === '') return null;

        let finalValue = value;
        if (this.isSecretKey(key)) {
          finalValue = this.encrypt(value);
        }

        return this.prisma.setting.upsert({
          where: { key },
          update: { value: finalValue },
          create: { key, value: finalValue },
        });
      })
      .filter(Boolean);

    if (transactions.length > 0) {
      await this.prisma.$transaction(transactions as any);
    }

    const newSettings = await this.getAll(false);

    if (auditMeta && transactions.length > 0) {
      const mask = (s: Record<string, string>) => {
        const r = { ...s };
        Object.keys(r).forEach((k) => {
          if (this.isSecretKey(k)) r[k] = '***';
        });
        return r;
      };
      await this.prisma.auditLog.create({
        data: {
          userId: auditMeta.userId,
          action: 'UPDATE_SETTINGS',
          entity: 'Setting',
          oldValues: mask(oldSettings) as any,
          newValues: mask(newSettings) as any,
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
        },
      });
    }

    return this.getAll();
  }
}
