import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { page?: number; pageSize?: number; action?: string }) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 100, 200);
    const skip = (page - 1) * pageSize;
    const where = {
      ...(filters.action && { action: filters.action }),
    };

    return this.prisma
      .$transaction([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
        }),
        this.prisma.auditLog.count({ where }),
      ])
      .then(([data, total]) => ({
        data,
        meta: { page, pageSize, total },
      }));
  }
}
