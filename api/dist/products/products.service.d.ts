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
    private readonly products;
    findOne(token: string): Product;
}
