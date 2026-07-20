import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../backoffice/system-setting.entity';

export interface SapProductionOrderInfo {
  itemCode: string;
  itemName: string;
  plannedQty: number;
  orderDate?: string | null;
  startDate?: string | null;
  status?: string | null;
  completedQty?: number;
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
  private _lastCompanyDb: string | null = null; // Track DB changes to invalidate session

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
  ) {
    // Initial sync from env configs
    this.apiUrl = this.configService.get<string>('SAP_SERVICE_LAYER_URL', '');
    this.companyDb = this.configService.get<string>('SAP_COMPANY_DB', '');
    this.username = this.configService.get<string>('SAP_USERNAME', '');
    this.password = this.configService.get<string>('SAP_PASSWORD', '');
    
    const rejectVal = this.configService.get<string>('SAP_REJECT_UNAUTHORIZED', 'true');
    this.rejectUnauthorized = rejectVal !== 'false';

    if (!this.apiUrl || this.apiUrl.toLowerCase() === 'mock') {
      this.isMockMode = true;
    }
  }

  private async initConfigs() {
    try {
      const urlSetting = await this.systemSettingRepository.findOne({ where: { key: 'SAP_SERVICE_LAYER_URL' } });
      const newUrl = urlSetting ? urlSetting.value : this.configService.get<string>('SAP_SERVICE_LAYER_URL', '');

      const dbSetting = await this.systemSettingRepository.findOne({ where: { key: 'SAP_COMPANY_DB' } });
      const newDb = dbSetting ? dbSetting.value : this.configService.get<string>('SAP_COMPANY_DB', '');

      const userSetting = await this.systemSettingRepository.findOne({ where: { key: 'SAP_USERNAME' } });
      this.username = userSetting ? userSetting.value : this.configService.get<string>('SAP_USERNAME', '');

      const passSetting = await this.systemSettingRepository.findOne({ where: { key: 'SAP_PASSWORD' } });
      this.password = passSetting ? passSetting.value : this.configService.get<string>('SAP_PASSWORD', '');

      // Invalidate session if SAP URL or CompanyDB changed (forces re-login to new DB)
      if (this._lastCompanyDb !== null && (this._lastCompanyDb !== newDb || this.apiUrl !== newUrl)) {
        this.logger.warn(
          `[SAP SERVICE] Config changed (DB: ${this._lastCompanyDb} → ${newDb}). ` +
          `Invalidating cached session to force re-login.`
        );
        this.sessionCookie = null;
      }

      this.apiUrl = newUrl;
      this.companyDb = newDb;
      this._lastCompanyDb = newDb;

      if (!this.apiUrl || this.apiUrl.toLowerCase() === 'mock') {
        this.isMockMode = true;
      } else {
        this.isMockMode = false;
      }
    } catch (e) {
      this.logger.warn('[SAP SERVICE] Failed to load dynamic configs, using defaults', e.message);
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
    await this.initConfigs();
    if (this.isMockMode) {
      return 'mock-session-cookie';
    }

    try {
      this.logger.log(
        `[SAP SERVICE] Authenticating with SAP Service Layer: ${this.apiUrl}/Login ` +
        `[CompanyDB=${this.companyDb}, User=${this.username}]`
      );
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
    } catch (err) {
      this.logger.error(`[SAP SERVICE] HTTP Request to ${url} failed:`, err);
      throw err;
    }
  }

  getIsMockMode(): boolean {
    return this.isMockMode;
  }

  /**
   * Fetches Production Order details for a given docNum.
   * Leverages mock fallback if SAP is unreachable.
   */
  async getProductionOrder(docNum: string): Promise<SapProductionOrderInfo | null> {
    await this.initConfigs();
    if (this.isMockMode) {
      return this.getMockProductionOrder(docNum);
    }

    try {
      this.logger.log(`[SAP SERVICE] Fetching Production Order from SAP Service Layer: DocNum=${docNum}`);
      
      // ── DIAGNOSTIC: Fetch latest 20 records to inspect real DocumentNumbers in SBO_WA ──
      try {
        const sample = await this.getRequest('/ProductionOrders?$orderby=AbsoluteEntry desc&$top=20');
        if (sample?.value?.length > 0) {
          this.logger.log(`[SAP DIAG] Successfully fetched ${sample.value.length} recent Production Orders:`);
          const recordsSummary = sample.value.map((r: any) => 
            `AbsEntry=${r.AbsoluteEntry}, DocNum=${r.DocumentNumber}, Series=${r.Series}, Item=${r.ItemNo}`
          ).join(' | ');
          this.logger.log(`[SAP DIAG] Recent Orders: ${recordsSummary}`);
          
          // Let's also check if 260702217 is in this set, or what the max/min DocNums look like
          const docNums = sample.value.map((r: any) => Number(r.DocumentNumber));
          const maxDocNum = Math.max(...docNums);
          const minDocNum = Math.min(...docNums);
          this.logger.log(`[SAP DIAG] DocNum range in top 20: ${minDocNum} to ${maxDocNum}`);
        } else {
          this.logger.warn('[SAP DIAG] ProductionOrders returned no records (empty collection).');
        }
      } catch (diagErr) {
        this.logger.warn(`[SAP DIAG] Could not fetch recent records: ${diagErr.message}`);
      }
      // ────────────────────────────────────────────────────────────────────────

      let result: any = null;
      let lastSapError: any = null;
      const numericVal = parseInt(docNum, 10);
      const isNumValid = !isNaN(numericVal);

      if (isNumValid) {
        // Step 1: Try direct exact match query by DocumentNumber
        try {
          this.logger.log(`[SAP SERVICE] Try direct query: DocumentNumber eq ${numericVal}`);
          const encodedFilter = encodeURIComponent(`DocumentNumber eq ${numericVal}`);
          const attemptResult = await this.getRequest(`/ProductionOrders?$filter=${encodedFilter}`);
          if (attemptResult?.value?.length > 0) {
            result = attemptResult;
            this.logger.log(`[SAP SERVICE] ✅ Found Production Order directly by DocumentNumber=${numericVal}`);
          }
        } catch (err) {
          const errBody = err.message || '';
          this.logger.warn(`[SAP SERVICE] Direct lookup failed: ${errBody}. Activating smart fallback...`);
          lastSapError = err;
        }

        // Step 2: Smart Fallback (Hybrid Estimation Scan - maximum speed)
        // If direct filter throws error 205, we do a mathematically assisted search:
        // We get the latest record, estimate target position, query a tiny 3-page window in parallel,
        // and fall back to sequential scanning only if the estimate was way off.
        if (!result) {
          try {
            this.logger.log(`[SAP SERVICE] Fallback: Initiating Hybrid Estimation Scan...`);
            
            // 1. Fetch page 1 to find the latest DocNum and verify if the target is already on page 1
            const page1 = await this.getRequest(`/ProductionOrders?$orderby=AbsoluteEntry desc&$top=20&$select=AbsoluteEntry,DocumentNumber`);
            let match: any = null;
            
            if (page1?.value && page1.value.length > 0) {
              match = page1.value.find((r: any) => 
                Number(r.DocumentNumber) === numericVal || String(r.DocumentNumber) === docNum
              );
              
              if (match) {
                this.logger.log(`[SAP SERVICE] ✅ Fallback: Found match immediately on page 1! AbsoluteEntry=${match.AbsoluteEntry}`);
              } else {
                // Target is not on page 1. Calculate estimated skip position
                const maxAbs = Number(page1.value[0].AbsoluteEntry);
                const latestDocNum = Number(page1.value[0].DocumentNumber);
                
                if (!isNaN(maxAbs) && !isNaN(latestDocNum)) {
                  const diff = latestDocNum - numericVal;
                  if (diff > 0) {
                    const estimatedSkip = Math.floor(diff / 20) * 20;
                    
                    // We query a 3-page window around the estimation in parallel (extremely fast, safe socket usage)
                    const pageSize = 20;
                    const skipsToTry = [
                      Math.max(0, estimatedSkip - pageSize),
                      estimatedSkip,
                      estimatedSkip + pageSize
                    ].filter((v, i, self) => self.indexOf(v) === i && v > 0); // unique, positive skips
                    
                    this.logger.log(
                      `[SAP SERVICE] Fallback: Estimating target ${docNum} near skip=${estimatedSkip} (diff=${diff}). ` +
                      `Querying skips in parallel: ${skipsToTry.join(', ')}...`
                    );
                    
                    const promises: Promise<any>[] = skipsToTry.map(skip => 
                      this.getRequest(`/ProductionOrders?$orderby=AbsoluteEntry desc&$top=${pageSize}&$skip=${skip}&$select=AbsoluteEntry,DocumentNumber`)
                        .catch(err => {
                          this.logger.warn(`[SAP SERVICE] Fallback estimation fetch failed at skip ${skip}: ${err.message}`);
                          return { value: [] };
                        })
                    );
                    
                    const pageResults = await Promise.all(promises);
                    const allOrders = pageResults.flatMap(r => r?.value || []);
                    
                    match = allOrders.find((r: any) => 
                      Number(r.DocumentNumber) === numericVal || String(r.DocumentNumber) === docNum
                    );
                    
                    if (match) {
                      this.logger.log(`[SAP SERVICE] ✅ Fallback: Found match in parallel estimation window! AbsoluteEntry=${match.AbsoluteEntry}`);
                    }
                  }
                }
              }
            }
            
            // 2. Sequential fallback scanner (Only runs if the mathematical estimation failed due to massive series gaps)
            if (!match) {
              this.logger.warn(`[SAP SERVICE] Fallback: Estimation missed. Falling back to sequential nextLink scan...`);
              let endpoint: string | null = `/ProductionOrders?$orderby=AbsoluteEntry desc&$select=AbsoluteEntry,DocumentNumber`;
              let pagesFetched = 0;
              const maxPages = 40;
              
              while (endpoint && pagesFetched < maxPages) {
                this.logger.log(`[SAP SERVICE] Fallback: Fetching page ${pagesFetched + 1} sequentially...`);
                const res = await this.getRequest(endpoint);
                pagesFetched++;
                
                if (res?.value && res.value.length > 0) {
                  match = res.value.find((r: any) => 
                    Number(r.DocumentNumber) === numericVal || String(r.DocumentNumber) === docNum
                  );
                  
                  if (match) {
                    this.logger.log(`[SAP SERVICE] ✅ Fallback: Found match on sequential page ${pagesFetched}! AbsoluteEntry=${match.AbsoluteEntry}`);
                    break;
                  }
                }
                
                const nextLink = res?.['@odata.nextLink'] || res?.['odata.nextLink'] || res?.['__next'];
                if (nextLink) {
                  if (nextLink.includes('/b1s/v2/')) {
                    endpoint = '/' + nextLink.split('/b1s/v2/')[1];
                  } else if (nextLink.includes('/b1s/v1/')) {
                    endpoint = '/' + nextLink.split('/b1s/v1/')[1];
                  } else {
                    endpoint = nextLink.startsWith('/') ? nextLink : '/' + nextLink;
                  }
                } else {
                  endpoint = null;
                }
              }
            }
            
            if (match) {
              // Fetch the full record details directly by primary key
              const fullRecord = await this.getRequest(`/ProductionOrders(${match.AbsoluteEntry})`);
              if (fullRecord) {
                result = { value: [fullRecord] };
              }
            } else {
              this.logger.warn(`[SAP SERVICE] Fallback: Search complete. No match found for DocNum=${docNum}`);
            }
          } catch (fallbackErr) {
            this.logger.error(`[SAP SERVICE] Hybrid estimation scan fallback failed: ${fallbackErr.message}`);
          }
        }
      } else {
        this.logger.warn(`[SAP SERVICE] DocNum '${docNum}' is not a valid number. Cannot query SAP.`);
      }

      // If both standard filter and fallback failed, report the error
      if (!result && lastSapError) {
        throw lastSapError;
      }

      if (result && result.value && result.value.length > 0) {
        const po = result.value[0];

        // Confirmed OData field names from SAP DIAG:
        // ItemNo, ProductDescription, PlannedQuantity, CompletedQuantity, PostingDate, StartDate, ProductionOrderStatus
        this.logger.log(
          `[SAP SERVICE] ✅ Found Production Order: DocNum=${po.DocumentNumber}, ` +
          `Item=${po.ItemNo}, Qty=${po.PlannedQuantity}, Status=${po.ProductionOrderStatus}`
        );
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
    } catch (err) {
      this.logger.error(`[SAP SERVICE] Failed to query Production Order ${docNum}:`, err);
      throw err;
    }
  }

  private getMockProductionOrder(docNum: string): SapProductionOrderInfo {
    const defaultSuffix = docNum.substring(5, 9) || '205';
    return {
      itemCode: `FA00-D0112-200${defaultSuffix}`,
      itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9) || '007'} (Mock SAP B1)`,
      plannedQty: 120, // Mock default planned quantity in Lot
      orderDate: '2026-06-01',
      startDate: '2026-06-05',
      status: 'bposReleased',
      completedQty: 45,
    };
  }
}
