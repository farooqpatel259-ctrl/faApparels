import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSettingDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async upsert(dto: UpsertSettingDto) {
    return this.prisma.systemSetting.upsert({
      where: { key: dto.key },
      update: { value: dto.value },
      create: { key: dto.key, value: dto.value },
    });
  }

  async upsertMany(items: UpsertSettingDto[]) {
    const results = [];
    for (const item of items) {
      results.push(await this.upsert(item));
    }
    return results;
  }
}
