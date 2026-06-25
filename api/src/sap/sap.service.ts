import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SapProductionOrderInfo {
  itemCode: string;
  itemName: string;
  plannedQty: number;
}

@Injectable()
export class SapService implements OnModuleInit {
  private readonly logger = new Logger(SapService.name);
  private apiUrl: string;
  private companyDb: string;
  private username: string;
  private password: string;
  private rejectUnauthorized: boolean;

  private sessionCookie: string | null = null;
  private isMockMode = false;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('SAP_SERVICE_LAYER_URL', '');
    this.companyDb = this.configService.get<string>('SAP_COMPANY_DB', '');
    this.username = this.configService.get<string>('SAP_USERNAME', '');
    this.password = this.configService.get<string>('SAP_PASSWORD', '');
    
    const rejectVal = this.configService.get<string>('SAP_REJECT_UNAUTHORIZED', 'true');
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

  /**
   * Log into SAP Service Layer and save the Session ID/Cookies.
   */
  private async login(): Promise<string> {
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
      } else if (sessionId) {
        this.sessionCookie = `B1SESSION=${sessionId}`;
      } else {
        throw new Error('No SessionId returned in Login response');
      }

      this.logger.log('[SAP SERVICE] Authenticated successfully. Session token cached.');
      return this.sessionCookie!;
    } catch (err) {
      this.logger.error('[SAP SERVICE] Authentication error:', err);
      throw err;
    }
  }

  /**
   * Helper to perform HTTP GET request with automatic login session injection and retry logic.
   */
  private async getRequest(endpoint: string, attempt = 1): Promise<any> {
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
    } catch (err) {
      this.logger.error(`[SAP SERVICE] HTTP Request to ${url} failed:`, err);
      throw err;
    }
  }

  /**
   * Fetches Production Order details for a given docNum.
   * Leverages mock fallback if SAP is unreachable.
   */
  async getProductionOrder(docNum: string): Promise<SapProductionOrderInfo> {
    if (this.isMockMode) {
      return this.getMockProductionOrder(docNum);
    }

    try {
      this.logger.log(`[SAP SERVICE] Fetching Production Order from SAP Service Layer: DocNum=${docNum}`);
      
      // Query Production Order by DocumentNumber
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
    } catch (err) {
      this.logger.error(`[SAP SERVICE] Failed to query Production Order ${docNum}. Falling back to Mock data.`, err);
      return this.getMockProductionOrder(docNum);
    }
  }

  private getMockProductionOrder(docNum: string): SapProductionOrderInfo {
    const defaultSuffix = docNum.substring(5, 9) || '205';
    return {
      itemCode: `FA00-D0112-200${defaultSuffix}`,
      itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9) || '007'} (Mock SAP B1)`,
      plannedQty: 120, // Mock default planned quantity in Lot
    };
  }
}
