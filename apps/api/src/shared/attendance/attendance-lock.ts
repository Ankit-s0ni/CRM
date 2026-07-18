import { HttpException } from '@nestjs/common';
import type { PrismaTransaction } from '../database/prisma.service';

export async function assertAttendanceRangeUnlocked(
  tx: PrismaTransaction,
  startDate: Date,
  endDate: Date,
  employeeId?: string,
) {
  const startPeriod = startDate.toISOString().slice(0, 7);
  const endPeriod = endDate.toISOString().slice(0, 7);
  const [periodLock, lockedLog] = await Promise.all([
    tx.payrollLockPeriod.findFirst({
      where: {
        period: { gte: startPeriod, lte: endPeriod },
        status: 'LOCKED',
      },
      select: { id: true },
    }),
    tx.attendanceLog.findFirst({
      where: {
        employeeId,
        attendanceDate: { gte: startDate, lte: endDate },
        OR: [
          { lockedAt: { not: null } },
          { payrollLock: { status: 'LOCKED' } },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (periodLock || lockedLog) {
    throw new HttpException(
      {
        code: 'ATTENDANCE_DAY_LOCKED',
        message: 'Attendance is locked for payroll',
      },
      423,
    );
  }
}
