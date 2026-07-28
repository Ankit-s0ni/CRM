export const TRANSACTIONAL_EMAIL_PORT = Symbol('TRANSACTIONAL_EMAIL_PORT');

export type TransactionalEmailDelivery = 'SENT' | 'FAILED';

export type TransactionalEmailContext = {
  email: string;
  workspaceName: string;
  locale?: string;
};

export interface TransactionalEmailPort {
  sendVerificationCode(
    email: string,
    code: string,
  ): Promise<TransactionalEmailDelivery>;

  sendPasswordReset(
    input: TransactionalEmailContext & { resetUrl: string },
  ): Promise<TransactionalEmailDelivery>;

  sendPasswordChanged(
    input: TransactionalEmailContext,
  ): Promise<TransactionalEmailDelivery>;

  sendInvitation(
    input: TransactionalEmailContext & { invitationUrl: string },
  ): Promise<TransactionalEmailDelivery>;
}
