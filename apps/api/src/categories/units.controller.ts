import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('units')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UnitsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('articles.view')
  findAll() {
    return this.prisma.unit.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });
  }
}
