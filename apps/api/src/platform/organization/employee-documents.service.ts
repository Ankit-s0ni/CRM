import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/public';
import { PrismaService } from '../../shared/database/prisma.service';
import { PrivateObjectStorageService } from '../../shared/storage/private-object-storage.service';
import { TenantContextService } from '../tenancy/public';
import {
  PresignEmployeeDocumentDto,
  RegisterEmployeeDocumentDto,
} from './dto/employee-document.dto';

@Injectable()
export class EmployeeDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly storage: PrivateObjectStorageService,
    private readonly audit: AuditService,
  ) {}

  async presign(employeeId: string, dto: PresignEmployeeDocumentDto) {
    await this.assertEmployee(employeeId);
    return {
      data: await this.storage.presignEmployeeDocument(
        this.tenantId(),
        employeeId,
        dto.filename,
        dto.contentType,
        dto.fileSize,
      ),
    };
  }

  async register(
    employeeId: string,
    dto: RegisterEmployeeDocumentDto,
    userId: string,
  ) {
    const tenantId = this.tenantId();
    await this.assertEmployee(employeeId);
    await this.storage.verifyEmployeeDocument(
      tenantId,
      employeeId,
      dto.objectKey,
    );
    return this.prisma.forTenant(async (tx) => {
      const document = await tx.employeeDocument.create({
        data: {
          tenantId,
          employeeId,
          documentType: dto.documentType.trim().toUpperCase(),
          title: dto.title.trim(),
          filename: dto.filename,
          contentType: dto.contentType,
          fileSize: dto.fileSize,
          objectKey: dto.objectKey,
          uploadedBy: userId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      });
      await this.audit.append(tx, {
        tenantId,
        actorUserId: userId,
        action: 'organization.employee-document.created',
        module: 'organization',
        entityType: 'Employee',
        entityId: employeeId,
        newValue: {
          documentId: document.id,
          documentType: document.documentType,
          title: document.title,
          filename: document.filename,
          contentType: document.contentType,
          fileSize: document.fileSize,
          expiresAt: document.expiresAt,
        },
      });
      return { data: this.serialize(document) };
    });
  }

  async list(employeeId: string) {
    await this.assertEmployee(employeeId);
    const documents = await this.prisma.forTenant((tx) =>
      tx.employeeDocument.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return { data: documents.map((document) => this.serialize(document)) };
  }

  async download(employeeId: string, documentId: string) {
    const document = await this.get(employeeId, documentId);
    return {
      data: await this.storage.signedEmployeeDocumentDownload(
        this.tenantId(),
        employeeId,
        document.objectKey,
      ),
    };
  }

  async remove(employeeId: string, documentId: string, userId: string) {
    const tenantId = this.tenantId();
    const document = await this.get(employeeId, documentId);
    await this.storage.deleteEmployeeDocument(
      tenantId,
      employeeId,
      document.objectKey,
    );
    await this.prisma.forTenant(async (tx) => {
      await tx.employeeDocument.delete({ where: { id: documentId } });
      await this.audit.append(tx, {
        tenantId,
        actorUserId: userId,
        action: 'organization.employee-document.deleted',
        module: 'organization',
        entityType: 'Employee',
        entityId: employeeId,
        oldValue: {
          documentId,
          documentType: document.documentType,
          title: document.title,
          filename: document.filename,
        },
      });
    });
    return { data: { id: documentId, deleted: true } };
  }

  private async get(employeeId: string, documentId: string) {
    const document = await this.prisma.forTenant((tx) =>
      tx.employeeDocument.findFirst({
        where: { id: documentId, employeeId },
      }),
    );
    if (!document) this.notFound('EMPLOYEE_DOCUMENT_NOT_FOUND');
    return document;
  }

  private async assertEmployee(employeeId: string) {
    const employee = await this.prisma.forTenant((tx) =>
      tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      }),
    );
    if (!employee) this.notFound('EMPLOYEE_NOT_FOUND');
  }

  private serialize(document: {
    id: string;
    employeeId: string;
    documentType: string;
    title: string;
    filename: string;
    contentType: string;
    fileSize: number;
    objectKey?: string;
    uploadedBy: string;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: document.id,
      employeeId: document.employeeId,
      documentType: document.documentType,
      title: document.title,
      filename: document.filename,
      contentType: document.contentType,
      fileSize: document.fileSize,
      uploadedBy: document.uploadedBy,
      expiresAt: document.expiresAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  private tenantId() {
    const tenantId = this.context.tenantId;
    if (!tenantId) throw new Error('Tenant context is unavailable');
    return tenantId;
  }

  private notFound(code: string): never {
    throw new NotFoundException({ code, message: 'Resource was not found' });
  }
}
