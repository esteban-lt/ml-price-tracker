import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AdminGuard } from '../guards/admin.guard.js';

export function Admin() {
  return applyDecorators(UseGuards(AuthGuard('jwt'), AdminGuard));
}
