import { HttpException, HttpStatus } from '@nestjs/common';

export class VerificationCodeCooldownException extends HttpException {
  constructor(secondsRemaining: number) {
    super(`Espera ${secondsRemaining} segundos antes de pedir otro código`, HttpStatus.TOO_MANY_REQUESTS);
  }
}
