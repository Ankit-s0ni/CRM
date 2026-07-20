export const TRANSACTIONAL_EMAIL_PORT = Symbol('TRANSACTIONAL_EMAIL_PORT');

export type TransactionalEmailDelivery = 'SENT' | 'FAILED';

export interface TransactionalEmailPort {
  sendVerificationCode(
    email: string,
    code: string,
  ): Promise<TransactionalEmailDelivery>;
}
