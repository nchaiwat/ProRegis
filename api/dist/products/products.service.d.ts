import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProductMetadata } from './product-metadata.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { SapService } from '../sap/sap.service';
import { BackofficeService } from '../backoffice/backoffice.service';
export interface Product {
    token: string;
    code: string;
    modelTh: string;
    modelEn: string;
    manufactureDate: string;
    lotNo: string;
    poNo: string;
    imageUrl: string;
    warrantyPeriod: string;
    specs: {
        th: {
            label: string;
            value: string;
        }[];
        en: {
            label: string;
            value: string;
        }[];
    };
    features: {
        th: string[];
        en: string[];
    };
}
export declare class ProductsService {
    private readonly productMetadataRepository;
    private readonly productionOrderRepository;
    private readonly sapService;
    private readonly backofficeService;
    private readonly configService;
    private readonly logger;
    constructor(productMetadataRepository: Repository<ProductMetadata>, productionOrderRepository: Repository<ProductionOrder>, sapService: SapService, backofficeService: BackofficeService, configService: ConfigService);
    private readonly products;
    private downloadImageAsBase64;
    findOne(token: string): Promise<Product>;
}
