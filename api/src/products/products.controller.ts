import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { Product } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':token')
  async findOne(@Param('token') token: string): Promise<Product> {
    return this.productsService.findOne(token);
  }
}
