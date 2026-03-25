import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose, { Schema, Types } from 'mongoose';

import { USER_TYPES } from '../auth/userType';
import { UserSchema } from '../auth/entities/auth.entity';
import { OTPSchema } from '../auth/entities/otp.entity';
import { SupplierSchema } from '../supplier/entities/supplier.entity';
import { CustomerSchema } from '../customer/entities/customer.entity';
import { WarehouseSchema } from '../warehouse/schemas/warehouse.schema';
import {
  PRODUCT_CATEGORY_TYPES,
  type PRODUCT_CATEGORY_TYPES as ProductCategoryType,
} from '../products/constants/product.constant';
import { ProductSchema } from '../products/entities/product.entity';
import { VariantSchema } from '../variant/schemas/variant.schema';
import { BatchSchema } from '../batch/schemas/batch.schema';
import { VariantStockSchema } from '../variant-stock/schemas/variant-stock.schema';
import { QuantitySchema } from '../quantity/entities/quantity.entity';
import { TransactionSchema } from '../transaction/schemas/transaction.schema';
import { TRANSACTION_TYPES } from '../transaction/constants/transactionConstants';
import { SHIPMENT_TYPES } from '../transaction/constants/shipmentConstants';
import { TRANSACTION_STATUS } from '../transaction/constants/transactionStatus';
import { NotificationSchema } from '../notification/entities/notification.entity';
import { SubscriptionSchema } from '../notification/entities/subscription.entity';
import { NOTIFICATION_TYPES } from '../notification/notificationTypes';
import { TransactionLogSchema } from '../transaction-logs/entities/transaction-log.entity';
import { LOG_ACTION } from '../transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from '../transaction-logs/enums/log-entity-type.enum';
import { LogStatus } from '../transaction-logs/enums/log-status.enum';

type ObjId = Types.ObjectId;

type ProductSeedTemplate = {
  name: string;
  category: PRODUCT_CATEGORY_TYPES;
  brand: string;
  label: string;
  description: string;
  imageTag: string;
};

type VariantSeedRecord = {
  _id: ObjId;
  productId: ObjId;
  price: number;
  sku: string;
  imageTag: string;
};

type WarehouseSeedRecord = {
  _id: ObjId;
  name: string;
  maxTransactionPriceLimit: number;
};

type BatchSeedRecord = {
  _id: ObjId;
  variantId: ObjId;
  destinationWarehouse: ObjId;
  quantity: number;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const UNSPLASH_IDS_BY_KEYWORD: Record<string, string[]> = {
  smartphone: ['0VGG7cqTwCo', '8pCtwj37VB4', 'AGRtDoZlpYw'],
  headphones: ['0QAe85hi_Mw'],
  chair: ['3pOXfTAWtCk', '7mfNpV5eJH0', '8hQu_VuLY08'],
  desk: ['1tBgXbyn-5I', '6dWnjRDOZIU'],
  tshirt: ['4rUYuwJ2vGw'],
  jacket: ['1QOsJGbNIgk', '2Wr4ZSm_1CE'],
  tea: ['3hRRT4qztzs'],
  protein: ['-RS4DgxF3-k'],
  thermometer: ['04HE-456KIg'],
  gloves: ['5b95cK_mLB8'],
  drill: ['4mAcustUNPs'],
  wrench: ['4mAcustUNPs'],
  brake: ['2061kBB1PuY'],
  filter: ['2xlZnxLbS-A'],
  paper: ['2q_frVRXWfQ'],
  notebook: ['2q_frVRXWfQ'],
  wallet: ['2q_frVRXWfQ'],
  backpack: ['3o-X8WJOP5E'],
  mouse: ['7eZeXqKAywU'],
  power: ['1MSlwT_-X8c'],
  portrait: ['3o-X8WJOP5E', '2q_frVRXWfQ'],
  manager: ['3o-X8WJOP5E', '2q_frVRXWfQ'],
  admin: ['2q_frVRXWfQ', '3o-X8WJOP5E'],
};

const DEFAULT_UNSPLASH_IDS = [
  '0VGG7cqTwCo',
  '3pOXfTAWtCk',
  '1tBgXbyn-5I',
  '2q_frVRXWfQ',
];

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const PRODUCT_TEMPLATES: ProductSeedTemplate[] = [
  {
    name: 'Smartphone X1',
    category: PRODUCT_CATEGORY_TYPES.ELECTRONICS,
    brand: 'NEXA',
    label: 'SPX1',
    description: '5G smartphone with OLED display and multi-lens camera.',
    imageTag: 'smartphone electronics',
  },
  {
    name: 'Noise Cancelling Headphones',
    category: PRODUCT_CATEGORY_TYPES.ELECTRONICS,
    brand: 'AURON',
    label: 'NCH',
    description: 'Over-ear wireless headphones with active noise cancellation.',
    imageTag: 'headphones tech',
  },
  {
    name: 'Ergonomic Office Chair',
    category: PRODUCT_CATEGORY_TYPES.FURNITURE,
    brand: 'LUMBAR',
    label: 'ERGO',
    description:
      'Breathable mesh chair with lumbar support for long work days.',
    imageTag: 'ergonomic chair office',
  },
  {
    name: 'Standing Desk Pro',
    category: PRODUCT_CATEGORY_TYPES.FURNITURE,
    brand: 'UPLIFT',
    label: 'SDK',
    description: 'Height-adjustable electric desk with memory presets.',
    imageTag: 'standing desk modern',
  },
  {
    name: 'Performance T-Shirt',
    category: PRODUCT_CATEGORY_TYPES.CLOTHING,
    brand: 'DRYFIT',
    label: 'PTS',
    description: 'Moisture-wicking tee designed for active training.',
    imageTag: 'sports tshirt apparel',
  },
  {
    name: 'Denim Jacket',
    category: PRODUCT_CATEGORY_TYPES.CLOTHING,
    brand: 'BLUECO',
    label: 'DNMJ',
    description: 'Classic denim jacket with reinforced seams.',
    imageTag: 'denim jacket fashion',
  },
  {
    name: 'Organic Green Tea Pack',
    category: PRODUCT_CATEGORY_TYPES.FOOD_BEVERAGE,
    brand: 'LEAFOR',
    label: 'GTEA',
    description: 'Premium organic green tea sourced from highland farms.',
    imageTag: 'green tea package',
  },
  {
    name: 'Protein Snack Bar Box',
    category: PRODUCT_CATEGORY_TYPES.FOOD_BEVERAGE,
    brand: 'NUTRIX',
    label: 'PSB',
    description: 'Mixed flavor protein bars with low sugar formula.',
    imageTag: 'protein bar food',
  },
  {
    name: 'Digital Thermometer',
    category: PRODUCT_CATEGORY_TYPES.MEDICAL_SUPPLIES,
    brand: 'MEDICORE',
    label: 'DTH',
    description: 'Fast-read digital thermometer for clinical and home use.',
    imageTag: 'medical thermometer',
  },
  {
    name: 'Disposable Gloves Pack',
    category: PRODUCT_CATEGORY_TYPES.MEDICAL_SUPPLIES,
    brand: 'SAFEHANDS',
    label: 'DGP',
    description: 'Powder-free nitrile gloves for hygiene and safety.',
    imageTag: 'nitrile gloves medical',
  },
  {
    name: 'Cordless Drill Kit',
    category: PRODUCT_CATEGORY_TYPES.INDUSTRIAL_TOOLS,
    brand: 'TORQMAX',
    label: 'CDK',
    description: 'Compact drill with lithium battery and multi-bit kit.',
    imageTag: 'cordless drill tool',
  },
  {
    name: 'Precision Wrench Set',
    category: PRODUCT_CATEGORY_TYPES.INDUSTRIAL_TOOLS,
    brand: 'FORGE',
    label: 'PWS',
    description: 'Durable chrome vanadium wrench set in carry case.',
    imageTag: 'wrench tools workshop',
  },
  {
    name: 'Brake Pad Set',
    category: PRODUCT_CATEGORY_TYPES.AUTOMOTIVE_PARTS,
    brand: 'ROADGRIP',
    label: 'BPS',
    description: 'Ceramic brake pads for smoother braking performance.',
    imageTag: 'brake pads automotive',
  },
  {
    name: 'Car Air Filter',
    category: PRODUCT_CATEGORY_TYPES.AUTOMOTIVE_PARTS,
    brand: 'AIRFLOW',
    label: 'CAF',
    description: 'High-flow air filter compatible with major sedan models.',
    imageTag: 'car air filter auto',
  },
  {
    name: 'A4 Copy Paper Box',
    category: PRODUCT_CATEGORY_TYPES.OFFICE_SUPPLIES,
    brand: 'PAPERA',
    label: 'A4CP',
    description: 'High-brightness multipurpose paper for printers and copiers.',
    imageTag: 'office paper ream',
  },
  {
    name: 'Executive Notebook',
    category: PRODUCT_CATEGORY_TYPES.OFFICE_SUPPLIES,
    brand: 'INKLOG',
    label: 'EXNB',
    description: 'Hardbound notebook with premium ruled pages.',
    imageTag: 'notebook stationery',
  },
  {
    name: 'Leather Wallet',
    category: PRODUCT_CATEGORY_TYPES.ACCESSORIES,
    brand: 'MONTA',
    label: 'LWT',
    description: 'Slim leather wallet with RFID blocking liner.',
    imageTag: 'leather wallet accessory',
  },
  {
    name: 'Travel Backpack',
    category: PRODUCT_CATEGORY_TYPES.ACCESSORIES,
    brand: 'TRAILCO',
    label: 'TBP',
    description: 'Water-resistant backpack with laptop compartment.',
    imageTag: 'travel backpack',
  },
  {
    name: 'Wireless Mouse',
    category: PRODUCT_CATEGORY_TYPES.ELECTRONICS,
    brand: 'CLICKER',
    label: 'WMS',
    description: 'Silent-click wireless mouse with ergonomic grip.',
    imageTag: 'wireless mouse desk',
  },
  {
    name: 'Portable Power Bank',
    category: PRODUCT_CATEGORY_TYPES.ELECTRONICS,
    brand: 'VOLTGO',
    label: 'PPB',
    description: '10000mAh power bank with fast USB-C charging.',
    imageTag: 'power bank gadget',
  },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function randomSubset<T>(items: T[], min: number, max: number): T[] {
  const copy = [...items];
  const count = Math.min(randomInt(min, max), items.length);
  const subset: T[] = [];

  for (let i = 0; i < count; i++) {
    const index = randomInt(0, copy.length - 1);
    subset.push(copy.splice(index, 1)[0]);
  }

  return subset;
}

function randomDateInLast30Days(anchor?: Date): Date {
  const end = anchor?.getTime() ?? Date.now();
  const start = end - THIRTY_DAYS_MS;
  return new Date(start + Math.random() * (end - start));
}

function timestampPair(anchor?: Date): { createdAt: Date; updatedAt: Date } {
  const createdAt = randomDateInLast30Days(anchor);
  const updatedAt = new Date(
    createdAt.getTime() + randomInt(5, 48) * 60 * 60 * 1000,
  );
  return {
    createdAt,
    updatedAt: updatedAt.getTime() > Date.now() ? new Date() : updatedAt,
  };
}

function unsplashUrl(tag: string, seed: string): string {
  const normalized = tag.toLowerCase();
  const match = Object.entries(UNSPLASH_IDS_BY_KEYWORD).find(([keyword]) =>
    normalized.includes(keyword),
  );

  const ids = match?.[1] ?? DEFAULT_UNSPLASH_IDS;
  const hash = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selectedId = ids[hash % ids.length];

  return `https://unsplash.com/photos/${selectedId}/download?force=true&w=1200`;
}

function stockKey(variantId: ObjId, warehouseId: ObjId): string {
  return `${variantId.toString()}:${warehouseId.toString()}`;
}

function productWarehouseKey(productId: ObjId, warehouseId: ObjId): string {
  return `${productId.toString()}:${warehouseId.toString()}`;
}

function parseStockKey(key: string): { variantId: ObjId; warehouseId: ObjId } {
  const [variantId, warehouseId] = key.split(':');
  return {
    variantId: new Types.ObjectId(variantId),
    warehouseId: new Types.ObjectId(warehouseId),
  };
}

function actionForTransactionType(type: TRANSACTION_TYPES): LOG_ACTION {
  switch (type) {
    case TRANSACTION_TYPES.IN:
      return LOG_ACTION.STOCK_IN;
    case TRANSACTION_TYPES.OUT:
      return LOG_ACTION.STOCK_OUT;
    case TRANSACTION_TYPES.TRANSFER:
      return LOG_ACTION.STOCK_TRANSFER;
    case TRANSACTION_TYPES.ADJUSTMENT:
      return LOG_ACTION.STOCK_ADJUSTED;
    default:
      return LOG_ACTION.STOCK_ADJUSTED;
  }
}

async function seed(): Promise<void> {
  const dbUri = process.env.DB_URI;

  if (!dbUri) {
    throw new Error('DB_URI is missing in environment variables.');
  }

  await mongoose.connect(dbUri, {
    dbName: 'new_seeded_db',
  });

  const UserModel =
    mongoose.models.User || mongoose.model('User', UserSchema as Schema);
  const OTPModel =
    mongoose.models.OTP || mongoose.model('OTP', OTPSchema as Schema);
  const SupplierModel =
    mongoose.models.Supplier ||
    mongoose.model('Supplier', SupplierSchema as Schema);
  const CustomerModel =
    mongoose.models.Customer ||
    mongoose.model('Customer', CustomerSchema as Schema);
  const WarehouseModel =
    mongoose.models.Warehouse ||
    mongoose.model('Warehouse', WarehouseSchema as Schema);
  const ProductModel =
    mongoose.models.Product ||
    mongoose.model('Product', ProductSchema as Schema);
  const VariantModel =
    mongoose.models.Variant ||
    mongoose.model('Variant', VariantSchema as Schema);
  const BatchModel =
    mongoose.models.Batch || mongoose.model('Batch', BatchSchema as Schema);
  const VariantStockModel =
    mongoose.models.VariantStock ||
    mongoose.model('VariantStock', VariantStockSchema as Schema);
  const QuantityModel =
    mongoose.models.Quantity ||
    mongoose.model('Quantity', QuantitySchema as Schema);
  const TransactionModel =
    mongoose.models.Transaction ||
    mongoose.model('Transaction', TransactionSchema as Schema);
  const NotificationModel =
    mongoose.models.Notification ||
    mongoose.model('Notification', NotificationSchema as Schema);
  const SubscriptionModel =
    mongoose.models.Subscription ||
    mongoose.model('Subscription', SubscriptionSchema as Schema);
  const TransactionLogModel =
    mongoose.models.TransactionLog ||
    mongoose.model('TransactionLog', TransactionLogSchema as Schema);

  await Promise.all([
    NotificationModel.deleteMany({}),
    SubscriptionModel.deleteMany({}),
    TransactionLogModel.deleteMany({}),
    TransactionModel.deleteMany({}),
    BatchModel.deleteMany({}),
    VariantStockModel.deleteMany({}),
    QuantityModel.deleteMany({}),
    VariantModel.deleteMany({}),
    ProductModel.deleteMany({}),
    WarehouseModel.deleteMany({}),
    SupplierModel.deleteMany({}),
    CustomerModel.deleteMany({}),
    OTPModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Shaswata@12', 10);

  const adminId = new Types.ObjectId();
  const managerIds = Array.from({ length: 5 }, () => new Types.ObjectId());

  const userDocs = [
    {
      _id: adminId,
      name: 'Aarav Sharma',
      email: 'admin@warehousehub.com',
      password: passwordHash,
      role: USER_TYPES.ADMIN,
      isVerified: true,
      isActive: true,
      isDeleted: false,
      profileImage: unsplashUrl('portrait professional', 'admin'),
      profileImageKey: 'users/admin-1.jpg',
      lastLogin: randomDateInLast30Days(),
      preferences: { email: true, push: true },
      ...timestampPair(),
    },
    ...managerIds.map((id, index) => ({
      _id: id,
      name: [
        'Shaswata Biswas',
        'Rahul Verma',
        'Sneha Iyer',
        'Karan Patel',
        'Ananya Reddy',
      ][index],
      email: `manager${index + 1}@warehousehub.com`,
      password: passwordHash,
      role: USER_TYPES.MANAGER,
      isVerified: true,
      isActive: true,
      isDeleted: false,
      profileImage: unsplashUrl('manager profile', `manager-${index + 1}`),
      profileImageKey: `users/manager-${index + 1}.jpg`,
      lastLogin: randomDateInLast30Days(),
      preferences: { email: true, push: index % 2 === 0 },
      ...timestampPair(),
    })),
  ];

  await UserModel.insertMany(userDocs);

  const otpDocs = userDocs.slice(0, 4).map((user) => ({
    _id: new Types.ObjectId(),
    email: user.email,
    otp: [String(randomInt(100000, 999999)), String(randomInt(100000, 999999))],
    ...timestampPair(),
  }));

  await OTPModel.insertMany(otpDocs);

  const supplierDocs = [
    {
      _id: new Types.ObjectId(),
      email: 'procurement@eastpeak-supply.com',
      name: 'EastPeak Supply Co.',
      address: '241 Harbor Road, Seattle, WA',
      phoneNumber: '12065550110',
      suppliedProduct: [
        PRODUCT_CATEGORY_TYPES.ELECTRONICS,
        PRODUCT_CATEGORY_TYPES.ACCESSORIES,
      ],
      isActive: true,
      ...timestampPair(),
    },
    {
      _id: new Types.ObjectId(),
      email: 'sales@forgewell-industries.com',
      name: 'Forgewell Industries',
      address: '89 Foundry Lane, Houston, TX',
      phoneNumber: '17135550122',
      suppliedProduct: [
        PRODUCT_CATEGORY_TYPES.INDUSTRIAL_TOOLS,
        PRODUCT_CATEGORY_TYPES.AUTOMOTIVE_PARTS,
      ],
      isActive: true,
      ...timestampPair(),
    },
    {
      _id: new Types.ObjectId(),
      email: 'orders@medicore-labs.com',
      name: 'Medicore Labs',
      address: '512 Health Park, Boston, MA',
      phoneNumber: '16175550133',
      suppliedProduct: [
        PRODUCT_CATEGORY_TYPES.MEDICAL_SUPPLIES,
        PRODUCT_CATEGORY_TYPES.OFFICE_SUPPLIES,
      ],
      isActive: true,
      ...timestampPair(),
    },
    {
      _id: new Types.ObjectId(),
      email: 'contact@grainandbrew.com',
      name: 'Grain & Brew Distributors',
      address: '77 Orchard Street, Portland, OR',
      phoneNumber: '15035550144',
      suppliedProduct: [
        PRODUCT_CATEGORY_TYPES.FOOD_BEVERAGE,
        PRODUCT_CATEGORY_TYPES.ACCESSORIES,
      ],
      isActive: true,
      ...timestampPair(),
    },
    {
      _id: new Types.ObjectId(),
      email: 'info@urbanfurnish.com',
      name: 'Urban Furnish Works',
      address: '908 Cedar Avenue, Austin, TX',
      phoneNumber: '15125550155',
      suppliedProduct: [
        PRODUCT_CATEGORY_TYPES.FURNITURE,
        PRODUCT_CATEGORY_TYPES.CLOTHING,
      ],
      isActive: true,
      ...timestampPair(),
    },
    {
      _id: new Types.ObjectId(),
      email: 'support@paperlineglobal.com',
      name: 'Paperline Global',
      address: '304 Station Road, Chicago, IL',
      phoneNumber: '13125550166',
      suppliedProduct: [
        PRODUCT_CATEGORY_TYPES.OFFICE_SUPPLIES,
        PRODUCT_CATEGORY_TYPES.CLOTHING,
      ],
      isActive: true,
      ...timestampPair(),
    },
  ];

  await SupplierModel.insertMany(supplierDocs);

  const customerDocs = [
    {
      _id: new Types.ObjectId(),
      name: 'Shree Ganesh Retail Mart',
      email: 'ops@northwind-retail.com',
      address: '211 Market Street, Denver, CO',
      phoneNumber: '13035550001',
      isActive: true,
      ...timestampPair(),
    },
    {
      _id: new Types.ObjectId(),
      name: 'Swasthya Care Distributors',
      email: 'fulfillment@citylinemed.com',
      address: '76 Elm Street, Phoenix, AZ',
      phoneNumber: '16025550002',
      isActive: true,
      ...timestampPair(),
    },
    {
      _id: new Types.ObjectId(),
      name: 'Vikram Auto Works',
      email: 'buyer@atlasautoservices.com',
      address: '19 Industrial Park, Detroit, MI',
      phoneNumber: '12485550003',
      isActive: true,
      ...timestampPair(),
    },
    {
      _id: new Types.ObjectId(),
      name: 'Narmada Office Supplies',
      email: 'receiving@harboroffice.com',
      address: '430 Bayview Blvd, San Diego, CA',
      phoneNumber: '16195550004',
      isActive: true,
      ...timestampPair(),
    },
    {
      _id: new Types.ObjectId(),
      name: 'Udaan Lifestyle Stores',
      email: 'purchasing@peakoutfitters.com',
      address: '68 Summit Drive, Boise, ID',
      phoneNumber: '12085550005',
      isActive: true,
      ...timestampPair(),
    },
  ];

  await CustomerModel.insertMany(customerDocs);

  const warehouseDocs: WarehouseSeedRecord[] = [
    {
      _id: new Types.ObjectId(),
      name: 'North Distribution Center',
      maxTransactionPriceLimit: 9500,
    },
    {
      _id: new Types.ObjectId(),
      name: 'South Logistics Hub',
      maxTransactionPriceLimit: 11000,
    },
    {
      _id: new Types.ObjectId(),
      name: 'East Fulfillment Warehouse',
      maxTransactionPriceLimit: 10000,
    },
    {
      _id: new Types.ObjectId(),
      name: 'West Transit Warehouse',
      maxTransactionPriceLimit: 9000,
    },
  ];

  await WarehouseModel.insertMany(
    warehouseDocs.map((warehouse, index) => ({
      _id: warehouse._id,
      name: warehouse.name,
      address: `${120 + index} Commerce Avenue, District ${index + 1}`,
      description: `Main storage facility for ${warehouse.name.toLowerCase()}.`,
      managerIds: randomSubset(managerIds, 1, 2),
      active: true,
      capacity: randomInt(12000, 22000),
      maxTransactionPriceLimit: warehouse.maxTransactionPriceLimit,
      ...timestampPair(),
    })),
  );

  const productRecords = PRODUCT_TEMPLATES.map((template, index) => {
    const variantCount = randomInt(3, 5);

    return {
      _id: new Types.ObjectId(),
      ...template,
      variantCount,
      createdBy: randomFrom([adminId, ...managerIds]),
      createdIndex: index + 1,
    };
  });

  await ProductModel.insertMany(
    productRecords.map((product) => ({
      _id: product._id,
      name: product.name,
      category: product.category,
      brand: product.brand,
      label: product.label,
      description: product.description,
      createdBy: product.createdBy,
      variantCount: product.variantCount,
      isArchived: false,
      ...timestampPair(),
    })),
  );

  const variantRecords: VariantSeedRecord[] = [];

  for (const product of productRecords) {
    for (let i = 0; i < product.variantCount; i++) {
      const suffix = randomInt(1000, 9999);
      const variantId = new Types.ObjectId();
      const sku = `${product.label}-${String(i + 1).padStart(2, '0')}-${suffix}`;
      const markup = randomInt(8, 24);
      const price = randomInt(20, 450);

      variantRecords.push({
        _id: variantId,
        productId: product._id,
        price,
        sku,
        imageTag: product.imageTag,
      });

      await VariantModel.create({
        _id: variantId,
        product: product._id,
        attributes: {
          color: randomFrom(['Black', 'White', 'Navy', 'Silver', 'Green']),
          size: randomFrom(['S', 'M', 'L', 'XL', 'Standard']),
          package: randomFrom(['Single', 'Twin Pack', 'Bundle']),
        },
        variantImage: [
          unsplashUrl(product.imageTag, sku.toLowerCase()),
          unsplashUrl(product.imageTag, `${sku.toLowerCase()}-alt`),
        ],
        price,
        markup,
        sku,
        ...timestampPair(),
      });
    }
  }

  const initialStockMap = new Map<string, number>();
  const knownVariantWarehousePairs = new Set<string>();

  for (const variant of variantRecords) {
    const assignedWarehouses = randomSubset(warehouseDocs, 1, 2);

    for (const warehouse of assignedWarehouses) {
      const key = stockKey(variant._id, warehouse._id);
      const quantity = randomInt(30, 140);
      initialStockMap.set(key, quantity);
      knownVariantWarehousePairs.add(key);
    }
  }

  const batchRecords: BatchSeedRecord[] = [];

  for (let i = 0; i < 28; i++) {
    const variant = randomFrom(variantRecords);
    const warehouse = randomFrom(warehouseDocs);
    const quantity = randomInt(40, 160);

    batchRecords.push({
      _id: new Types.ObjectId(),
      variantId: variant._id,
      destinationWarehouse: warehouse._id,
      quantity,
    });
  }

  await BatchModel.insertMany(
    batchRecords.map((batch) => ({
      _id: batch._id,
      sourceWarehouse: null,
      destinationWarehouse: batch.destinationWarehouse,
      items: [
        {
          variant: batch.variantId,
          quantity: batch.quantity,
          remainingQuantity: randomInt(0, batch.quantity),
        },
      ],
      ...timestampPair(),
    })),
  );

  const batchesByVariant = new Map<string, BatchSeedRecord[]>();

  for (const batch of batchRecords) {
    const key = batch.variantId.toString();
    const list = batchesByVariant.get(key) ?? [];
    list.push(batch);
    batchesByVariant.set(key, list);
  }

  const transactionDocs: Record<string, unknown>[] = [];
  const notificationDocs: Record<string, unknown>[] = [];
  const logDocs: Record<string, unknown>[] = [];

  const managerAndAdminIds = [adminId, ...managerIds];

  const getStocksForVariant = (variantId: ObjId) => {
    const items = Array.from(initialStockMap.entries())
      .filter(
        ([key, quantity]) =>
          key.startsWith(`${variantId.toString()}:`) && quantity > 0,
      )
      .map(([key, quantity]) => {
        const { warehouseId } = parseStockKey(key);
        return { key, warehouseId, quantity };
      });

    items.sort((a, b) => b.quantity - a.quantity);

    return items;
  };

  const mutateStock = (variantId: ObjId, warehouseId: ObjId, delta: number) => {
    const key = stockKey(variantId, warehouseId);
    const current = initialStockMap.get(key) ?? 0;
    const nextValue = Math.max(0, current + delta);
    initialStockMap.set(key, nextValue);
    knownVariantWarehousePairs.add(key);
    return nextValue;
  };

  for (const variant of variantRecords) {
    const txCount = randomInt(5, 10);

    for (let i = 0; i < txCount; i++) {
      const txId = new Types.ObjectId();
      const txDate = randomDateInLast30Days();
      const product = productRecords.find((item) =>
        item._id.equals(variant.productId),
      );

      if (!product) {
        throw new Error('Product record missing for variant.');
      }

      let type = randomFrom([
        TRANSACTION_TYPES.IN,
        TRANSACTION_TYPES.OUT,
        TRANSACTION_TYPES.ADJUSTMENT,
        TRANSACTION_TYPES.TRANSFER,
      ]);

      const stocks = getStocksForVariant(variant._id);
      if (stocks.length === 0) {
        type = TRANSACTION_TYPES.IN;
      }

      let sourceWarehouse: ObjId | undefined;
      let destinationWarehouse: ObjId | undefined;
      let supplierId: ObjId | undefined;
      let customerId: ObjId | undefined;
      let shipment: SHIPMENT_TYPES | undefined;
      let reason: string | undefined;
      let quantity = randomInt(2, 20);
      let adjustmentDirection: 'increase' | 'decrease' = 'increase';

      if (type === TRANSACTION_TYPES.IN) {
        const destination = randomFrom(warehouseDocs);
        destinationWarehouse = destination._id;
        quantity = randomInt(8, 45);
        supplierId = randomFrom(supplierDocs)._id;
        mutateStock(variant._id, destinationWarehouse, quantity);
      } else if (type === TRANSACTION_TYPES.OUT) {
        const currentStocks = getStocksForVariant(variant._id);

        if (currentStocks.length === 0) {
          type = TRANSACTION_TYPES.IN;
          const destination = randomFrom(warehouseDocs);
          destinationWarehouse = destination._id;
          quantity = randomInt(8, 45);
          supplierId = randomFrom(supplierDocs)._id;
          mutateStock(variant._id, destinationWarehouse, quantity);
        } else {
          const stockItem = currentStocks[0];
          sourceWarehouse = stockItem.warehouseId;
          quantity = Math.min(randomInt(1, 24), stockItem.quantity);
          customerId = randomFrom(customerDocs)._id;
          shipment = randomFrom([
            SHIPMENT_TYPES.PENDING,
            SHIPMENT_TYPES.SHIPPED,
            SHIPMENT_TYPES.CANCELLED,
          ]);
          mutateStock(variant._id, sourceWarehouse, -quantity);
        }
      } else if (type === TRANSACTION_TYPES.TRANSFER) {
        const currentStocks = getStocksForVariant(variant._id);

        if (currentStocks.length === 0) {
          type = TRANSACTION_TYPES.IN;
          const destination = randomFrom(warehouseDocs);
          destinationWarehouse = destination._id;
          quantity = randomInt(8, 45);
          supplierId = randomFrom(supplierDocs)._id;
          mutateStock(variant._id, destinationWarehouse, quantity);
        } else {
          const stockItem = currentStocks[0];
          sourceWarehouse = stockItem.warehouseId;
          const candidates = warehouseDocs.filter(
            (item) => !item._id.equals(sourceWarehouse),
          );
          destinationWarehouse = randomFrom(candidates)._id;
          quantity = Math.min(randomInt(1, 18), stockItem.quantity);
          mutateStock(variant._id, sourceWarehouse, -quantity);
          mutateStock(variant._id, destinationWarehouse, quantity);
        }
      } else if (type === TRANSACTION_TYPES.ADJUSTMENT) {
        const currentStocks = getStocksForVariant(variant._id);

        if (currentStocks.length === 0) {
          destinationWarehouse = randomFrom(warehouseDocs)._id;
          quantity = randomInt(4, 16);
          adjustmentDirection = 'increase';
          mutateStock(variant._id, destinationWarehouse, quantity);
        } else {
          const stockItem = randomFrom(currentStocks);
          sourceWarehouse = stockItem.warehouseId;
          destinationWarehouse = stockItem.warehouseId;
          adjustmentDirection =
            stockItem.quantity > 3 && Math.random() > 0.4
              ? 'decrease'
              : 'increase';
          quantity =
            adjustmentDirection === 'decrease'
              ? Math.min(randomInt(1, 12), stockItem.quantity)
              : randomInt(1, 12);

          if (adjustmentDirection === 'decrease') {
            mutateStock(variant._id, sourceWarehouse, -quantity);
          } else {
            mutateStock(variant._id, sourceWarehouse, quantity);
          }
        }

        reason =
          adjustmentDirection === 'decrease'
            ? 'Cycle count adjustment for damaged inventory'
            : 'Cycle count adjustment after recount';
      }

      const actingUser = randomFrom(managerAndAdminIds);
      const activeWarehouse = warehouseDocs.find(
        (item) =>
          (sourceWarehouse && item._id.equals(sourceWarehouse)) ||
          (destinationWarehouse && item._id.equals(destinationWarehouse)),
      );

      const totalAmount = Number((quantity * variant.price).toFixed(2));
      const txLimit = activeWarehouse?.maxTransactionPriceLimit ?? 10000;
      const requiresApproval = totalAmount > txLimit;

      const approvalStatus = requiresApproval
        ? randomFrom([
            TRANSACTION_STATUS.PENDING,
            TRANSACTION_STATUS.APPROVED,
            TRANSACTION_STATUS.REJECTED,
          ])
        : TRANSACTION_STATUS.APPROVED;

      const approvalDate =
        approvalStatus !== TRANSACTION_STATUS.PENDING
          ? new Date(txDate.getTime() + randomInt(1, 72) * 60 * 60 * 1000)
          : undefined;

      const relatedBatches = (
        batchesByVariant.get(variant._id.toString()) ?? []
      )
        .filter((batch) => {
          if (!sourceWarehouse && !destinationWarehouse) return true;

          if (
            destinationWarehouse &&
            batch.destinationWarehouse.equals(destinationWarehouse)
          ) {
            return true;
          }

          if (
            sourceWarehouse &&
            batch.destinationWarehouse.equals(sourceWarehouse)
          ) {
            return true;
          }

          return false;
        })
        .slice(0, 2)
        .map((batch) => ({
          batch: batch._id,
          quantity: Math.max(1, Math.min(quantity, batch.quantity)),
        }));

      transactionDocs.push({
        _id: txId,
        type,
        products: [
          {
            product: product._id,
            variants: [
              {
                variant: variant._id,
                quantity,
                batches: relatedBatches,
              },
            ],
          },
        ],
        supplier: supplierId,
        customer: customerId,
        shipment,
        reason,
        notes:
          type === TRANSACTION_TYPES.ADJUSTMENT
            ? `Stock ${adjustmentDirection} adjustment recorded during audit.`
            : `Automated seed transaction for ${variant.sku}.`,
        performedBy: actingUser,
        sourceWarehouse,
        destinationWarehouse,
        totalAmount,
        requiresApproval,
        approvalStatus,
        approvedBy:
          approvalStatus !== TRANSACTION_STATUS.PENDING ? adminId : undefined,
        approvedAt: approvalDate,
        createdAt: txDate,
        updatedAt:
          approvalDate && approvalDate.getTime() <= Date.now()
            ? approvalDate
            : new Date(txDate.getTime() + 30 * 60 * 1000),
      });

      logDocs.push({
        _id: new Types.ObjectId(),
        action: actionForTransactionType(type),
        entityType: LOG_ENTITY_TYPE.TRANSACTION,
        entityId: txId.toString(),
        performedBy: {
          userId: actingUser,
        },
        metadata: {
          transaction: {
            transactionId: txId.toString(),
            type,
            totalAmount,
            approvalStatus,
          },
          product: {
            productId: product._id.toString(),
            productName: product.name,
            variantId: variant._id.toString(),
            sku: variant.sku,
            quantity,
          },
          warehouse: {
            sourceWarehouseId: sourceWarehouse?.toString(),
            destinationWarehouseId: destinationWarehouse?.toString(),
          },
        },
        status: LogStatus.SUCCESS,
        createdAt: new Date(txDate.getTime() + randomInt(1, 50) * 60 * 1000),
      });

      const shouldNotify = Math.random() < 0.55;
      if (shouldNotify) {
        const recipientPool = randomSubset(managerAndAdminIds, 2, 4);

        let notificationType = NOTIFICATION_TYPES.STOCK_IN;
        let title = 'Stock In Recorded';
        let message = `${quantity} unit(s) of ${variant.sku} received.`;

        if (type === TRANSACTION_TYPES.OUT) {
          notificationType =
            shipment === SHIPMENT_TYPES.PENDING
              ? NOTIFICATION_TYPES.PENDING_SHIPMENT
              : NOTIFICATION_TYPES.STOCK_ADJUSTMENT;

          title =
            shipment === SHIPMENT_TYPES.PENDING
              ? 'Pending Shipment Alert'
              : 'Shipment Status Updated';

          message =
            shipment === SHIPMENT_TYPES.PENDING
              ? `${quantity} unit(s) of ${variant.sku} are pending shipment.`
              : `${quantity} unit(s) of ${variant.sku} marked as ${shipment?.toLowerCase()}.`;
        }

        if (type === TRANSACTION_TYPES.TRANSFER) {
          notificationType = NOTIFICATION_TYPES.STOCK_TRANSFER;
          title = 'Stock Transfer Recorded';
          message = `${quantity} unit(s) of ${variant.sku} transferred between warehouses.`;
        }

        if (type === TRANSACTION_TYPES.ADJUSTMENT) {
          notificationType = NOTIFICATION_TYPES.STOCK_ADJUSTMENT;
          title = 'Stock Adjustment Recorded';
          message = `${quantity} unit(s) of ${variant.sku} adjusted by cycle count.`;
        }

        const activeWarehouseId = sourceWarehouse ?? destinationWarehouse;

        notificationDocs.push({
          _id: new Types.ObjectId(),
          userIds: recipientPool,
          transactionPerformedBy: actingUser,
          type: notificationType,
          title,
          message,
          seen: Math.random() < 0.45,
          relatedProduct: product._id,
          warehouse: activeWarehouseId,
          transactionId: txId,
          isShipped: shipment === SHIPMENT_TYPES.SHIPPED,
          isCancelled: shipment === SHIPMENT_TYPES.CANCELLED,
          reportedBy:
            shipment && shipment !== SHIPMENT_TYPES.PENDING
              ? randomFrom(managerIds)
              : undefined,
          createdAt: new Date(txDate.getTime() + randomInt(3, 90) * 60 * 1000),
          updatedAt: new Date(txDate.getTime() + randomInt(3, 120) * 60 * 1000),
        });
      }
    }
  }

  const lowStockThreshold = numberFromEnv('STOCK_LIMIT', 25);

  for (const [key, quantity] of initialStockMap.entries()) {
    if (quantity > lowStockThreshold) {
      continue;
    }

    const { variantId, warehouseId } = parseStockKey(key);
    const variant = variantRecords.find((item) => item._id.equals(variantId));

    if (!variant) {
      continue;
    }

    notificationDocs.push({
      _id: new Types.ObjectId(),
      userIds: randomSubset(managerAndAdminIds, 2, 3),
      transactionPerformedBy: randomFrom(managerAndAdminIds),
      type: NOTIFICATION_TYPES.LOW_STOCK,
      title: 'Low Stock Warning',
      message: `${variant.sku} is running low with only ${quantity} unit(s) remaining.`,
      seen: false,
      relatedProduct: variant.productId,
      warehouse: warehouseId,
      createdAt: randomDateInLast30Days(),
      updatedAt: randomDateInLast30Days(),
    });
  }

  await TransactionModel.insertMany(transactionDocs);
  await NotificationModel.insertMany(notificationDocs);
  await TransactionLogModel.insertMany(logDocs);

  const variantStockDocs = Array.from(knownVariantWarehousePairs).map((key) => {
    const { variantId, warehouseId } = parseStockKey(key);
    const variant = variantRecords.find((item) => item._id.equals(variantId));

    if (!variant) {
      throw new Error('Variant not found for stock record.');
    }

    return {
      _id: new Types.ObjectId(),
      productId: variant.productId,
      variantId,
      warehouseId,
      quantity: initialStockMap.get(key) ?? 0,
      ...timestampPair(),
    };
  });

  await VariantStockModel.insertMany(variantStockDocs);

  const productWarehouseTotals = new Map<string, number>();

  for (const stockRecord of variantStockDocs) {
    const key = productWarehouseKey(
      stockRecord.productId,
      stockRecord.warehouseId,
    );
    productWarehouseTotals.set(
      key,
      (productWarehouseTotals.get(key) ?? 0) + stockRecord.quantity,
    );
  }

  const quantityDocs: Record<string, unknown>[] = [];
  const quantityLimit = numberFromEnv('LIMIT', 25);

  for (const product of productRecords) {
    for (const warehouse of warehouseDocs) {
      const key = productWarehouseKey(product._id, warehouse._id);
      quantityDocs.push({
        _id: new Types.ObjectId(),
        warehouseId: warehouse._id,
        productId: product._id,
        quantity: productWarehouseTotals.get(key) ?? 0,
        limit: quantityLimit,
        ...timestampPair(),
      });
    }
  }

  await QuantityModel.insertMany(quantityDocs);

  const subscriptionDocs = managerAndAdminIds.map((userId, index) => ({
    _id: new Types.ObjectId(),
    endpoint: `https://push.service.local/subscription/${userId.toString()}`,
    expirationTime: null,
    keys: {
      p256dh: `p256dh-key-${index + 1}-${randomInt(1000, 9999)}`,
      auth: `auth-key-${index + 1}-${randomInt(1000, 9999)}`,
    },
    userId,
    ...timestampPair(),
  }));

  await SubscriptionModel.insertMany(subscriptionDocs);

  const entityCreateLogDocs: Record<string, unknown>[] = [
    ...productRecords.slice(0, 10).map((product) => ({
      _id: new Types.ObjectId(),
      action: LOG_ACTION.PRODUCT_CREATED,
      entityType: LOG_ENTITY_TYPE.PRODUCT,
      entityId: product._id.toString(),
      performedBy: { userId: product.createdBy },
      metadata: {
        product: {
          productId: product._id.toString(),
          name: product.name,
          category: product.category,
        },
      },
      status: LogStatus.SUCCESS,
      createdAt: randomDateInLast30Days(),
    })),
    ...variantRecords.slice(0, 15).map((variant) => ({
      _id: new Types.ObjectId(),
      action: LOG_ACTION.VARIANT_CREATED,
      entityType: LOG_ENTITY_TYPE.VARIANT,
      entityId: variant._id.toString(),
      performedBy: { userId: randomFrom(managerAndAdminIds) },
      metadata: {
        variant: {
          variantId: variant._id.toString(),
          productId: variant.productId.toString(),
          sku: variant.sku,
          price: variant.price,
        },
      },
      status: LogStatus.SUCCESS,
      createdAt: randomDateInLast30Days(),
    })),
    ...warehouseDocs.map((warehouse) => ({
      _id: new Types.ObjectId(),
      action: LOG_ACTION.WAREHOUSE_CREATED,
      entityType: LOG_ENTITY_TYPE.WAREHOUSE,
      entityId: warehouse._id.toString(),
      performedBy: { userId: adminId },
      metadata: {
        warehouse: {
          warehouseId: warehouse._id.toString(),
          name: warehouse.name,
        },
      },
      status: LogStatus.SUCCESS,
      createdAt: randomDateInLast30Days(),
    })),
    ...supplierDocs.slice(0, 4).map((supplier) => ({
      _id: new Types.ObjectId(),
      action: LOG_ACTION.SUPPLIER_CREATED,
      entityType: LOG_ENTITY_TYPE.SUPPLIER,
      entityId: supplier._id.toString(),
      performedBy: { userId: adminId },
      metadata: {
        supplier: {
          supplierId: supplier._id.toString(),
          name: supplier.name,
          email: supplier.email,
        },
      },
      status: LogStatus.SUCCESS,
      createdAt: randomDateInLast30Days(),
    })),
    ...customerDocs.slice(0, 4).map((customer) => ({
      _id: new Types.ObjectId(),
      action: LOG_ACTION.CUSTOMER_CREATED,
      entityType: LOG_ENTITY_TYPE.CUSTOMER,
      entityId: customer._id.toString(),
      performedBy: { userId: randomFrom(managerAndAdminIds) },
      metadata: {
        customer: {
          customerId: customer._id.toString(),
          name: customer.name,
          email: customer.email,
        },
      },
      status: LogStatus.SUCCESS,
      createdAt: randomDateInLast30Days(),
    })),
  ];

  await TransactionLogModel.insertMany(entityCreateLogDocs);

  const categorySummary = productRecords.reduce<
    Record<ProductCategoryType, number>
  >(
    (acc, product) => {
      const key = product.category;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {
      [PRODUCT_CATEGORY_TYPES.ELECTRONICS]: 0,
      [PRODUCT_CATEGORY_TYPES.FURNITURE]: 0,
      [PRODUCT_CATEGORY_TYPES.CLOTHING]: 0,
      [PRODUCT_CATEGORY_TYPES.FOOD_BEVERAGE]: 0,
      [PRODUCT_CATEGORY_TYPES.MEDICAL_SUPPLIES]: 0,
      [PRODUCT_CATEGORY_TYPES.INDUSTRIAL_TOOLS]: 0,
      [PRODUCT_CATEGORY_TYPES.AUTOMOTIVE_PARTS]: 0,
      [PRODUCT_CATEGORY_TYPES.OFFICE_SUPPLIES]: 0,
      [PRODUCT_CATEGORY_TYPES.ACCESSORIES]: 0,
    },
  );

  console.log('Seed completed successfully.');
  console.log(`Users: ${userDocs.length} (1 admin + 5 managers)`);
  console.log(`Suppliers: ${supplierDocs.length}`);
  console.log(`Warehouses: ${warehouseDocs.length}`);
  console.log(`Products: ${productRecords.length}`);
  console.log(`Variants: ${variantRecords.length}`);
  console.log(`Transactions: ${transactionDocs.length}`);
  console.log(`Batches: ${batchRecords.length}`);
  console.log(`Variant Stocks: ${variantStockDocs.length}`);
  console.log(`Quantity Rows: ${quantityDocs.length}`);
  console.log(`Notifications: ${notificationDocs.length}`);
  console.log(
    `Transaction Logs: ${logDocs.length + entityCreateLogDocs.length}`,
  );
  console.log('Products by category:', categorySummary);
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
