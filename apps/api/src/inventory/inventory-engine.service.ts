import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface BalanceKey {
  articleId: string;
  variantId?: string | null;
  warehouseId: string;
  locationId?: string | null;
  status: string;
}

export interface ReceiveParams extends BalanceKey {
  quantity: Prisma.Decimal | number | string;
  performedBy: string;
  type?: string;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
}

export interface AdjustParams extends BalanceKey {
  quantityDelta: Prisma.Decimal | number | string;
  performedBy: string;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
}

export interface ReserveParams {
  articleId: string;
  variantId?: string | null;
  warehouseId: string;
  locationId?: string | null;
  quantity: Prisma.Decimal | number | string;
  performedBy: string;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
}

@Injectable()
export class InventoryEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async receive(params: ReceiveParams) {
    const quantity = this.toDecimal(params.quantity);
    if (quantity.lte(0)) {
      throw new BadRequestException('Receive quantity must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const { balanceAfter } = await this.applyBalanceChange(tx, {
        ...params,
        quantityDelta: quantity,
      });

      const txRow = await tx.inventoryTransaction.create({
        data: {
          type: params.type ?? 'PURCHASE_RECEIPT',
          articleId: params.articleId,
          variantId: params.variantId ?? null,
          warehouseId: params.warehouseId,
          locationId: params.locationId ?? null,
          fromStatus: null,
          toStatus: params.status,
          quantity,
          balanceAfter,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          performedBy: params.performedBy,
          reason: params.reason,
          notes: params.notes,
        },
      });

      await this.writeAuditLog(tx, {
        userId: params.performedBy,
        action: 'INVENTORY_RECEIVE',
        entityType: 'InventoryTransaction',
        entityId: txRow.id,
        afterJson: txRow,
        reason: params.reason,
      });

      return { transaction: txRow, balanceAfter };
    });
  }

  async adjust(params: AdjustParams) {
    const quantityDelta = this.toDecimal(params.quantityDelta);
    if (quantityDelta.isZero()) {
      throw new BadRequestException('Adjustment delta cannot be zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const { balanceAfter } = await this.applyBalanceChange(tx, {
        articleId: params.articleId,
        variantId: params.variantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        status: params.status,
        quantityDelta,
      });

      const txRow = await tx.inventoryTransaction.create({
        data: {
          type: 'ADJUSTMENT',
          articleId: params.articleId,
          variantId: params.variantId ?? null,
          warehouseId: params.warehouseId,
          locationId: params.locationId ?? null,
          fromStatus: quantityDelta.isNegative() ? params.status : null,
          toStatus: quantityDelta.isPositive() ? params.status : null,
          quantity: quantityDelta.abs(),
          balanceAfter,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          performedBy: params.performedBy,
          reason: params.reason,
          notes: params.notes,
        },
      });

      await this.writeAuditLog(tx, {
        userId: params.performedBy,
        action: 'INVENTORY_ADJUST',
        entityType: 'InventoryTransaction',
        entityId: txRow.id,
        afterJson: txRow,
        reason: params.reason,
      });

      return { transaction: txRow, balanceAfter };
    });
  }

  async reserve(params: ReserveParams) {
    const quantity = this.toDecimal(params.quantity);
    if (quantity.lte(0)) {
      throw new BadRequestException('Reserve quantity must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const fromResult = await this.applyBalanceChange(tx, {
        articleId: params.articleId,
        variantId: params.variantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        status: 'AVAILABLE',
        quantityDelta: quantity.negated(),
      });

      const toResult = await this.applyBalanceChange(tx, {
        articleId: params.articleId,
        variantId: params.variantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        status: 'RESERVED',
        quantityDelta: quantity,
      });

      const txRow = await tx.inventoryTransaction.create({
        data: {
          type: 'RESERVE',
          articleId: params.articleId,
          variantId: params.variantId ?? null,
          warehouseId: params.warehouseId,
          locationId: params.locationId ?? null,
          fromStatus: 'AVAILABLE',
          toStatus: 'RESERVED',
          quantity,
          balanceAfter: toResult.balanceAfter,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          performedBy: params.performedBy,
          reason: params.reason,
          notes: params.notes,
        },
      });

      await this.writeAuditLog(tx, {
        userId: params.performedBy,
        action: 'INVENTORY_RESERVE',
        entityType: 'InventoryTransaction',
        entityId: txRow.id,
        afterJson: {
          transaction: txRow,
          availableAfter: fromResult.balanceAfter,
          reservedAfter: toResult.balanceAfter,
        },
        reason: params.reason,
      });

      return {
        transaction: txRow,
        availableAfter: fromResult.balanceAfter,
        reservedAfter: toResult.balanceAfter,
      };
    });
  }

  async releaseReserve(params: ReserveParams) {
    const quantity = this.toDecimal(params.quantity);
    if (quantity.lte(0)) {
      throw new BadRequestException('Release quantity must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const fromResult = await this.applyBalanceChange(tx, {
        articleId: params.articleId,
        variantId: params.variantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        status: 'RESERVED',
        quantityDelta: quantity.negated(),
      });

      const toResult = await this.applyBalanceChange(tx, {
        articleId: params.articleId,
        variantId: params.variantId,
        warehouseId: params.warehouseId,
        locationId: params.locationId,
        status: 'AVAILABLE',
        quantityDelta: quantity,
      });

      const txRow = await tx.inventoryTransaction.create({
        data: {
          type: 'RELEASE_RESERVE',
          articleId: params.articleId,
          variantId: params.variantId ?? null,
          warehouseId: params.warehouseId,
          locationId: params.locationId ?? null,
          fromStatus: 'RESERVED',
          toStatus: 'AVAILABLE',
          quantity,
          balanceAfter: toResult.balanceAfter,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          performedBy: params.performedBy,
          reason: params.reason,
          notes: params.notes,
        },
      });

      await this.writeAuditLog(tx, {
        userId: params.performedBy,
        action: 'INVENTORY_RELEASE_RESERVE',
        entityType: 'InventoryTransaction',
        entityId: txRow.id,
        afterJson: {
          transaction: txRow,
          reservedAfter: fromResult.balanceAfter,
          availableAfter: toResult.balanceAfter,
        },
        reason: params.reason,
      });

      return {
        transaction: txRow,
        reservedAfter: fromResult.balanceAfter,
        availableAfter: toResult.balanceAfter,
      };
    });
  }

  private async applyBalanceChange(
    tx: Prisma.TransactionClient,
    params: BalanceKey & { quantityDelta: Prisma.Decimal },
  ): Promise<{ balanceAfter: Prisma.Decimal }> {
    const variantId = params.variantId ?? null;
    const locationId = params.locationId ?? null;

    let balance = await tx.inventoryBalance.findFirst({
      where: {
        articleId: params.articleId,
        variantId,
        warehouseId: params.warehouseId,
        locationId,
        status: params.status,
      },
    });

    if (!balance) {
      if (params.quantityDelta.isNegative()) {
        throw new BadRequestException(
          `Insufficient ${params.status} stock for article ${params.articleId}`,
        );
      }

      balance = await tx.inventoryBalance.create({
        data: {
          articleId: params.articleId,
          variantId,
          warehouseId: params.warehouseId,
          locationId,
          status: params.status,
          quantity: params.quantityDelta,
          version: 0,
        },
      });

      return { balanceAfter: balance.quantity };
    }

    const newQuantity = balance.quantity.add(params.quantityDelta);
    if (newQuantity.isNegative()) {
      throw new BadRequestException(
        `Insufficient ${params.status} stock (have ${balance.quantity}, need ${params.quantityDelta.abs()})`,
      );
    }

    const updated = await tx.inventoryBalance.updateMany({
      where: { id: balance.id, version: balance.version },
      data: {
        quantity: newQuantity,
        version: balance.version + 1,
      },
    });

    if (updated.count === 0) {
      throw new ConflictException(
        'Concurrent inventory modification detected; please retry',
      );
    }

    return { balanceAfter: newQuantity };
  }

  private async writeAuditLog(
    tx: Prisma.TransactionClient,
    data: {
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      beforeJson?: unknown;
      afterJson?: unknown;
      reason?: string;
    },
  ) {
    await tx.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        beforeJson: data.beforeJson
          ? (data.beforeJson as Prisma.InputJsonValue)
          : undefined,
        afterJson: data.afterJson
          ? (data.afterJson as Prisma.InputJsonValue)
          : undefined,
        reason: data.reason,
      },
    });
  }

  private toDecimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
    return new Prisma.Decimal(value);
  }
}
