import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { USER_TYPES } from 'src/auth/userType';
import { User } from 'src/auth/entities/auth.entity';
import { StorageService } from 'src/storage/storage.service';
import { GetManagersDto } from './dto/get-manager.dto';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { Warehouse } from 'src/warehouse/schemas/warehouse.schema';

/* ── Types ───────────────────────────────────────────────────────────────── */

type ManagerRow = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  total: number;
  IN: number;
  OUT: number;
  ADJUSTMENT: number;
  TRANSFER: number;
};

type UserObject = Record<string, unknown> & { profileImage?: string };

type TrendPoint = {
  label: string;
  count: number;
};

/* ── Service ─────────────────────────────────────────────────────────────── */

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,

    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<Warehouse>,

    private readonly storageService: StorageService,
  ) {}

  async getManagers(warehouseId?: string) {
    const filter: QueryFilter<User> = {
      role: USER_TYPES.MANAGER,
      isVerified: true,
      isDeleted: false,
    };

    if (warehouseId) {
      const warehouse = await this.warehouseModel
        .findById(warehouseId)
        .select('managerIds')
        .lean();

      if (!warehouse) {
        throw new NotFoundException(`Warehouse ${warehouseId} not found`);
      }

      filter._id = { $in: warehouse.managerIds ?? [] };
    }

    const data = await this.userModel.find(filter, {
      password: 0,
      __v: 0,
    });

    return {
      message: 'All Managers',
      success: true,
      data,
    };
  }

  async getAllManagers(query: GetManagersDto) {
    const {
      page = '1',
      limit = '5',
      search,
      isActive,
      isVerified,
      sort = 'desc',
      warehouseId,
    } = query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const filters: QueryFilter<User> = {
      role: USER_TYPES.MANAGER,
    };

    let managerIds: Types.ObjectId[] | null = null;

    if (warehouseId) {
      const warehouse = await this.warehouseModel.findById(warehouseId, {
        managerIds: 1,
      });

      if (!warehouse) {
        return {
          success: true,
          message: 'Manager trend retrieved',
          data: [],
        };
      }

      managerIds = warehouse.managerIds ?? [];

      if (!managerIds.length) {
        return {
          success: true,
          message: 'Manager trend retrieved',
          data: [],
        };
      }
    }

    if (managerIds && managerIds.length) {
      filters._id = { $in: managerIds };
    }

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    if (isVerified !== undefined) {
      filters.isVerified = isVerified === 'true';
    }

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await this.userModel.countDocuments(filters);

    const users = await this.userModel
      .find(filters, { password: 0, __v: 0 })
      .sort({ createdAt: sort === 'asc' ? 1 : -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const data: UserObject[] = await Promise.all(
      users.map(async (user): Promise<UserObject> => {
        if (user.profileImageKey) {
          const url: string = await this.storageService.getPresignedSignedUrl(
            user.profileImageKey,
          );
          return { ...user.toObject(), profileImage: url };
        }
        return user.toObject() as unknown as UserObject;
      }),
    );

    return {
      message: 'Managers fetched successfully',
      success: true,
      data,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  }

  async getManagerTransactionStats(managerId?: string, warehouseId?: string) {
    const stat = managerId
      ? await this.getStatForManager(managerId, warehouseId)
      : await this.getMostEfficientManager(warehouseId);

    return {
      success: true,
      message: 'Manager analytics retrieved successfully',
      data: { managerStat: stat },
    };
  }

  async getManagerList() {
    const result = await this.userModel
      .find(
        { role: USER_TYPES.MANAGER, isVerified: true, isDeleted: false },
        { _id: 1, name: 1, email: 1 },
      )
      .sort({ name: 1 })
      .lean<{ _id: Types.ObjectId; name?: string; email?: string }[]>();

    return {
      success: true,
      message: 'Manager list retrieved successfully',
      data: result.map((m) => ({
        _id: m._id,
        name: m.name ?? null,
        email: m.email ?? null,
      })),
    };
  }

  /* ── Private helpers ─────────────────────────────────────────────────────── */

  private async resolveAllowedManagerIds(
    warehouseId?: string,
  ): Promise<Types.ObjectId[] | null> {
    if (!warehouseId) return null;

    const warehouse = await this.warehouseModel
      .findById(warehouseId)
      .select('managerIds')
      .lean();

    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }

    return warehouse.managerIds ?? [];
  }

  private async getMostEfficientManager(
    warehouseId?: string,
  ): Promise<ManagerRow | null> {
    const matchCriteria: Record<string, unknown> = {};

    const allowedIds = await this.resolveAllowedManagerIds(warehouseId);
    if (allowedIds !== null) {
      matchCriteria.performedBy = { $in: allowedIds };
    }

    const results = await this.buildAggregation(matchCriteria);
    return results[0] ?? null;
  }

  private async getStatForManager(
    managerId: string,
    warehouseId?: string,
  ): Promise<ManagerRow | null> {
    const managerObjectId = new Types.ObjectId(managerId);

    const allowedIds = await this.resolveAllowedManagerIds(warehouseId);

    if (
      allowedIds !== null &&
      !allowedIds.some((id) => id.equals(managerObjectId))
    ) {
      return null;
    }

    const matchCriteria: Record<string, unknown> = {
      performedBy: managerObjectId,
    };

    const results = await this.buildAggregation(matchCriteria);
    return results[0] ?? null;
  }

  private async buildAggregation(
    extraMatch: Record<string, unknown> = {},
  ): Promise<ManagerRow[]> {
    return this.transactionModel.aggregate<ManagerRow>([
      {
        $match: {
          performedBy: { $exists: true, $ne: null },
          ...extraMatch,
        },
      },
      {
        $group: {
          _id: '$performedBy',
          total: { $sum: 1 },
          IN: { $sum: { $cond: [{ $eq: ['$type', 'IN'] }, 1, 0] } },
          OUT: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, 1, 0] } },
          ADJUSTMENT: {
            $sum: { $cond: [{ $eq: ['$type', 'ADJUSTMENT'] }, 1, 0] },
          },
          TRANSFER: { $sum: { $cond: [{ $eq: ['$type', 'TRANSFER'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'managerInfo',
        },
      },
      { $unwind: '$managerInfo' },
      {
        $project: {
          _id: 1,
          name: '$managerInfo.name',
          email: '$managerInfo.email',
          total: 1,
          IN: 1,
          OUT: 1,
          ADJUSTMENT: 1,
          TRANSFER: 1,
        },
      },
    ]);
  }

  async getManagerAddedTrend(
    period: 7 | 30,
    warehouseId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: TrendPoint[];
  }> {
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - period + 1);
    from.setHours(0, 0, 0, 0);

    let managerIds: Types.ObjectId[] | null = null;

    if (warehouseId) {
      const warehouse = await this.warehouseModel.findById(warehouseId, {
        managerIds: 1,
      });

      if (!warehouse) {
        return { success: true, message: 'Manager trend retrieved', data: [] };
      }

      managerIds = warehouse.managerIds ?? [];

      if (!managerIds.length) {
        return { success: true, message: 'Manager trend retrieved', data: [] };
      }
    }

    if (period === 7) {
      const results = await this.userModel.aggregate<{
        day: number;
        month: number;
        year: number;
        count: number;
      }>([
        {
          $match: {
            role: USER_TYPES.MANAGER,
            createdAt: { $gte: from, $lte: now },
            ...(managerIds && managerIds.length
              ? { _id: { $in: managerIds } }
              : {}),
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
            count: 1,
          },
        },
      ]);

      const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const filled: TrendPoint[] = [];

      for (let i = period - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const found = results.find(
          (r) => r.year === year && r.month === month && r.day === day,
        );
        filled.push({
          label: DAY_LABELS[d.getDay()],
          count: found?.count ?? 0,
        });
      }

      return {
        success: true,
        message: 'Manager trend retrieved',
        data: filled,
      };
    }

    // Last 30 days — group into 4 weekly buckets labelled "Week 1" … "Week 4"
    const results = await this.userModel.aggregate<{
      week: number;
      count: number;
    }>([
      {
        $match: {
          role: USER_TYPES.MANAGER,
          createdAt: { $gte: from, $lte: now },
          ...(managerIds && managerIds.length
            ? { _id: { $in: managerIds } }
            : {}),
        },
      },
      {
        $group: {
          _id: {
            $ceil: {
              $divide: [
                {
                  $add: [
                    {
                      $dateDiff: {
                        startDate: from,
                        endDate: '$createdAt',
                        unit: 'day',
                      },
                    },
                    1,
                  ],
                },
                7,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, week: '$_id', count: 1 } },
    ]);

    const filled: TrendPoint[] = [1, 2, 3, 4].map((w) => ({
      label: `Week ${w}`,
      count: results.find((r) => r.week === w)?.count ?? 0,
    }));

    return { success: true, message: 'Manager trend retrieved', data: filled };
  }
}
