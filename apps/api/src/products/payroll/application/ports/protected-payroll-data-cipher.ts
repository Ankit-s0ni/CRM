export type EncryptedPayrollValue = {
  ciphertext: string;
  keyVersion: string;
};

export interface ProtectedPayrollDataCipher {
  encrypt(value: string): Promise<EncryptedPayrollValue>;
  decrypt(value: EncryptedPayrollValue): Promise<string>;
}

export const PROTECTED_PAYROLL_DATA_CIPHER = Symbol(
  'PROTECTED_PAYROLL_DATA_CIPHER',
);
