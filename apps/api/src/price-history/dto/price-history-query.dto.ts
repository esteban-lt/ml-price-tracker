import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const DEFAULT_HISTORY_DAYS = 30;
const MAX_HISTORY_DAYS = 365;

export class PriceHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El número de días debe ser un entero' })
  @Min(1, { message: 'El número de días debe ser al menos 1' })
  @Max(MAX_HISTORY_DAYS, { message: `El número de días no puede ser mayor a ${MAX_HISTORY_DAYS}` })
  days: number = DEFAULT_HISTORY_DAYS;
}
