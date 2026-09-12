import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listRoles() {
    return this.prisma.role.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        rolePermissions: {
          include: {
            permission: { select: { code: true, name: true } },
          },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('A user with this email already exists');
    }

    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, deletedAt: null },
    });
    if (!role) throw new BadRequestException('Role not found');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    if (existing?.deletedAt) {
      const restored = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          email: dto.email.toLowerCase(),
          fullName: dto.fullName,
          passwordHash,
          isActive: true,
          deletedAt: null,
          userRoles: {
            deleteMany: {},
            create: { roleId: role.id },
          },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          userRoles: {
            include: {
              role: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });
      return restored;
    }

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        isActive: true,
        userRoles: {
          create: { roleId: role.id },
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          include: {
            role: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { userRoles: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({
        where: { id: dto.roleId, deletedAt: null },
      });
      if (!role) throw new BadRequestException('Role not found');
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (dto.roleId) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.create({
          data: { userId: id, roleId: dto.roleId },
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          fullName: dto.fullName,
          isActive: dto.isActive,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: {
              role: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });
    });
  }
}
