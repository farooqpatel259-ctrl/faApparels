import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  PERMISSIONS,
  ROLE_CODES,
  INVENTORY_STATUSES,
} from '@inventory-ops/shared';

const prisma = new PrismaClient();

const ROLE_PERMISSION_MAP: Record<string, readonly string[]> = {
  SUPER_ADMIN: PERMISSIONS,
  INVENTORY_MANAGER: [
    'inventory.view',
    'inventory.create',
    'inventory.edit',
    'inventory.adjust',
    'inventory.approve',
    'articles.view',
    'articles.manage',
    'warehouses.view',
    'warehouses.manage',
    'dashboard.view',
    'reports.export',
    'audit.view',
  ],
  WAREHOUSE_MANAGER: [
    'inventory.view',
    'inventory.create',
    'inventory.edit',
    'inventory.adjust',
    'warehouses.view',
    'warehouses.manage',
    'purchasing.view',
    'purchasing.receive',
    'orders.view',
    'orders.dispatch',
    'dashboard.view',
    'reports.export',
  ],
  WAREHOUSE_WORKER: [
    'inventory.view',
    'warehouses.view',
    'purchasing.receive',
    'orders.view',
    'orders.dispatch',
  ],
  PRODUCTION_MANAGER: [
    'inventory.view',
    'production.view',
    'production.manage',
    'articles.view',
    'dashboard.view',
    'reports.export',
  ],
  SORTING_MANAGER: [
    'inventory.view',
    'sorting.view',
    'sorting.manage',
    'dashboard.view',
  ],
  QC_MANAGER: ['inventory.view', 'qc.view', 'qc.inspect', 'dashboard.view'],
  PURCHASING_MANAGER: [
    'purchasing.view',
    'purchasing.create',
    'purchasing.receive',
    'purchasing.approve',
    'articles.view',
    'inventory.view',
    'dashboard.view',
    'reports.export',
  ],
  SALES_MANAGER: [
    'orders.view',
    'orders.manage',
    'orders.dispatch',
    'inventory.view',
    'articles.view',
    'dashboard.view',
    'reports.export',
  ],
  VIEWER: ['inventory.view', 'articles.view', 'dashboard.view', 'reports.export'],
};

const ROLE_NAMES: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  INVENTORY_MANAGER: 'Inventory Manager',
  WAREHOUSE_MANAGER: 'Warehouse Manager',
  WAREHOUSE_WORKER: 'Warehouse Worker',
  PRODUCTION_MANAGER: 'Production Manager',
  SORTING_MANAGER: 'Sorting Manager',
  QC_MANAGER: 'QC Manager',
  PURCHASING_MANAGER: 'Purchasing Manager',
  SALES_MANAGER: 'Sales Manager',
  VIEWER: 'Viewer',
};

function permissionLabel(code: string): string {
  return code
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function main() {
  console.log('Seeding permissions...');
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: { name: permissionLabel(code) },
        create: { code, name: permissionLabel(code) },
      }),
    ),
  );
  const permissionByCode = Object.fromEntries(
    permissionRecords.map((p) => [p.code, p]),
  );

  console.log('Seeding roles...');
  for (const roleCode of ROLE_CODES) {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      update: { name: ROLE_NAMES[roleCode] ?? roleCode },
      create: { code: roleCode, name: ROLE_NAMES[roleCode] ?? roleCode },
    });

    const codes = ROLE_PERMISSION_MAP[roleCode] ?? [];
    for (const permCode of codes) {
      const permission = permissionByCode[permCode];
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Seeding admin user...');
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventory.local' },
    update: {
      passwordHash,
      fullName: 'System Administrator',
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: 'admin@inventory.local',
      passwordHash,
      fullName: 'System Administrator',
      isActive: true,
    },
  });

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { code: 'SUPER_ADMIN' },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: admin.id, roleId: superAdminRole.id },
    },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });

  console.log('Seeding units...');
  const units = [
    { code: 'PCS', name: 'Pieces' },
    { code: 'KG', name: 'Kilograms' },
    { code: 'M', name: 'Meters' },
  ];
  const unitRecords: Record<string, { id: string }> = {};
  for (const unit of units) {
    const record = await prisma.unit.upsert({
      where: { code: unit.code },
      update: { name: unit.name },
      create: unit,
    });
    unitRecords[unit.code] = record;
  }

  console.log('Seeding inventory statuses...');
  for (const status of INVENTORY_STATUSES) {
    await prisma.systemSetting.upsert({
      where: { key: `inventory.status.${status}` },
      update: { value: status },
      create: {
        key: `inventory.status.${status}`,
        value: status,
      },
    });
  }
  await prisma.systemSetting.upsert({
    where: { key: 'inventory.available_statuses' },
    update: { value: JSON.stringify(['AVAILABLE']) },
    create: {
      key: 'inventory.available_statuses',
      value: JSON.stringify(['AVAILABLE']),
    },
  });

  console.log('Seeding warehouse and locations...');
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-A' },
    update: { name: 'Warehouse A' },
    create: { code: 'WH-A', name: 'Warehouse A', address: 'Main Street 1' },
  });

  const zone = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'Z1' } },
    update: { name: 'Zone 1', level: 'ZONE' },
    create: {
      warehouseId: warehouse.id,
      code: 'Z1',
      name: 'Zone 1',
      level: 'ZONE',
    },
  });

  const rack = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'R1' } },
    update: { name: 'Rack 1', level: 'RACK', parentId: zone.id },
    create: {
      warehouseId: warehouse.id,
      parentId: zone.id,
      code: 'R1',
      name: 'Rack 1',
      level: 'RACK',
    },
  });

  const shelf = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'S1' } },
    update: { name: 'Shelf 1', level: 'SHELF', parentId: rack.id },
    create: {
      warehouseId: warehouse.id,
      parentId: rack.id,
      code: 'S1',
      name: 'Shelf 1',
      level: 'SHELF',
    },
  });

  await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: 'B1' } },
    update: { name: 'Bin 1', level: 'BIN', parentId: shelf.id },
    create: {
      warehouseId: warehouse.id,
      parentId: shelf.id,
      code: 'B1',
      name: 'Bin 1',
      level: 'BIN',
    },
  });

  console.log('Seeding categories...');
  const clothing = await prisma.category.upsert({
    where: { code: 'CLOTHING' },
    update: { name: 'Clothing' },
    create: { code: 'CLOTHING', name: 'Clothing' },
  });

  await prisma.category.upsert({
    where: { code: 'T-SHIRTS' },
    update: { name: 'T-Shirts', parentId: clothing.id },
    create: {
      code: 'T-SHIRTS',
      name: 'T-Shirts',
      parentId: clothing.id,
    },
  });

  const tShirts = await prisma.category.findUniqueOrThrow({
    where: { code: 'T-SHIRTS' },
  });

  console.log('Seeding sample article...');
  await prisma.article.upsert({
    where: { sku: 'ABC-001' },
    update: {
      name: 'Basic Cotton T-Shirt',
      description: 'Sample article for development',
      categoryId: tShirts.id,
      unitId: unitRecords.PCS.id,
      brand: 'SampleBrand',
      minStock: 10,
      reorderLevel: 20,
      reorderQty: 50,
      costPrice: 5.0,
      sellingPrice: 12.99,
      isActive: true,
    },
    create: {
      sku: 'ABC-001',
      name: 'Basic Cotton T-Shirt',
      description: 'Sample article for development',
      categoryId: tShirts.id,
      unitId: unitRecords.PCS.id,
      brand: 'SampleBrand',
      minStock: 10,
      reorderLevel: 20,
      reorderQty: 50,
      costPrice: 5.0,
      sellingPrice: 12.99,
      isActive: true,
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
