import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { Admin } from '../auth/decorators/admin.decorator.js';
import { MercadoLibreApiService } from './api/mercado-libre-api.service.js';
import { MERCADO_LIBRE_CATEGORIES, findMercadoLibreCategory } from './api/mercado-libre-categories.js';
import { MercadoLibreAuthService } from './auth/mercado-libre-auth.service.js';
import { ExchangeCodeDto } from './dto/exchange-code.dto.js';
import { SearchProductsDto } from './dto/search-products.dto.js';

@Controller('mercado-libre')
export class MercadoLibreController {
  constructor(
    private readonly apiService: MercadoLibreApiService,
    private readonly authService: MercadoLibreAuthService,
  ) {}

  @Get('auth/url')
  @Admin()
  getAuthorizationUrl() {
    return { url: this.authService.getAuthorizationUrl() };
  }

  @Post('auth/exchange')
  @Admin()
  exchangeCode(@Body() { code }: ExchangeCodeDto) {
    return this.authService.exchangeCode(code);
  }

  @Get('auth/status')
  @Admin()
  getAuthStatus() {
    return this.authService.getStatus();
  }

  @Get('categories')
  getCategories() {
    return MERCADO_LIBRE_CATEGORIES.map(({ slug, name }) => ({ slug, name }));
  }

  @Get('products')
  searchProducts(@Query() { q, page }: SearchProductsDto) {
    return this.apiService.searchProducts(q.trim(), page);
  }

  @Get('products/:category')
  getProductsByCategory(@Param('category') slug: string) {
    const category = findMercadoLibreCategory(slug);
    if (!category) {
      throw new NotFoundException(`La categoría "${slug}" no existe`);
    }

    return this.apiService.getProductsByCategory(category.id);
  }
}
