import { Controller, Get, Patch, Body, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { SettingsService } from './settings.service';
import { Roles } from '../auth/roles.decorator';

@Controller('settings')
@Roles('OWNER')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Patch()
  upsert(
    @Body() data: Record<string, string>,
    @Request() req: ExpressRequest & { user?: any },
  ) {
    const auditMeta = {
      userId: req.user?.sub,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.settingsService.upsert(data, auditMeta);
  }
}
