import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export class AlertsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un entero' })
  @Min(1, { message: 'La página debe ser al menos 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un entero' })
  @Min(1, { message: 'El límite debe ser al menos 1' })
  @Max(MAX_LIMIT, { message: `El límite no puede ser mayor a ${MAX_LIMIT}` })
  limit: number = DEFAULT_LIMIT;

  // Los query params llegan como texto; cualquier valor distinto de "true"/"false" lo reporta @IsBoolean.
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean({ message: 'El filtro unread debe ser true o false' })
  unread: boolean = false;
}
