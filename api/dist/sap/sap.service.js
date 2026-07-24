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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SapService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const system_setting_entity_1 = require("../backoffice/system-setting.entity");
let SapService = SapService_1 = class SapService {
    configService;
    systemSettingRepository;
    logger = new common_1.Logger(SapService_1.name);
    apiUrl;
    companyDb;
    username;
    password;
    rejectUnauthorized;
    sessionCookie = null;
    isMockMode = false;
    _lastCompanyDb = null;
    constructor(configService, systemSettingRepository) {
        this.configService = configService;
        this.systemSettingRepository = systemSettingRepository;
        this.apiUrl = this.configService.get('SAP_SERVICE_LAYER_URL', '');
        this.companyDb = this.configService.get('SAP_COMPANY_DB', '');
        this.username = this.configService.get('SAP_USERNAME', '');
        this.password = this.configService.get('SAP_PASSWORD', '');
        const rejectVal = this.configService.get('SAP_REJECT_UNAUTHORIZED', 'true');
        this.rejectUnauthorized = rejectVal !== 'false';
        if (!this.apiUrl || this.apiUrl.toLowerCase() === 'mock') {
            this.isMockMode = true;
        }
    }
    async initConfigs() {
        try {
            const urlSetting = await this.systemSettingRepository.findOne({ where: { key: 'SAP_SERVICE_LAYER_URL' } });
            const newUrl = urlSetting ? urlSetting.value : this.configService.get('SAP_SERVICE_LAYER_URL', '');
            const dbSetting = await this.systemSettingRepository.findOne({ where: { key: 'SAP_COMPANY_DB' } });
            const newDb = dbSetting ? dbSetting.value : this.configService.get('SAP_COMPANY_DB', '');
            const userSetting = await this.systemSettingRepository.findOne({ where: { key: 'SAP_USERNAME' } });
            this.username = userSetting ? userSetting.value : this.configService.get('SAP_USERNAME', '');
            const passSetting = await this.systemSettingRepository.findOne({ where: { key: 'SAP_PASSWORD' } });
            this.password = passSetting ? passSetting.value : this.configService.get('SAP_PASSWORD', '');
            if (this._lastCompanyDb !== null && (this._lastCompanyDb !== newDb || this.apiUrl !== newUrl)) {
                this.logger.warn(`[SAP SERVICE] Config changed (DB: ${this._lastCompanyDb} → ${newDb}). ` +
                    `Invalidating cached session to force re-login.`);
                this.sessionCookie = null;
            }
            this.apiUrl = newUrl;
            this.companyDb = newDb;
            this._lastCompanyDb = newDb;
            if (!this.apiUrl || this.apiUrl.toLowerCase() === 'mock') {
                this.isMockMode = true;
            }
            else {
                this.isMockMode = false;
            }
        }
        catch (e) {
            this.logger.warn('[SAP SERVICE] Failed to load dynamic configs, using defaults', e.message);
        }
    }
    onModuleInit() {
        if (!this.isMockMode && !this.rejectUnauthorized) {
            this.logger.warn('[SAP SERVICE] SSL Verification disabled globally for Node.js process (rejectUnauthorized = false).');
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
    }
    async login() {
        await this.initConfigs();
        if (this.isMockMode) {
            return 'mock-session-cookie';
        }
        try {
            this.logger.log(`[SAP SERVICE] Authenticating with SAP Service Layer: ${this.apiUrl}/Login ` +
                `[CompanyDB=${this.companyDb}, User=${this.username}]`);
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
        await this.initConfigs();
        if (this.isMockMode) {
            throw new Error('Mock mode enabled');
        }
        if (!this.sessionCookie) {
            await this.login();
        }
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.apiUrl.replace(/\/$/, '')}${cleanEndpoint}`;
        this.logger.log(`[SAP SERVICE] Requesting URL: ${url}`);
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
    getIsMockMode() {
        return this.isMockMode;
    }
    async getProductionOrder(docNum) {
        await this.initConfigs();
        if (this.isMockMode) {
            return this.getMockProductionOrder(docNum);
        }
        try {
            this.logger.log(`[SAP SERVICE] Fetching Production Order from SAP Service Layer: DocNum=${docNum}`);
            try {
                const sample = await this.getRequest('/ProductionOrders?$orderby=AbsoluteEntry desc&$top=20');
                if (sample?.value?.length > 0) {
                    this.logger.log(`[SAP DIAG] Successfully fetched ${sample.value.length} recent Production Orders:`);
                    const recordsSummary = sample.value.map((r) => `AbsEntry=${r.AbsoluteEntry}, DocNum=${r.DocumentNumber}, Series=${r.Series}, Item=${r.ItemNo}`).join(' | ');
                    this.logger.log(`[SAP DIAG] Recent Orders: ${recordsSummary}`);
                    const docNums = sample.value.map((r) => Number(r.DocumentNumber));
                    const maxDocNum = Math.max(...docNums);
                    const minDocNum = Math.min(...docNums);
                    this.logger.log(`[SAP DIAG] DocNum range in top 20: ${minDocNum} to ${maxDocNum}`);
                }
                else {
                    this.logger.warn('[SAP DIAG] ProductionOrders returned no records (empty collection).');
                }
            }
            catch (diagErr) {
                this.logger.warn(`[SAP DIAG] Could not fetch recent records: ${diagErr.message}`);
            }
            let result = null;
            let lastSapError = null;
            const numericVal = parseInt(docNum, 10);
            const isNumValid = !isNaN(numericVal);
            if (isNumValid) {
                try {
                    this.logger.log(`[SAP SERVICE] Try direct query: DocumentNumber eq ${numericVal}`);
                    const encodedFilter = encodeURIComponent(`DocumentNumber eq ${numericVal}`);
                    const attemptResult = await this.getRequest(`/ProductionOrders?$filter=${encodedFilter}`);
                    if (attemptResult?.value?.length > 0) {
                        result = attemptResult;
                        this.logger.log(`[SAP SERVICE] ✅ Found Production Order directly by DocumentNumber=${numericVal}`);
                    }
                }
                catch (err) {
                    const errBody = err.message || '';
                    this.logger.warn(`[SAP SERVICE] Direct lookup failed: ${errBody}. Activating smart fallback...`);
                    lastSapError = err;
                }
                if (!result) {
                    try {
                        this.logger.log(`[SAP SERVICE] Fallback: Initiating Hybrid Estimation Scan...`);
                        const page1 = await this.getRequest(`/ProductionOrders?$orderby=AbsoluteEntry desc&$top=20&$select=AbsoluteEntry,DocumentNumber`);
                        let match = null;
                        if (page1?.value && page1.value.length > 0) {
                            match = page1.value.find((r) => Number(r.DocumentNumber) === numericVal || String(r.DocumentNumber) === docNum);
                            if (match) {
                                this.logger.log(`[SAP SERVICE] ✅ Fallback: Found match immediately on page 1! AbsoluteEntry=${match.AbsoluteEntry}`);
                            }
                            else {
                                const maxAbs = Number(page1.value[0].AbsoluteEntry);
                                const latestDocNum = Number(page1.value[0].DocumentNumber);
                                if (!isNaN(maxAbs) && !isNaN(latestDocNum)) {
                                    const diff = latestDocNum - numericVal;
                                    if (diff > 0) {
                                        const estimatedSkip = Math.floor(diff / 20) * 20;
                                        const pageSize = 20;
                                        const skipsToTry = [
                                            Math.max(0, estimatedSkip - pageSize),
                                            estimatedSkip,
                                            estimatedSkip + pageSize
                                        ].filter((v, i, self) => self.indexOf(v) === i && v > 0);
                                        this.logger.log(`[SAP SERVICE] Fallback: Estimating target ${docNum} near skip=${estimatedSkip} (diff=${diff}). ` +
                                            `Querying skips in parallel: ${skipsToTry.join(', ')}...`);
                                        const promises = skipsToTry.map(skip => this.getRequest(`/ProductionOrders?$orderby=AbsoluteEntry desc&$top=${pageSize}&$skip=${skip}&$select=AbsoluteEntry,DocumentNumber`)
                                            .catch(err => {
                                            this.logger.warn(`[SAP SERVICE] Fallback estimation fetch failed at skip ${skip}: ${err.message}`);
                                            return { value: [] };
                                        }));
                                        const pageResults = await Promise.all(promises);
                                        const allOrders = pageResults.flatMap(r => r?.value || []);
                                        match = allOrders.find((r) => Number(r.DocumentNumber) === numericVal || String(r.DocumentNumber) === docNum);
                                        if (match) {
                                            this.logger.log(`[SAP SERVICE] ✅ Fallback: Found match in parallel estimation window! AbsoluteEntry=${match.AbsoluteEntry}`);
                                        }
                                    }
                                }
                            }
                        }
                        if (!match) {
                            this.logger.warn(`[SAP SERVICE] Fallback: Estimation missed. Falling back to sequential nextLink scan...`);
                            let endpoint = `/ProductionOrders?$orderby=AbsoluteEntry desc&$select=AbsoluteEntry,DocumentNumber`;
                            let pagesFetched = 0;
                            const maxPages = 40;
                            while (endpoint && pagesFetched < maxPages) {
                                this.logger.log(`[SAP SERVICE] Fallback: Fetching page ${pagesFetched + 1} sequentially...`);
                                const res = await this.getRequest(endpoint);
                                pagesFetched++;
                                if (res?.value && res.value.length > 0) {
                                    match = res.value.find((r) => Number(r.DocumentNumber) === numericVal || String(r.DocumentNumber) === docNum);
                                    if (match) {
                                        this.logger.log(`[SAP SERVICE] ✅ Fallback: Found match on sequential page ${pagesFetched}! AbsoluteEntry=${match.AbsoluteEntry}`);
                                        break;
                                    }
                                }
                                const nextLink = res?.['@odata.nextLink'] || res?.['odata.nextLink'] || res?.['__next'];
                                if (nextLink) {
                                    if (nextLink.includes('/b1s/v2/')) {
                                        endpoint = '/' + nextLink.split('/b1s/v2/')[1];
                                    }
                                    else if (nextLink.includes('/b1s/v1/')) {
                                        endpoint = '/' + nextLink.split('/b1s/v1/')[1];
                                    }
                                    else {
                                        endpoint = nextLink.startsWith('/') ? nextLink : '/' + nextLink;
                                    }
                                }
                                else {
                                    endpoint = null;
                                }
                            }
                        }
                        if (match) {
                            const fullRecord = await this.getRequest(`/ProductionOrders(${match.AbsoluteEntry})`);
                            if (fullRecord) {
                                result = { value: [fullRecord] };
                            }
                        }
                        else {
                            this.logger.warn(`[SAP SERVICE] Fallback: Search complete. No match found for DocNum=${docNum}`);
                        }
                    }
                    catch (fallbackErr) {
                        this.logger.error(`[SAP SERVICE] Hybrid estimation scan fallback failed: ${fallbackErr.message}`);
                    }
                }
            }
            else {
                this.logger.warn(`[SAP SERVICE] DocNum '${docNum}' is not a valid number. Cannot query SAP.`);
            }
            if (!result && lastSapError) {
                throw lastSapError;
            }
            if (result && result.value && result.value.length > 0) {
                const po = result.value[0];
                this.logger.log(`[SAP SERVICE] ✅ Found Production Order: DocNum=${po.DocumentNumber}, ` +
                    `Item=${po.ItemNo}, Qty=${po.PlannedQuantity}, Status=${po.ProductionOrderStatus}`);
                return {
                    itemCode: po.ItemNo || po.ItemCode,
                    itemName: po.ProductDescription || po.ProdName || 'กระจกนิรภัยนำเข้าซีรีส์มาตรฐาน',
                    plannedQty: Math.max(1, Math.round(po.PlannedQuantity || po.PlannedQty || 100)),
                    orderDate: po.PostingDate || po.PostDate || po.CreationDate || null,
                    startDate: po.StartDate || null,
                    status: po.ProductionOrderStatus || po.Status || null,
                    completedQty: Math.round(po.CompletedQuantity || po.CompletedQty || po.CmpltQty || 0),
                };
            }
            this.logger.warn(`[SAP SERVICE] Production Order with DocNum=${docNum} not found in SAP B1.`);
            return null;
        }
        catch (err) {
            this.logger.error(`[SAP SERVICE] Failed to query Production Order ${docNum}:`, err);
            throw err;
        }
    }
    getMockProductionOrder(docNum) {
        const defaultSuffix = docNum.substring(5, 9) || '205';
        return {
            itemCode: `FA00-D0112-200${defaultSuffix}`,
            itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9) || '007'} (Mock SAP B1)`,
            plannedQty: 120,
            orderDate: '2026-06-01',
            startDate: '2026-06-05',
            status: 'bposReleased',
            completedQty: 45,
        };
    }
};
exports.SapService = SapService;
exports.SapService = SapService = SapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(system_setting_entity_1.SystemSetting)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], SapService);
//# sourceMappingURL=sap.service.js.map