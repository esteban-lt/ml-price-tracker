import { HttpStatus } from '@nestjs/common';

import { MercadoLibreErrorDetail } from './mercado-libre-error.js';

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 5_000;

export function isServiceFailure({ status }: MercadoLibreErrorDetail): boolean {
  return status === undefined || status === HttpStatus.TOO_MANY_REQUESTS || status >= HttpStatus.INTERNAL_SERVER_ERROR;
}

// Full-jitter exponential backoff; Retry-After wins when present. Null means "do not retry".
export function retryDelayMs(detail: MercadoLibreErrorDetail, retriesSoFar: number): number | null {
  if (retriesSoFar >= MAX_RETRIES || !isServiceFailure(detail)) return null;

  if (detail.retryAfterMs !== undefined) {
    return detail.retryAfterMs <= MAX_DELAY_MS ? detail.retryAfterMs : null;
  }
  return Math.round(Math.random() * Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** retriesSoFar));
}
