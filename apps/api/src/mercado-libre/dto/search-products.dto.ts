import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { SEARCH_MAX_PAGES } from '../api/mercado-libre-api.service.js';

export class SearchProductsDto {
  @IsString()
  @MinLength(2, { message: 'La búsqueda debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'La búsqueda no puede exceder 100 caracteres' })
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SEARCH_MAX_PAGES, { message: `Mercado Libre solo permite hasta ${SEARCH_MAX_PAGES} páginas` })
  page: number = 1;
}
