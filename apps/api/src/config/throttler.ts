import { minutes, ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = [
  { name: 'default', ttl: minutes(1), limit: 100 },
];

export const RATE_LIMITS = {
  auth: { ttl: minutes(1), limit: 5 },
} satisfies Record<string, Pick<ThrottlerOptions, 'ttl' | 'limit'>>;
