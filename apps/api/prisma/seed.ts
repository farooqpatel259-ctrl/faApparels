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
  const passwordHash = await bcrypt.hash('farooqpatel2006', 10);
  const demoPasswordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'farooqpatel259' },
    update: {
      passwordHash,
      fullName: 'Farooq Patel',
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: 'farooqpatel259',
      passwordHash,
      fullName: 'Farooq Patel',
      isActive: true,
    },
  });

  // Retire legacy admin account
  const legacyAdmin = await prisma.user.findUnique({
    where: { email: 'admin@inventory.local' },
  });
  if (legacyAdmin) {
    await prisma.user.update({
      where: { id: legacyAdmin.id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

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

  console.log('Seeding demo users...');
  const demoUsers = [
    {
      email: 'inventory@inventory.local',
      fullName: 'Ayesha Khan',
      role: 'INVENTORY_MANAGER',
    },
    {
      email: 'warehouse@inventory.local',
      fullName: 'Bilal Ahmed',
      role: 'WAREHOUSE_MANAGER',
    },
    {
      email: 'purchasing@inventory.local',
      fullName: 'Sana Malik',
      role: 'PURCHASING_MANAGER',
    },
    {
      email: 'sales@inventory.local',
      fullName: 'Omar Farooq',
      role: 'SALES_MANAGER',
    },
    {
      email: 'viewer@inventory.local',
      fullName: 'Demo Viewer',
      role: 'VIEWER',
    },
  ];
  for (const demo of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        passwordHash: demoPasswordHash,
        fullName: demo.fullName,
        isActive: true,
        deletedAt: null,
      },
      create: {
        email: demo.email,
        passwordHash: demoPasswordHash,
        fullName: demo.fullName,
        isActive: true,
      },
    });
    const role = await prisma.role.findUniqueOrThrow({
      where: { code: demo.role },
    });
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: user.id, roleId: role.id },
      },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  console.log('Seeding units...');
  const units = [
    { code: 'PCS', name: 'Pieces' },
    { code: 'KG', name: 'Kilograms' },
    { code: 'M', name: 'Meters' },
    { code: 'BOX', name: 'Boxes' },
    { code: 'ROLL', name: 'Rolls' },
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

  const companySettings = [
    { key: 'company.name', value: 'FA APPARELS' },
    { key: 'company.city', value: 'Lahore' },
    { key: 'company.timezone', value: 'Asia/Karachi' },
    { key: 'company.currency', value: 'PKR' },
    {
      key: 'inventory.low_stock_note',
      value: 'Reorder when Available qty is at or below reorder level',
    },
    { key: 'documents.po_prefix', value: 'PO-' },
    { key: 'documents.so_prefix', value: 'SO-' },
    { key: 'documents.prd_prefix', value: 'PRD-' },
    { key: 'documents.srt_prefix', value: 'SRT-' },
  ];
  for (const setting of companySettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('Seeding warehouses and locations...');
  async function seedLocationTree(
    warehouseId: string,
    prefix: string,
    label: string,
  ) {
    const zone = await prisma.location.upsert({
      where: { warehouseId_code: { warehouseId, code: `${prefix}-Z1` } },
      update: { name: `${label} Zone 1`, level: 'ZONE' },
      create: {
        warehouseId,
        code: `${prefix}-Z1`,
        name: `${label} Zone 1`,
        level: 'ZONE',
      },
    });
    const rack = await prisma.location.upsert({
      where: { warehouseId_code: { warehouseId, code: `${prefix}-R1` } },
      update: { name: `${label} Rack 1`, level: 'RACK', parentId: zone.id },
      create: {
        warehouseId,
        parentId: zone.id,
        code: `${prefix}-R1`,
        name: `${label} Rack 1`,
        level: 'RACK',
      },
    });
    const shelf = await prisma.location.upsert({
      where: { warehouseId_code: { warehouseId, code: `${prefix}-S1` } },
      update: { name: `${label} Shelf 1`, level: 'SHELF', parentId: rack.id },
      create: {
        warehouseId,
        parentId: rack.id,
        code: `${prefix}-S1`,
        name: `${label} Shelf 1`,
        level: 'SHELF',
      },
    });
    const bin = await prisma.location.upsert({
      where: { warehouseId_code: { warehouseId, code: `${prefix}-B1` } },
      update: { name: `${label} Bin 1`, level: 'BIN', parentId: shelf.id },
      create: {
        warehouseId,
        parentId: shelf.id,
        code: `${prefix}-B1`,
        name: `${label} Bin 1`,
        level: 'BIN',
      },
    });
    const receiving = await prisma.location.upsert({
      where: { warehouseId_code: { warehouseId, code: `${prefix}-RECV` } },
      update: { name: `${label} Receiving Dock`, level: 'OTHER' },
      create: {
        warehouseId,
        code: `${prefix}-RECV`,
        name: `${label} Receiving Dock`,
        level: 'OTHER',
      },
    });
    return { zone, rack, shelf, bin, receiving };
  }

  const warehouseA = await prisma.warehouse.upsert({
    where: { code: 'WH-A' },
    update: { name: 'Main Warehouse', address: 'Industrial Area, Block A' },
    create: {
      code: 'WH-A',
      name: 'Main Warehouse',
      address: 'Industrial Area, Block A',
    },
  });
  const locA = await seedLocationTree(warehouseA.id, 'A', 'Main');

  // Keep legacy WH-A codes used by older seeds
  const zoneLegacy = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouseA.id, code: 'Z1' } },
    update: { name: 'Zone 1', level: 'ZONE' },
    create: {
      warehouseId: warehouseA.id,
      code: 'Z1',
      name: 'Zone 1',
      level: 'ZONE',
    },
  });
  const rackLegacy = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouseA.id, code: 'R1' } },
    update: { name: 'Rack 1', level: 'RACK', parentId: zoneLegacy.id },
    create: {
      warehouseId: warehouseA.id,
      parentId: zoneLegacy.id,
      code: 'R1',
      name: 'Rack 1',
      level: 'RACK',
    },
  });
  const shelfLegacy = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouseA.id, code: 'S1' } },
    update: { name: 'Shelf 1', level: 'SHELF', parentId: rackLegacy.id },
    create: {
      warehouseId: warehouseA.id,
      parentId: rackLegacy.id,
      code: 'S1',
      name: 'Shelf 1',
      level: 'SHELF',
    },
  });
  const binLegacy = await prisma.location.upsert({
    where: { warehouseId_code: { warehouseId: warehouseA.id, code: 'B1' } },
    update: { name: 'Bin 1', level: 'BIN', parentId: shelfLegacy.id },
    create: {
      warehouseId: warehouseA.id,
      parentId: shelfLegacy.id,
      code: 'B1',
      name: 'Bin 1',
      level: 'BIN',
    },
  });

  const warehouseB = await prisma.warehouse.upsert({
    where: { code: 'WH-B' },
    update: {
      name: 'Secondary Warehouse',
      address: 'Logistics Park, Bay 12',
    },
    create: {
      code: 'WH-B',
      name: 'Secondary Warehouse',
      address: 'Logistics Park, Bay 12',
    },
  });
  const locB = await seedLocationTree(warehouseB.id, 'B', 'Secondary');

  console.log('Seeding categories...');
  const clothing = await prisma.category.upsert({
    where: { code: 'CLOTHING' },
    update: { name: 'Clothing' },
    create: { code: 'CLOTHING', name: 'Clothing' },
  });
  const rawMaterial = await prisma.category.upsert({
    where: { code: 'RAW' },
    update: { name: 'Raw Materials' },
    create: { code: 'RAW', name: 'Raw Materials' },
  });
  const accessories = await prisma.category.upsert({
    where: { code: 'ACCESSORIES' },
    update: { name: 'Accessories' },
    create: { code: 'ACCESSORIES', name: 'Accessories' },
  });
  const packaging = await prisma.category.upsert({
    where: { code: 'PACKAGING' },
    update: { name: 'Packaging & Trims' },
    create: { code: 'PACKAGING', name: 'Packaging & Trims' },
  });

  const tShirts = await prisma.category.upsert({
    where: { code: 'T-SHIRTS' },
    update: { name: 'T-Shirts', parentId: clothing.id },
    create: {
      code: 'T-SHIRTS',
      name: 'T-Shirts',
      parentId: clothing.id,
    },
  });
  const jeans = await prisma.category.upsert({
    where: { code: 'JEANS' },
    update: { name: 'Jeans', parentId: clothing.id },
    create: {
      code: 'JEANS',
      name: 'Jeans',
      parentId: clothing.id,
    },
  });
  const hoodies = await prisma.category.upsert({
    where: { code: 'HOODIES' },
    update: { name: 'Hoodies', parentId: clothing.id },
    create: { code: 'HOODIES', name: 'Hoodies', parentId: clothing.id },
  });
  const crewnecks = await prisma.category.upsert({
    where: { code: 'CREWNECKS' },
    update: { name: 'Crewnecks', parentId: clothing.id },
    create: { code: 'CREWNECKS', name: 'Crewnecks', parentId: clothing.id },
  });
  const shorts = await prisma.category.upsert({
    where: { code: 'SHORTS' },
    update: { name: 'Shorts', parentId: clothing.id },
    create: { code: 'SHORTS', name: 'Shorts', parentId: clothing.id },
  });
  const pants = await prisma.category.upsert({
    where: { code: 'PANTS' },
    update: { name: 'Pants', parentId: clothing.id },
    create: { code: 'PANTS', name: 'Pants', parentId: clothing.id },
  });
  const fabric = await prisma.category.upsert({
    where: { code: 'FABRIC' },
    update: { name: 'Fabric', parentId: rawMaterial.id },
    create: {
      code: 'FABRIC',
      name: 'Fabric',
      parentId: rawMaterial.id,
    },
  });

  console.log('Seeding articles...');
  const articleDefs = [
    {
      sku: 'ABC-001',
      name: 'Basic Cotton T-Shirt',
      description: 'Everyday crew-neck tee',
      categoryId: tShirts.id,
      unitId: unitRecords.PCS.id,
      brand: 'HinaWear',
      size: 'M',
      color: 'White',
      material: 'Cotton',
      minStock: 10,
      reorderLevel: 20,
      reorderQty: 50,
      costPrice: 5.0,
      sellingPrice: 12.99,
      barcode: '8901000000001',
    },
    {
      sku: 'ABC-002',
      name: 'Premium Polo Shirt',
      description: 'Piqué polo with contrast collar',
      categoryId: tShirts.id,
      unitId: unitRecords.PCS.id,
      brand: 'HinaWear',
      size: 'L',
      color: 'Navy',
      material: 'Cotton Blend',
      minStock: 8,
      reorderLevel: 15,
      reorderQty: 40,
      costPrice: 9.5,
      sellingPrice: 24.99,
      barcode: '8901000000002',
    },
    {
      sku: 'JN-101',
      name: 'Slim Fit Denim Jeans',
      description: 'Stretch denim, mid-rise',
      categoryId: jeans.id,
      unitId: unitRecords.PCS.id,
      brand: 'DenimCo',
      size: '32',
      color: 'Indigo',
      material: 'Denim',
      minStock: 5,
      reorderLevel: 12,
      reorderQty: 30,
      costPrice: 18.0,
      sellingPrice: 49.99,
      barcode: '8901000000003',
    },
    {
      sku: 'FAB-COTTON',
      name: 'Cotton Jersey Fabric',
      description: '180 GSM single jersey',
      categoryId: fabric.id,
      unitId: unitRecords.KG.id,
      brand: 'TextileMills',
      color: 'Natural',
      material: 'Cotton',
      minStock: 50,
      reorderLevel: 100,
      reorderQty: 250,
      costPrice: 3.2,
      sellingPrice: 0,
      barcode: '8901000000004',
    },
    {
      sku: 'FAB-DENIM',
      name: 'Denim Roll Stock',
      description: '12 oz denim roll',
      categoryId: fabric.id,
      unitId: unitRecords.ROLL.id,
      brand: 'TextileMills',
      color: 'Blue',
      material: 'Denim',
      minStock: 10,
      reorderLevel: 20,
      reorderQty: 40,
      costPrice: 45.0,
      sellingPrice: 0,
      barcode: '8901000000005',
    },
    {
      sku: 'ACC-BTN',
      name: 'Metal Shirt Buttons',
      description: '15mm brass buttons, pack of 100',
      categoryId: accessories.id,
      unitId: unitRecords.BOX.id,
      brand: 'FastenPro',
      minStock: 20,
      reorderLevel: 40,
      reorderQty: 100,
      costPrice: 2.5,
      sellingPrice: 6.5,
      barcode: '8901000000006',
    },
    {
      sku: 'ABC-003',
      name: 'Kids Graphic Tee',
      description: 'Low-stock sample for KPI testing',
      categoryId: tShirts.id,
      unitId: unitRecords.PCS.id,
      brand: 'HinaKids',
      size: 'S',
      color: 'Red',
      material: 'Cotton',
      minStock: 25,
      reorderLevel: 40,
      reorderQty: 80,
      costPrice: 4.0,
      sellingPrice: 9.99,
      barcode: '8901000000007',
    },
    {
      sku: 'ACC-ZIP',
      name: 'Nylon Zipper 20cm',
      description: 'Closed-end zipper assortment',
      categoryId: accessories.id,
      unitId: unitRecords.PCS.id,
      brand: 'FastenPro',
      color: 'Black',
      minStock: 100,
      reorderLevel: 200,
      reorderQty: 500,
      costPrice: 0.35,
      sellingPrice: 0.99,
      barcode: '8901000000008',
    },
    // Packaging & trim items
    {
      sku: 'MAT-YARN',
      name: 'Yarn',
      description: 'Sewing / knitting yarn cone',
      categoryId: packaging.id,
      unitId: unitRecords.KG.id,
      brand: 'YarnHouse',
      color: 'Assorted',
      material: 'Polyester',
      minStock: 20,
      reorderLevel: 50,
      reorderQty: 100,
      costPrice: 6.5,
      sellingPrice: 0,
      barcode: '8902000000001',
    },
    {
      sku: 'MAT-DYE',
      name: 'Dyeing',
      description: 'Fabric dyeing / color chemical service unit',
      categoryId: packaging.id,
      unitId: unitRecords.KG.id,
      brand: 'ColorWorks',
      color: 'Process',
      material: 'Chemical',
      minStock: 10,
      reorderLevel: 25,
      reorderQty: 50,
      costPrice: 12.0,
      sellingPrice: 0,
      barcode: '8902000000002',
    },
    {
      sku: 'MAT-LABEL',
      name: 'Label',
      description: 'Care / brand woven label',
      categoryId: packaging.id,
      unitId: unitRecords.PCS.id,
      brand: 'TagLine',
      color: 'White',
      material: 'Satin',
      minStock: 500,
      reorderLevel: 1000,
      reorderQty: 5000,
      costPrice: 0.08,
      sellingPrice: 0,
      barcode: '8902000000003',
    },
    {
      sku: 'MAT-POLYBAG',
      name: 'Poly Bag',
      description: 'Clear garment poly bag',
      categoryId: packaging.id,
      unitId: unitRecords.PCS.id,
      brand: 'PackRight',
      color: 'Clear',
      material: 'LDPE',
      minStock: 1000,
      reorderLevel: 2000,
      reorderQty: 10000,
      costPrice: 0.05,
      sellingPrice: 0,
      barcode: '8902000000004',
    },
    {
      sku: 'MAT-CARTON',
      name: 'Carton',
      description: 'Corrugated shipping carton',
      categoryId: packaging.id,
      unitId: unitRecords.PCS.id,
      brand: 'PackRight',
      color: 'Brown',
      material: 'Corrugated',
      minStock: 50,
      reorderLevel: 100,
      reorderQty: 500,
      costPrice: 1.2,
      sellingPrice: 0,
      barcode: '8902000000005',
    },
    {
      sku: 'MAT-STICKER',
      name: 'Sticker',
      description: 'Price / barcode sticker roll',
      categoryId: packaging.id,
      unitId: unitRecords.ROLL.id,
      brand: 'TagLine',
      color: 'White',
      material: 'Paper',
      minStock: 20,
      reorderLevel: 40,
      reorderQty: 100,
      costPrice: 3.5,
      sellingPrice: 0,
      barcode: '8902000000006',
    },
    {
      sku: 'MAT-CTAPE',
      name: 'Carton Tape',
      description: 'BOPP packing tape for cartons',
      categoryId: packaging.id,
      unitId: unitRecords.ROLL.id,
      brand: 'PackRight',
      color: 'Clear',
      material: 'BOPP',
      minStock: 30,
      reorderLevel: 60,
      reorderQty: 200,
      costPrice: 1.8,
      sellingPrice: 0,
      barcode: '8902000000007',
    },
    {
      sku: 'MAT-PATTI',
      name: 'Patti',
      description: 'Fabric / elastic patti strip',
      categoryId: packaging.id,
      unitId: unitRecords.M.id,
      brand: 'TrimCo',
      color: 'Assorted',
      material: 'Elastic',
      minStock: 100,
      reorderLevel: 200,
      reorderQty: 500,
      costPrice: 0.25,
      sellingPrice: 0,
      barcode: '8902000000008',
    },
    {
      sku: 'MAT-THREAD',
      name: 'Thread',
      description: 'Industrial sewing thread spool',
      categoryId: packaging.id,
      unitId: unitRecords.PCS.id,
      brand: 'YarnHouse',
      color: 'Assorted',
      material: 'Polyester',
      minStock: 80,
      reorderLevel: 150,
      reorderQty: 400,
      costPrice: 0.9,
      sellingPrice: 0,
      barcode: '8902000000009',
    },
  ];

  const articles: Record<string, { id: string }> = {};
  for (const def of articleDefs) {
    const record = await prisma.article.upsert({
      where: { sku: def.sku },
      update: { ...def, isActive: true, deletedAt: null },
      create: { ...def, isActive: true },
    });
    articles[def.sku] = record;
  }

  console.log('Seeding apparel color variants (zipper, hoodie, crewneck, tees, shorts, pants)...');
  const colorCode: Record<string, string> = {
    Black: 'BLK',
    White: 'WHT',
    Navy: 'NVY',
    Grey: 'GRY',
    Olive: 'OLV',
    Red: 'RED',
    Beige: 'BGE',
    Khaki: 'KHK',
    Charcoal: 'CHR',
    Forest: 'FOR',
    Sand: 'SND',
    Burgundy: 'BRG',
  };

  const apparelLines: Array<{
    prefix: string;
    name: string;
    description: string;
    categoryId: string;
    material: string;
    costPrice: number;
    sellingPrice: number;
    colors: string[];
    minStock: number;
    reorderLevel: number;
  }> = [
    {
      prefix: 'ZIP',
      name: 'Zipper Hoodie',
      description: 'Full-zip fleece hoodie with metal zipper',
      categoryId: hoodies.id,
      material: 'Cotton Fleece',
      costPrice: 14.5,
      sellingPrice: 39.99,
      colors: ['Black', 'Navy', 'Grey', 'Olive', 'Burgundy'],
      minStock: 8,
      reorderLevel: 16,
    },
    {
      prefix: 'HDY',
      name: 'Pullover Hoodie',
      description: 'Classic kangaroo-pocket pullover hoodie',
      categoryId: hoodies.id,
      material: 'Cotton Fleece',
      costPrice: 12.0,
      sellingPrice: 34.99,
      colors: ['Black', 'White', 'Charcoal', 'Forest', 'Red'],
      minStock: 10,
      reorderLevel: 20,
    },
    {
      prefix: 'CRW',
      name: 'Crewneck Sweatshirt',
      description: 'Soft midweight crewneck',
      categoryId: crewnecks.id,
      material: 'Cotton Blend',
      costPrice: 10.5,
      sellingPrice: 29.99,
      colors: ['Black', 'White', 'Navy', 'Grey', 'Beige'],
      minStock: 10,
      reorderLevel: 18,
    },
    {
      prefix: 'TEE',
      name: 'Essential Tee',
      description: 'Everyday crew-neck t-shirt',
      categoryId: tShirts.id,
      material: 'Cotton',
      costPrice: 4.5,
      sellingPrice: 14.99,
      colors: ['Black', 'White', 'Navy', 'Grey', 'Olive', 'Red'],
      minStock: 20,
      reorderLevel: 40,
    },
    {
      prefix: 'SHT',
      name: 'Everyday Shorts',
      description: 'Relaxed fit chino shorts',
      categoryId: shorts.id,
      material: 'Cotton Twill',
      costPrice: 8.0,
      sellingPrice: 22.99,
      colors: ['Black', 'Navy', 'Khaki', 'Olive', 'Sand'],
      minStock: 12,
      reorderLevel: 24,
    },
    {
      prefix: 'PNT',
      name: 'Tapered Pants',
      description: 'Tapered stretch pants for daily wear',
      categoryId: pants.id,
      material: 'Stretch Twill',
      costPrice: 15.0,
      sellingPrice: 44.99,
      colors: ['Black', 'Navy', 'Charcoal', 'Khaki', 'Olive'],
      minStock: 8,
      reorderLevel: 16,
    },
  ];

  let apparelBarcode = 8901000001000;
  const apparelSkus: string[] = [];
  for (const line of apparelLines) {
    for (const color of line.colors) {
      const code = colorCode[color] ?? color.slice(0, 3).toUpperCase();
      const sku = `${line.prefix}-${code}`;
      apparelBarcode += 1;
      const def = {
        sku,
        name: `${line.name} — ${color}`,
        description: `${line.description} · color ${color}`,
        categoryId: line.categoryId,
        unitId: unitRecords.PCS.id,
        brand: 'FA Apparels',
        color,
        material: line.material,
        size: 'M',
        minStock: line.minStock,
        reorderLevel: line.reorderLevel,
        reorderQty: line.reorderLevel * 2,
        costPrice: line.costPrice,
        sellingPrice: line.sellingPrice,
        barcode: String(apparelBarcode),
        isActive: true,
      };
      const record = await prisma.article.upsert({
        where: { sku },
        update: { ...def, deletedAt: null },
        create: def,
      });
      articles[sku] = record;
      apparelSkus.push(sku);

      // Size variants under each color SKU
      for (const size of ['S', 'M', 'L', 'XL'] as const) {
        const variantSku = `${sku}-${size}`;
        await prisma.articleVariant.upsert({
          where: { sku: variantSku },
          update: { size, color },
          create: {
            articleId: record.id,
            sku: variantSku,
            size,
            color,
            barcode: `${apparelBarcode}${size.charCodeAt(0)}`,
          },
        });
      }
    }
  }

  // Variants for a couple of legacy articles
  await prisma.articleVariant.upsert({
    where: { sku: 'ABC-001-S-WHT' },
    update: { size: 'S', color: 'White' },
    create: {
      articleId: articles['ABC-001'].id,
      sku: 'ABC-001-S-WHT',
      size: 'S',
      color: 'White',
      barcode: '8901000000101',
    },
  });
  await prisma.articleVariant.upsert({
    where: { sku: 'ABC-001-L-BLK' },
    update: { size: 'L', color: 'Black' },
    create: {
      articleId: articles['ABC-001'].id,
      sku: 'ABC-001-L-BLK',
      size: 'L',
      color: 'Black',
      barcode: '8901000000102',
    },
  });

  console.log('Seeding packaging & trim suppliers...');
  await prisma.receivingItem.deleteMany({});
  await prisma.receiving.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  // Keep only the packaging/trim suppliers below
  await prisma.supplier.deleteMany({});

  const suppliers = [
    {
      code: 'SUP-YARN',
      name: 'Yarn Supplier',
      contactName: 'Ali Yarn',
      phone: '+92-300-7001001',
      email: 'orders@yarn-supply.pk',
      address: 'Faisalabad Yarn Market',
    },
    {
      code: 'SUP-DYE',
      name: 'Dyeing Supplier',
      contactName: 'Saba Color',
      phone: '+92-300-7001002',
      email: 'orders@dyeing-supply.pk',
      address: 'Karachi Dyeing Units',
    },
    {
      code: 'SUP-LABEL',
      name: 'Label Supplier',
      contactName: 'Rehan Tags',
      phone: '+92-300-7001003',
      email: 'orders@label-supply.pk',
      address: 'Lahore Label Street',
    },
    {
      code: 'SUP-POLYBAG',
      name: 'Poly Bag Supplier',
      contactName: 'Nida Pack',
      phone: '+92-300-7001004',
      email: 'orders@polybag-supply.pk',
      address: 'Sundar Industrial Estate',
    },
    {
      code: 'SUP-CARTON',
      name: 'Carton Supplier',
      contactName: 'Kamran Box',
      phone: '+92-300-7001005',
      email: 'orders@carton-supply.pk',
      address: 'Port Qasim Packaging Hub',
    },
    {
      code: 'SUP-STICKER',
      name: 'Sticker Supplier',
      contactName: 'Hina Print',
      phone: '+92-300-7001006',
      email: 'orders@sticker-supply.pk',
      address: 'Gulberg Print Lane',
    },
    {
      code: 'SUP-CTAPE',
      name: 'Carton Tape Supplier',
      contactName: 'Tariq Tape',
      phone: '+92-300-7001007',
      email: 'orders@cartontape-supply.pk',
      address: 'Shahdara Industrial Area',
    },
    {
      code: 'SUP-PATTI',
      name: 'Patti Supplier',
      contactName: 'Asma Trim',
      phone: '+92-300-7001008',
      email: 'orders@patti-supply.pk',
      address: 'Sialkot Trim Market',
    },
    {
      code: 'SUP-THREAD',
      name: 'Thread Supplier',
      contactName: 'Bilal Thread',
      phone: '+92-300-7001009',
      email: 'orders@thread-supply.pk',
      address: 'Faisalabad Thread Bazaar',
    },
  ];

  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { code: supplier.code },
      update: { ...supplier, isActive: true, deletedAt: null },
      create: { ...supplier, isActive: true },
    });
  }

  console.log('Seeding customers...');
  const customers = [
    {
      code: 'CUS-RETAIL',
      name: 'CityMart Retail',
      email: 'buy@citymart.pk',
      phone: '+92-42-1110001',
      address: 'Mall Road, Lahore',
    },
    {
      code: 'CUS-ONLINE',
      name: 'ShopEase Online',
      email: 'ops@shopease.pk',
      phone: '+92-21-2220002',
      address: 'Clifton, Karachi',
    },
  ];
  const customerRecords: Record<string, { id: string }> = {};
  for (const customer of customers) {
    const record = await prisma.customer.upsert({
      where: { code: customer.code },
      update: { ...customer, isActive: true, deletedAt: null },
      create: { ...customer, isActive: true },
    });
    customerRecords[customer.code] = record;
  }

  console.log('Seeding inventory balances...');
  // Reset balances so demo statuses match apparel products (AVAILABLE / RESERVED only)
  await prisma.inventoryBalance.deleteMany({});

  async function upsertBalance(input: {
    articleSku: string;
    warehouseId: string;
    locationId: string | null;
    status: string;
    quantity: number;
  }) {
    const articleId = articles[input.articleSku].id;
    const existing = await prisma.inventoryBalance.findFirst({
      where: {
        articleId,
        variantId: null,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        status: input.status,
      },
    });
    if (existing) {
      return prisma.inventoryBalance.update({
        where: { id: existing.id },
        data: { quantity: input.quantity },
      });
    }
    return prisma.inventoryBalance.create({
      data: {
        articleId,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        status: input.status,
        quantity: input.quantity,
      },
    });
  }

  // Apparel color SKUs only — Available stock + a few Reserved holds
  const apparelQtyByPrefix: Record<string, number> = {
    ZIP: 36,
    HDY: 48,
    CRW: 40,
    TEE: 80,
    SHT: 32,
    PNT: 28,
  };
  const reservedSkuExamples = new Set([
    'ZIP-BLK',
    'ZIP-NVY',
    'HDY-BLK',
    'CRW-WHT',
    'TEE-BLK',
    'TEE-WHT',
    'SHT-KHK',
    'PNT-BLK',
  ]);

  const balanceSpecs: Array<{
    articleSku: string;
    warehouseId: string;
    locationId: string | null;
    status: string;
    quantity: number;
  }> = [];

  for (const sku of apparelSkus) {
    const prefix = sku.split('-')[0];
    const baseQty = apparelQtyByPrefix[prefix] ?? 24;
    balanceSpecs.push({
      articleSku: sku,
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      status: 'AVAILABLE',
      quantity: baseQty,
    });
    if (reservedSkuExamples.has(sku)) {
      balanceSpecs.push({
        articleSku: sku,
        warehouseId: warehouseA.id,
        locationId: locA.bin.id,
        status: 'RESERVED',
        quantity: Math.max(4, Math.floor(baseQty / 8)),
      });
    }
  }

  // A few colors also stocked in secondary warehouse (still AVAILABLE)
  for (const sku of ['TEE-NVY', 'TEE-GRY', 'HDY-FOR', 'PNT-OLV', 'ZIP-OLV']) {
    if (!articles[sku]) continue;
    balanceSpecs.push({
      articleSku: sku,
      warehouseId: warehouseB.id,
      locationId: locB.bin.id,
      status: 'AVAILABLE',
      quantity: 20,
    });
  }

  for (const spec of balanceSpecs) {
    await upsertBalance(spec);
  }

  console.log('Seeding inventory transactions...');
  await prisma.inventoryTransaction.deleteMany({
    where: { referenceType: 'SEED_DEMO' },
  });
  await prisma.auditLog.deleteMany({
    where: { action: 'SEED_DEMO_DATA' },
  });

  const txSeeds: Array<{
    type: string;
    articleSku: string;
    warehouseId: string;
    locationId: string;
    fromStatus?: string;
    toStatus: string;
    quantity: number;
    balanceAfter: number;
    reason: string;
  }> = [
    {
      type: 'OPENING',
      articleSku: 'ZIP-BLK',
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      toStatus: 'AVAILABLE',
      quantity: 36,
      balanceAfter: 36,
      reason: 'Opening stock — Zipper Hoodie Black',
    },
    {
      type: 'OPENING',
      articleSku: 'HDY-BLK',
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      toStatus: 'AVAILABLE',
      quantity: 48,
      balanceAfter: 48,
      reason: 'Opening stock — Pullover Hoodie Black',
    },
    {
      type: 'OPENING',
      articleSku: 'CRW-NVY',
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      toStatus: 'AVAILABLE',
      quantity: 40,
      balanceAfter: 40,
      reason: 'Opening stock — Crewneck Navy',
    },
    {
      type: 'OPENING',
      articleSku: 'TEE-WHT',
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      toStatus: 'AVAILABLE',
      quantity: 80,
      balanceAfter: 80,
      reason: 'Opening stock — Essential Tee White',
    },
    {
      type: 'OPENING',
      articleSku: 'SHT-KHK',
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      toStatus: 'AVAILABLE',
      quantity: 32,
      balanceAfter: 32,
      reason: 'Opening stock — Shorts Khaki',
    },
    {
      type: 'OPENING',
      articleSku: 'PNT-BLK',
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      toStatus: 'AVAILABLE',
      quantity: 28,
      balanceAfter: 28,
      reason: 'Opening stock — Pants Black',
    },
    {
      type: 'RESERVE',
      articleSku: 'ZIP-BLK',
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      fromStatus: 'AVAILABLE',
      toStatus: 'RESERVED',
      quantity: 4,
      balanceAfter: 4,
      reason: 'Sales hold — Zipper Hoodie Black',
    },
    {
      type: 'RESERVE',
      articleSku: 'TEE-WHT',
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      fromStatus: 'AVAILABLE',
      toStatus: 'RESERVED',
      quantity: 10,
      balanceAfter: 10,
      reason: 'Sales hold — Essential Tee White',
    },
    {
      type: 'PURCHASE_RECEIPT',
      articleSku: 'TEE-NVY',
      warehouseId: warehouseB.id,
      locationId: locB.bin.id,
      toStatus: 'AVAILABLE',
      quantity: 20,
      balanceAfter: 20,
      reason: 'Transfer stock — Tee Navy to WH-B',
    },
  ];

  for (const tx of txSeeds) {
    await prisma.inventoryTransaction.create({
      data: {
        type: tx.type,
        articleId: articles[tx.articleSku].id,
        warehouseId: tx.warehouseId,
        locationId: tx.locationId,
        fromStatus: tx.fromStatus ?? null,
        toStatus: tx.toStatus,
        quantity: tx.quantity,
        balanceAfter: tx.balanceAfter,
        referenceType: 'SEED_DEMO',
        referenceId: 'apparel-stock',
        performedBy: admin.id,
        reason: tx.reason,
        notes: 'Seeded apparel demo transaction',
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SEED_DEMO_DATA',
      entityType: 'System',
      entityId: 'demo',
      afterJson: {
        balances: balanceSpecs.length,
        transactions: txSeeds.length,
      },
      reason: 'Apparel color demo dataset',
    },
  });

  console.log('Skipping seeded purchase orders (create them from the UI against packaging suppliers).');

  console.log('Seeding sales / production / sorting demo rows...');
  await prisma.salesOrder.upsert({
    where: { number: 'SO-000201' },
    update: { status: 'CONFIRMED', notes: 'Retail replenishment order' },
    create: {
      number: 'SO-000201',
      customerId: customerRecords['CUS-RETAIL'].id,
      warehouseId: warehouseA.id,
      status: 'CONFIRMED',
      notes: 'Retail replenishment order',
      items: {
        create: [
          {
            articleId: articles['ABC-001'].id,
            qtyOrdered: 30,
            unitPrice: 12.99,
          },
          {
            articleId: articles['JN-101'].id,
            qtyOrdered: 10,
            unitPrice: 49.99,
          },
        ],
      },
    },
  });
  await prisma.salesOrder.upsert({
    where: { number: 'SO-000202' },
    update: { status: 'DRAFT', notes: 'Online draft cart' },
    create: {
      number: 'SO-000202',
      customerId: customerRecords['CUS-ONLINE'].id,
      warehouseId: warehouseB.id,
      status: 'DRAFT',
      notes: 'Online draft cart',
      items: {
        create: [
          {
            articleId: articles['ABC-002'].id,
            qtyOrdered: 15,
            unitPrice: 24.99,
          },
        ],
      },
    },
  });

  await prisma.productionOrder.upsert({
    where: { number: 'PRD-000301' },
    update: { status: 'IN_PROGRESS', qtyCompleted: 12 },
    create: {
      number: 'PRD-000301',
      articleId: articles['JN-101'].id,
      warehouseId: warehouseA.id,
      qtyPlanned: 50,
      qtyCompleted: 12,
      status: 'IN_PROGRESS',
      plannedStart: new Date(),
      plannedEnd: new Date(Date.now() + 7 * 86400000),
    },
  });
  await prisma.productionOrder.upsert({
    where: { number: 'PRD-000302' },
    update: { status: 'DRAFT', qtyCompleted: 0 },
    create: {
      number: 'PRD-000302',
      articleId: articles['ABC-001'].id,
      warehouseId: warehouseA.id,
      qtyPlanned: 200,
      qtyCompleted: 0,
      status: 'DRAFT',
      plannedStart: new Date(Date.now() + 2 * 86400000),
      plannedEnd: new Date(Date.now() + 14 * 86400000),
    },
  });

  await prisma.sortingOrder.upsert({
    where: { number: 'SRT-000401' },
    update: { status: 'PENDING', priority: 2, qty: 45 },
    create: {
      number: 'SRT-000401',
      articleId: articles['FAB-COTTON'].id,
      warehouseId: warehouseA.id,
      locationId: locA.bin.id,
      qty: 45,
      status: 'PENDING',
      priority: 2,
    },
  });
  await prisma.sortingOrder.upsert({
    where: { number: 'SRT-000402' },
    update: { status: 'IN_PROGRESS', priority: 1, qty: 10 },
    create: {
      number: 'SRT-000402',
      articleId: articles['ABC-001'].id,
      warehouseId: warehouseA.id,
      locationId: locA.receiving.id,
      qty: 10,
      status: 'IN_PROGRESS',
      priority: 1,
    },
  });

  console.log('Seed completed successfully.');
  console.log('Demo logins:');
  console.log('  Admin: farooqpatel259 / farooqpatel2006');
  console.log('  Others (password Admin123!):');
  console.log('  inventory@inventory.local');
  console.log('  warehouse@inventory.local');
  console.log('  purchasing@inventory.local');
  console.log('  sales@inventory.local');
  console.log('  viewer@inventory.local');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
