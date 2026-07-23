import { Shift, Prisma } from '@prisma/client';
import { PrismaTransaction } from '../../../../../shared/database/prisma.service';

export interface IShiftRepository {
  findMany(tenantId: string, tx?: PrismaTransaction): Promise<Shift[]>;
  findById(id: string, tenantId: string, tx?: PrismaTransaction): Promise<Shift | null>;
  findByIdWithCounts(id: string, tenantId: string, tx?: PrismaTransaction): Promise<(Shift & { _count: { rosters: number; defaultFor: number; appliedLogs: number } }) | null>;
  create(data: Prisma.ShiftUncheckedCreateInput, tx?: PrismaTransaction): Promise<Shift>;
  update(id: string, data: Prisma.ShiftUncheckedUpdateInput, tx?: PrismaTransaction): Promise<Shift>;
  delete(id: string, tx?: PrismaTransaction): Promise<void>;
  findByName(name: string, tenantId: string, excludeId?: string, tx?: PrismaTransaction): Promise<Shift | null>;
  findFlexibleShift(tenantId: string, tx?: PrismaTransaction): Promise<Shift | null>;
}

export const IShiftRepository = Symbol('IShiftRepository');
