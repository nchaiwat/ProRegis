import { ProductsService } from './products.service';
import type { Product } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findOne(token: string): Promise<Product>;
}
