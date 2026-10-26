import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

export const MercadoLibreHttpModule = HttpModule.registerAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    timeout: configService.getOrThrow<number>('ML_REQUEST_TIMEOUT_MS'),
  }),
});
