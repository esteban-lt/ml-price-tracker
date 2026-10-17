import { IsBoolean } from 'class-validator';

export class UpdateEmailNotificationsDto {
  @IsBoolean({ message: 'enabled debe ser true o false' })
  enabled: boolean;
}
