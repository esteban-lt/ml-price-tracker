import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { AddProductDto } from './dto/add-product.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { Product } from './entities/product.entity.js';
import { ProductsService } from './products.service.js';

@Controller('products')
@Auth()
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ type: ProductResponseDto })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  addProduct(@Body() addProductDto: AddProductDto): Promise<Product> {
    return this.productsService.addProduct(addProductDto);
  }

  @Get()
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.productsService.findById(id);
  }
}
