import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SettingsService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const secret = this.config.get<string>('JWT_SECRET') || 'default_secret';
    this.key = crypto.scryptSync(secret, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(text: string): string {
    if (!text || !text.includes(':')) return text;
    try {
      const textParts = text.split(':');
      const iv = Buffer.from(textParts.shift()!, 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return text;
    }
  }

  private isSecretKey(key: string): boolean {
    const k = key.toLowerCase();
    return k.includes('secret') || k.includes('password') || k.includes('key');
  }

  async getAll(maskSecrets = true): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const setting of settings) {
      let val = setting.value;
      if (this.isSecretKey(setting.key)) {
        val = this.decrypt(val);
      }

      if (maskSecrets && this.isSecretKey(setting.key) && val) {
        result[setting.key] = '********';
      } else {
        result[setting.key] = val;
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

    await this.prisma.$transaction(transactions as any);

    const newSettings = await this.getAll(false);

    if (auditMeta) {
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
