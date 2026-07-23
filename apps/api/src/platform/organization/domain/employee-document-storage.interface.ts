export const EMPLOYEE_DOCUMENT_STORAGE = Symbol('EMPLOYEE_DOCUMENT_STORAGE');

export type EmployeeDocumentUpload = {
  objectKey: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
};

export type EmployeeDocumentDownload = {
  url: string;
  expiresIn: number;
};

export interface EmployeeDocumentStorage {
  createUpload(
    tenantId: string,
    employeeId: string,
    filename: string,
    contentType: string,
    fileSize: number,
  ): Promise<EmployeeDocumentUpload>;

  verifyUpload(
    tenantId: string,
    employeeId: string,
    objectKey: string,
    contentType: string,
    fileSize: number,
  ): Promise<void>;

  createDownload(
    tenantId: string,
    employeeId: string,
    objectKey: string,
  ): Promise<EmployeeDocumentDownload>;

  delete(
    tenantId: string,
    employeeId: string,
    objectKey: string,
  ): Promise<void>;
}
