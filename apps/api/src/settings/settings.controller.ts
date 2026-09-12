import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpsertSettingDto } from './dto/settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions('settings.manage')
  findAll() {
    return this.settingsService.findAll();
  }

  @Put()
  @Permissions('settings.manage')
  upsert(@Body() dto: UpsertSettingDto) {
    return this.settingsService.upsert(dto);
  }

  @Put('bulk')
  @Permissions('settings.manage')
  upsertMany(@Body() body: { settings: UpsertSettingDto[] }) {
    return this.settingsService.upsertMany(body.settings ?? []);
  }
}
