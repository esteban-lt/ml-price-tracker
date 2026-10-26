import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { EMAIL_VERIFICATION_STRATEGY } from '../strategies/email-verification.strategy.js';

export function EmailVerificationAuth() {
  return applyDecorators(UseGuards(AuthGuard(EMAIL_VERIFICATION_STRATEGY)));
}
