import { Module } from '@nestjs/common';
import {
  ProductCategoryController,
  ProductController,
  CustomerProductAffinityController,
} from './product.controller';
import { ProductService } from './product.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    ProductCategoryController,
    ProductController,
    CustomerProductAffinityController,
  ],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
