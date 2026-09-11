import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.article.findMany({
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { sku: { contains: search } },
            { name: { contains: search } },
            { barcode: { contains: search } },
          ],
        }),
      },
      include: {
        category: { select: { id: true, code: true, name: true } },
        unit: { select: { id: true, code: true, name: true } },
        variants: { where: { deletedAt: null } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        unit: true,
        variants: { where: { deletedAt: null } },
      },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  create(dto: CreateArticleDto) {
    return this.prisma.article.create({
      data: {
        sku: dto.sku,
        barcode: dto.barcode,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        unitId: dto.unitId,
        brand: dto.brand,
        model: dto.model,
        size: dto.size,
        color: dto.color,
        material: dto.material,
        minStock: dto.minStock ?? 0,
        maxStock: dto.maxStock,
        reorderLevel: dto.reorderLevel ?? 0,
        reorderQty: dto.reorderQty ?? 0,
        costPrice: dto.costPrice ?? 0,
        sellingPrice: dto.sellingPrice ?? 0,
        taxRate: dto.taxRate ?? 0,
        weight: dto.weight,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: true,
        unit: true,
      },
    });
  }

  async update(id: string, dto: UpdateArticleDto) {
    await this.findOne(id);
    return this.prisma.article.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        unit: true,
        variants: { where: { deletedAt: null } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.article.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
