"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SapService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let SapService = SapService_1 = class SapService {
    configService;
    logger = new common_1.Logger(SapService_1.name);
    apiUrl;
    companyDb;
    username;
    password;
    rejectUnauthorized;
    sessionCookie = null;
    isMockMode = false;
    constructor(configService) {
        this.configService = configService;
        this.apiUrl = this.configService.get('SAP_SERVICE_LAYER_URL', '');
        this.companyDb = this.configService.get('SAP_COMPANY_DB', '');
        this.username = this.configService.get('SAP_USERNAME', '');
        this.password = this.configService.get('SAP_PASSWORD', '');
        const rejectVal = this.configService.get('SAP_REJECT_UNAUTHORIZED', 'true');
        this.rejectUnauthorized = rejectVal !== 'false';
        if (!this.apiUrl || this.apiUrl.toLowerCase() === 'mock') {
            this.isMockMode = true;
            this.logger.warn('[SAP SERVICE] SAP_SERVICE_LAYER_URL is not set or set to "mock". Running in MOCK MODE.');
        }
    }
    onModuleInit() {
        if (!this.isMockMode && !this.rejectUnauthorized) {
            this.logger.warn('[SAP SERVICE] SSL Verification disabled globally for Node.js process (rejectUnauthorized = false).');
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
    }
    async login() {
        if (this.isMockMode) {
            return 'mock-session-cookie';
        }
        try {
            this.logger.log(`[SAP SERVICE] Authenticating with SAP Service Layer: ${this.apiUrl}/Login`);
            const response = await fetch(`${this.apiUrl.replace(/\/$/, '')}/Login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    CompanyDB: this.companyDb,
                    UserName: this.username,
                    Password: this.password,
                }),
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Authentication failed with status ${response.status}: ${errText}`);
            }
            const body = await response.json();
            const sessionId = body.SessionId;
            const setCookies = response.headers.get('set-cookie');
            if (setCookies) {
                this.sessionCookie = setCookies;
            }
            else if (sessionId) {
                this.sessionCookie = `B1SESSION=${sessionId}`;
            }
            else {
                throw new Error('No SessionId returned in Login response');
            }
            this.logger.log('[SAP SERVICE] Authenticated successfully. Session token cached.');
            return this.sessionCookie;
        }
        catch (err) {
            this.logger.error('[SAP SERVICE] Authentication error:', err);
            throw err;
        }
    }
    async getRequest(endpoint, attempt = 1) {
        if (this.isMockMode) {
            throw new Error('Mock mode enabled');
        }
        if (!this.sessionCookie) {
            await this.login();
        }
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.apiUrl.replace(/\/$/, '')}${cleanEndpoint}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Cookie': this.sessionCookie || '',
                    'Content-Type': 'application/json',
                },
            });
            if (response.status === 401 && attempt < 2) {
                this.logger.warn('[SAP SERVICE] Cached session unauthorized (401). Retrying with fresh login...');
                this.sessionCookie = null;
                return this.getRequest(endpoint, attempt + 1);
            }
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Request failed with status ${response.status}: ${text}`);
            }
            return await response.json();
        }
        catch (err) {
            this.logger.error(`[SAP SERVICE] HTTP Request to ${url} failed:`, err);
            throw err;
        }
    }
    async getProductionOrder(docNum) {
        if (this.isMockMode) {
            return this.getMockProductionOrder(docNum);
        }
        try {
            this.logger.log(`[SAP SERVICE] Fetching Production Order from SAP Service Layer: DocNum=${docNum}`);
            const result = await this.getRequest(`/ProductionOrders?$filter=DocumentNumber eq ${parseInt(docNum, 10)}&$select=DocumentNumber,ItemNo,ProductDescription,PlannedQuantity`);
            if (result && result.value && result.value.length > 0) {
                const po = result.value[0];
                this.logger.log(`[SAP SERVICE] Found Production Order: ${po.ItemNo} (${po.ProductDescription}), PlannedQty: ${po.PlannedQuantity}`);
                return {
                    itemCode: po.ItemNo,
                    itemName: po.ProductDescription || 'กระจกนิรภัยนำเข้าซีรีส์มาตรฐาน',
                    plannedQty: Math.max(1, Math.round(po.PlannedQuantity || 100)),
                };
            }
            this.logger.warn(`[SAP SERVICE] Production Order with DocNum=${docNum} not found in SAP B1. Falling back to Mock data.`);
            return this.getMockProductionOrder(docNum);
        }
        catch (err) {
            this.logger.error(`[SAP SERVICE] Failed to query Production Order ${docNum}. Falling back to Mock data.`, err);
            return this.getMockProductionOrder(docNum);
        }
    }
    getMockProductionOrder(docNum) {
        const defaultSuffix = docNum.substring(5, 9) || '205';
        return {
            itemCode: `FA00-D0112-200${defaultSuffix}`,
            itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9) || '007'} (Mock SAP B1)`,
            plannedQty: 120,
        };
    }
};
exports.SapService = SapService;
exports.SapService = SapService = SapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SapService);
//# sourceMappingURL=sap.service.js.map