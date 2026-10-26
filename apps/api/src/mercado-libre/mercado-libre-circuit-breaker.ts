import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 30_000;

export class MercadoLibreUnavailableException extends ServiceUnavailableException {
  constructor() {
    super('Mercado Libre no está disponible en este momento; intenta más tarde');
  }
}

@Injectable()
export class MercadoLibreCircuitBreaker {
  private readonly logger = new Logger(MercadoLibreCircuitBreaker.name);
  private consecutiveFailures = 0;
  private openUntil = 0;

  assertClosed(): void {
    if (Date.now() < this.openUntil) throw new MercadoLibreUnavailableException();
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openUntil = 0;
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures < FAILURE_THRESHOLD || Date.now() < this.openUntil) return;

    this.openUntil = Date.now() + OPEN_DURATION_MS;
    this.logger.warn(
      `${this.consecutiveFailures} fallos seguidos de Mercado Libre; se pausan las peticiones ${OPEN_DURATION_MS / 1000}s`,
    );
  }
}
