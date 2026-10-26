import { ForbiddenException, HttpStatus } from '@nestjs/common';

export const EMAIL_NOT_VERIFIED_ERROR_CODE = 'EMAIL_NOT_VERIFIED';

export class EmailNotVerifiedException extends ForbiddenException {
  constructor(verificationToken: string) {
    super({
      statusCode: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
      code: EMAIL_NOT_VERIFIED_ERROR_CODE,
      message: 'Email not verified',
      verificationToken,
    });
  }
}
