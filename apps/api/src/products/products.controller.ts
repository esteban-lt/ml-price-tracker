import {
  Controller,
  Post,
  Body,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';

import { ProductsService } from './products.service.js';
import { AddProductDto } from './dto/add-product.dto.js';
import { plainToInstance } from 'class-transformer';
import { ProductResponseDto } from './dto/product-response.dto.js';

@Controller('products')
@UseInterceptors(ClassSerializerInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() dto: AddProductDto): Promise<ProductResponseDto> {
    const product = await this.productsService.addByUrl(dto.url);
    return plainToInstance(ProductResponseDto, product);
  }
}
