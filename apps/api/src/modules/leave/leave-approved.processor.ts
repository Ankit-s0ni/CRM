import { Injectable, NotFoundException } from '@nestjs/common';
import { ExceptionSource, ExceptionType, Prisma } from '@prisma/client';
import { AttendanceJobProcessor } from '../attendance/jobs/attendance-job.processor';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantJobContextRunner } from '../../shared/tenancy/tenant-job-context.runner';
import { assertAttendanceRangeUnlocked } from '../../shared/attendance/attendance-lock';

export type LeaveEventTask = {
  eventId: string;
  tenantId: string;
  eventKey: string;
  payload: Prisma.JsonValue;
};

@Injectable()
export class LeaveApprovedProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: TenantJobContextRunner,
    private readonly attendance: AttendanceJobProcessor,
  ) {}

  process(task: LeaveEventTask) {
    if (task.eventKey !== 'leave.approved')
      return Promise.resolve({ ignored: true });
    return this.runner.run(task, async () => {
      const payload = jsonObject(task.payload);
      const leaveRequestId = jsonText(
        payload.leaveRequestId ?? payload.referenceId,
      );
      const request = await this.prisma.forTenant(async (tx) => {
        const request = await tx.leaveRequest.findFirst({
          where: { id: leaveRequestId, status: 'APPROVED' },
        });
        if (!request)
          throw new NotFoundException({
            code: 'LEAVE_REQUEST_NOT_FOUND',
            message: 'Approved leave request was not found',
          });
        await assertAttendanceRangeUnlocked(
          tx,
          request.startDate,
          request.endDate,
          request.employeeId,
        );
        await tx.attendanceException.upsert({
          where: { leaveRequestId: request.id },
          // Replayed events also repair rows created by older integrations.
          update: {
            employeeId: request.employeeId,
            exceptionType: ExceptionType.LEAVE,
            source: ExceptionSource.LEAVE_MODULE,
            startDate: request.startDate,
            endDate: request.endDate,
            halfDayStart: request.halfDayStart,
            halfDayEnd: request.halfDayEnd,
            reason: request.reason,
            approvedBy: request.approvedBy,
          },
          create: {
            tenantId: task.tenantId,
            employeeId: request.employeeId,
            exceptionType: ExceptionType.LEAVE,
            source: ExceptionSource.LEAVE_MODULE,
            startDate: request.startDate,
            endDate: request.endDate,
            halfDayStart: request.halfDayStart,
            halfDayEnd: request.halfDayEnd,
            reason: request.reason,
            approvedBy: request.approvedBy,
            leaveRequestId: request.id,
          },
        });
        return request;
      });
      for (const date of dates(request.startDate, request.endDate)) {
        await this.attendance.recomputeEmployeeDay(
          task.tenantId,
          request.employeeId,
          date,
        );
      }
      return { processed: true, leaveRequestId: request.id };
    });
  }
}

function dates(start: Date, end: Date) {
  const values: string[] = [];
  for (let at = start.getTime(); at <= end.getTime(); at += 86_400_000)
    values.push(new Date(at).toISOString().slice(0, 10));
  return values;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function jsonText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}
