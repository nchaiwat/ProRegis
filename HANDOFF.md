# ProRegis — Engineering Handoff Document (HANDOFF.md)

**อัปเดตล่าสุด:** 27 พฤศจิกายน 2026  
**สถานะระบบ:** Production Ready (Full Compliance with Central IAM Standard Specification v2.15.0)  
**Latest Feature Commit:** `2e8fa69c` (pushed to `origin/main` — พร้อมให้ USER สั่ง Deploy บน VPS Production)  
**สถาปัตยกรรมหลัก (Architecture Mode):** **Mode A: Cloud Two-Way (Full Two-Way Integration)** พร้อมกลไกเสริม **Mode C (Outbound Reverse Heartbeat 120s & Instant Sync)**  
**ขอบเขตงาน:** ระบบหลังบ้าน (Backoffice) — Enterprise Central IAM Integration (v2.15.0), Configurable Per-App Idle Session Timeout (หมวด H), Mandatory Audit Transaction IP Logging, In-App Bot Defense 3 ชั้น, บังคับเปลี่ยนรหัสผ่านทุก 90 วัน (Local Password Policy), AI Copilot DLP & Zero-Training, True 2-Way Sync & ISO 27001 Audit Logs

---

## 1. กฎเหล็กในการพัฒนาและ Deploy (Critical Golden Rules)

> **⚠️ กฎสำคัญที่สุด:**
> 1. **Local Automated Testing & Autonomous Git Push:**
>    - ผู้พัฒนา/AI ต้องทำการทดสอบบนเครื่อง Local ให้ผ่าน 100% ทุกครั้งก่อน Push:
>      - Unit Tests: `npm --prefix api run test`
>      - Backend Build: `npm --prefix api run build`
>      - Frontend Build: `npm --prefix web run build`
>    - เมื่อผ่านทั้งหมดแล้ว AI สามารถดำเนินการ `git add .`, `git commit` และ `git push origin main` ได้ทันที
> 2. **VPS Execution โดย USER เท่านั้น:**
>    - USER จะเป็นผู้สั่งการรันคำสั่งบนเซิร์ฟเวอร์ VPS Production เท่านั้น:
>      ```bash
>      cd /var/www/Proregis
>      git pull origin main
>      docker compose up -d --build
>      ```
>    - **ห้ามรัน `docker-compose.local.yml` บน VPS เด็ดขาด** (VPS ใช้ Traefik Reverse Proxy บน `root_default` network)
> 3. **Zero `.env` Dependency:**
>    - **ห้ามแก้ไฟล์ `api/.env`** เพื่อใส่ค่าคอนฟิก Central IAM, AI Copilot หรือ Session/Idle Timeout — ค่าคอนฟิกทั้งหมดต้องเก็บในตาราง `system_settings` เพื่อเปลี่ยนได้แบบ Real-time โดยไม่ต้อง Rebuild Container และไม่เกิด Merge Conflict บน VPS
> 4. **ขอบเขตการทำงาน (Customer vs Backoffice Boundary):**
>    - **Customer Flow (`/`, `/p/[token]`, `/my-warranty`):** สำหรับลูกค้าลงทะเบียนรับประกันสินค้าผ่านมือถือ (OTP SMS / LINE / Profile & OTP Session Storage) **ห้ามแตะต้องหรือนำระบบ Central IAM SSO หรือ Idle Timeout ไปปะปนโดยเด็ดขาด**
>    - **Backoffice Flow (`/backoffice/*`, `/auth/*`):** สำหรับผู้ดูแลระบบและพนักงาน Window Asia เท่านั้น ใช้ระบบ Central IAM SSO (v2.15.0) ควบคู่กับ Local DB และ Active Directory (AD)

---

## 2. สรุปการส่งมอบล่าสุด (Latest Release Summary: v2.15.0)

การอัปเกรดจากมาตรฐาน Central IAM **v2.13.0 &rarr; v2.15.0** (Commit `2e8fa69c`) ดำเนินการและผ่านการทดสอบบนเครื่อง Local ครบ 100% แล้ว:
- **Configurable Per-App Idle Session Timeout (หมวด H):**
  - เพิ่มการตั้งค่า `ciam_idle_timeout_minutes` (default `30` นาที, ปรับอิสระ `1–1440` นาที) และ `ciam_idle_warning_seconds` (default `60` วินาที) ในหน้า Settings (`/backoffice/settings`) รวมถึงซิงก์ค่า `idle_timeout_minutes` อัตโนมัติจาก CIAM Heartbeat
  - ฝั่ง Frontend: [`useIdleTimeout.ts`](file:///d:/Python/ProRegis/web/src/app/backoffice/useIdleTimeout.ts) (throttled activity listener + cross-tab sync) และ [`IdleTimeoutModal.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/IdleTimeoutModal.tsx) แสดงนับถอยหลัง 60 วินาทีพร้อมปุ่ม `"ขยายเวลาใช้งาน"`
  - ฝั่ง Backend: Sliding Inactivity Guard ใน [`jwt-auth.guard.ts`](file:///d:/Python/ProRegis/api/src/auth/jwt-auth.guard.ts) ส่ง Header `X-Session-Expired: idle_timeout` + `HTTP 401` + บันทึก Audit Event `TO-01` พร้อม Endpoint `POST /auth/session/ping` และ `POST /auth/logout`
- **Mandatory Audit Trail Transaction IP Logging:**
  - เพิ่มคอลัมน์ `ip_address VARCHAR(50) NOT NULL DEFAULT '127.0.0.1 (SYSTEM)'` และ Index `idx_trans_logs_ip` ใน `transaction_logs`
  - เพิ่ม `normalizeAuditIp()` ใน [`audit.service.ts`](file:///d:/Python/ProRegis/api/src/audit/audit.service.ts) บันทึก IP จริง (หรือ `'127.0.0.1 (SYSTEM)'` สำหรับ Background Job) ครบทุก Event พร้อมแสดงคอลัมน์ `IP Address` บนหน้า `/backoffice/logs`
- **AI Copilot & Bot Defense & Admin Guard Hardening:**
  - แนบ `ZERO_TRAINING_PRIVACY_HEADERS`, `"store": false`, `sanitizeContextForPrivacy()` (DLP Scrubber), Read-Only Policy Guard และ RBAC Context Filtering ใน [`ciam.service.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.service.ts) รวมถึง `JwtAuthGuard` บน `GET /settings/ai`
  - เสริม [`bot-defense.ts`](file:///d:/Python/ProRegis/api/src/auth/bot-defense.ts): รองรับ `CF-Connecting-IP`, ตัด `::ffff:`, ส่ง Header `Retry-After`, บันทึก Audit Log (`IP_RATE_LIMITED`, `BOT_HONEYPOT_DETECTED`, `BOT_TIMING_VIOLATION`) และติด Layer 1 Rate Limit ที่ `POST /auth/sso/callback`
  - ป้องกันการระงับสิทธิ์บัญชี `SYSTEM_ADMIN` คนสุดท้ายที่ยัง Active อยู่
- **Verification Status (Local):** `npm --prefix api run test` (14/14 tests passed), `npm --prefix api run build` (OK), `npm --prefix web run build` (OK, 20 routes) — **รอ USER รัน Deploy บน VPS Production (`cd /var/www/Proregis && git pull origin main && docker compose up -d --build`)**

---

## 3. ภาพรวมมาตรฐาน Central IAM Integration (v2.15.0) ครบทั้ง 8 หมวด (Groups A–H)

### 3.1 ตารางสรุปความสอดคล้องรายหมวด (Groups A–H)

| หมวด | รายละเอียดและกลไกการทำงาน | Endpoints & ไฟล์หลักที่รับผิดชอบ |
|---|---|---|
| **Group A: Settings Channel** | • ดึงและแก้ไขคอนฟิก Central IAM แบบ Real-time จาก DB (Zero `.env` Dependency)<br>• Masking รหัสลับ `ciam_client_secret` และ `ciam_m2m_key` ไม่ส่งคืนค่าเต็มผ่าน GET API<br>• ทดสอบการเชื่อมต่อ OIDC Discovery & Asymmetric JWKS Keys จากเซิร์ฟเวอร์ | `GET /api/settings/ciam-sso`<br>`PUT /api/settings/ciam-sso`<br>`POST /api/settings/ciam-sso/test-connection` |
| **Group B: SSO Execution Flow** | • OIDC Authorization Code Flow with PKCE (`S256`) และ Asymmetric RS256 Signature Verification ผ่าน JWKS<br>• **Framework Version Handshake:** ส่ง `"framework_version": "2.15.0"` และค่า `idle_timeout_minutes`, `idle_warning_seconds`, `session_ttl_minutes` ใน `GET /api/auth/sso/config`<br>• Just-In-Time (JIT) Auto-Provisioning สิทธิ์เริ่มต้น `IMAGE_EDITOR` (Least Privilege)<br>• **SSO Inactive Guard (`SSO-04`):** ปฏิเสธการล็อกอินทันทีหากบัญชีในระบบลูกถูกระงับสิทธิ์ (`is_active: false`) แม้จะถือ Token ที่ถูกต้องจาก CIAM<br>• สวิตช์ฉุกเฉิน Break-Glass พร้อมแจ้งเตือน Telegram ผู้บริหารไอที | `GET /api/auth/sso/config`<br>`GET /api/auth/sso/login` & `/start`<br>`POST /api/auth/sso/authorize-url`<br>`POST /api/auth/sso/callback`<br>`POST /api/auth/sso/break-glass-toggle` |
| **Group C: Inbound Directory (Mode A)** | • M2M Directory Governance ตรวจสอบ `X-Management-API-Key`, IP Whitelist (`157.173.219.153` ฯลฯ) และ Replay Timestamp (5 นาที)<br>• ลำดับการอ่าน IP Headers: `x-ciam-origin-ip` &rarr; `x-origin-ip` &rarr; `cf-connecting-ip` &rarr; `x-forwarded-for`<br>• **Framework Version Handshake:** ส่ง `"framework_version": "2.15.0"` ใน Root JSON และ Header `X-CIAM-Framework-Version: 2.15.0`<br>• **Local Account Password Provisioning:** รับ `password` และ `must_change_password` สำหรับ Local Account (`use_ad_auth: false`) แล้ว Hash ด้วย `bcrypt` ลง DB ทันที<br>• รองรับ Fallback Path `/api/directory/accounts` และ Daily Auto-Reconciliation 04:00 น.<br>• 1-Click Offboard/Reactivate ยกเลิก Session ทันที พร้อม Protected Local Admin & Last `SYSTEM_ADMIN` Guard | `GET /api/v1/directory/accounts`<br>`POST /api/v1/directory/accounts`<br>`PATCH /api/v1/directory/accounts/:username/status` |
| **Group D: Outbound Agent & True 2-Way Sync (Mode C)** | • Reverse Heartbeat Background Worker ยิง Outbound HTTPS 443 ไปยัง CIAM ทุก 120 วินาที พร้อม `"framework_version": "2.15.0"` และรับค่า `idle_timeout_minutes` จาก CIAM อัตโนมัติ<br>• **True 2-Way Status Sync:** ส่ง Payload `accounts` ระบุ `status_origin: 'SPOKE_APP'`, `status_updated_at`<br>• **Timestamp Reconciliation & Authority Lock:** เปรียบเทียบเวลาแก้ไขล่าสุด และเคารพการล็อคสิทธิ์ (`is_status_locked`) จาก CIAM<br>• รองรับคำสั่ง `PROVISION_USER`, `DISABLE_USER`, `ENABLE_USER`, `REQUEST_FULL_SYNC`<br>• ปุ่ม `[ ⚡ ซิงก์บัญชีผู้ใช้กับ CIAM ทันที ]` บนหน้า Settings | `POST /api/settings/ciam-agent/sync-now`<br>[`api/src/ciam/ciam.service.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.service.ts)<br>[`ciam_agent.py`](file:///d:/Python/ProRegis/ciam_agent.py) |
| **Group E: In-App AI Copilot & MCP Tools** | • ผู้ช่วย AI ประจำระบบหลังบ้าน รองรับ Google Gemini, OpenAI, Anthropic, Ollama<br>• Zero-Training DLP Headers (`X-No-Model-Training: true`, `X-Data-Retention: none`, `X-OpenAI-Data-Usage-Opt-Out: true`, `store: false`), `sanitizeContextForPrivacy()`, Read-Only Policy Guard และ RBAC Context Filtering ตาม Role ผู้ใช้<br>• ซ่อน Chat Widget อัตโนมัติเมื่อปิดใช้งาน | `GET /api/settings/ai`<br>`PUT /api/settings/ai`<br>`POST /api/settings/ai/test`<br>`POST /api/ai/chat`<br>[`web/src/app/backoffice/SpokeCopilotWidget.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/SpokeCopilotWidget.tsx) |
| **Group F: In-App Bot Defense 3 ชั้น (v2.10.0 / v2.15.0)** | • **Layer 1 (IP Rate Limiting):** Sliding-Window 10 requests / 60 วินาที ต่อ IP (รวมถึง `/auth/sso/callback`) พร้อม HTTP Header `Retry-After`, รองรับ `CF-Connecting-IP` และ Corporate IP Whitelist<br>• **Layer 2 (Decoy Honeypot Trap):** ฟิลด์หลอก `corporate_fax` และ `security_honey` ซ่อนจากมนุษย์ด้วย CSS `left: -9999px` และ `tabIndex={-1}` หากมีบอทกรอกเข้ามาจะ Reject ทันทีด้วย HTTP 401<br>• **Layer 3 (Submission Velocity Guard):** ตรวจจับเวลาส่งฟอร์มด้วย `form_render_ts` หากเร็วกว่า 400ms (< 0.4 วินาที) Reject ทันทีด้วย HTTP 400<br>• บันทึก Audit Log (`IP_RATE_LIMITED`, `BOT_HONEYPOT_DETECTED`, `BOT_TIMING_VIOLATION`) ครบทุกเหตุการณ์ | [`api/src/auth/bot-defense.ts`](file:///d:/Python/ProRegis/api/src/auth/bot-defense.ts)<br>`POST /auth/login`<br>[`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx) |
| **Group G: Local Password Policy & 90-Day Rotation (v2.12.0)** | • **90-Day Forced Rotation:** ตาราง `users` เพิ่มฟิลด์ `password_changed_at` และ `must_change_password`<br>• **Password Complexity (6 ข้อ):** ความยาว 8–16 ตัวอักษร, พิมพ์ใหญ่ (A-Z) &ge; 1, พิมพ์เล็ก (a-z) &ge; 1, ตัวเลข (0-9) &ge; 1, อักขระพิเศษ &ge; 1, และห้ามมี Username อยู่ในรหัสผ่าน<br>• **Forced Interception Modal:** บล็อกหน้าจอไม่ให้กดข้ามหรือเข้าเมนูใดๆ จนกว่าจะเปลี่ยนรหัสผ่านใหม่สำเร็จ | [`api/src/users/user.entity.ts`](file:///d:/Python/ProRegis/api/src/users/user.entity.ts)<br>`POST /auth/local/change-password`<br>[`web/src/app/backoffice/ForcedPasswordChangeModal.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/ForcedPasswordChangeModal.tsx)<br>[`web/src/app/backoffice/layout.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/layout.tsx) |
| **Group H: Configurable Idle Session Timeout & Audit IP (v2.15.0)** | • **Dynamic Idle Timeout (`ciam_idle_timeout_minutes` / `ciam_idle_warning_seconds`):** ตั้งค่าได้อิสระจากหน้า Settings หรือรับจาก CIAM Heartbeat (ค่าเริ่มต้น 30 นาที / แจ้งเตือนล่วงหน้า 60 วินาที)<br>• **Frontend Hook & Countdown Modal:** ดัก User Activity แบบ throttled พร้อมซิงก์ข้ามแท็บ และแสดง Countdown Modal พร้อมปุ่ม `"ขยายเวลาใช้งาน"`<br>• **Backend Sliding Guard (`JwtAuthGuard`):** ตรวจ `last_seen_at` ทุก API Request และส่ง Header `X-Session-Expired: idle_timeout` + `HTTP 401` เมื่อหมดเวลา<br>• **Mandatory Audit IP (`transaction_logs.ip_address NOT NULL` + `idx_trans_logs_ip`):** บันทึก Client IP จริงหรือ `'127.0.0.1 (SYSTEM)'` ในทุก Event (`SSO-01..04`, `BG-01..02`, `CFG-01`, `TO-01`) | [`api/src/auth/jwt-auth.guard.ts`](file:///d:/Python/ProRegis/api/src/auth/jwt-auth.guard.ts)<br>`POST /auth/session/ping`<br>`POST /auth/logout`<br>[`web/src/app/backoffice/useIdleTimeout.ts`](file:///d:/Python/ProRegis/web/src/app/backoffice/useIdleTimeout.ts)<br>[`web/src/app/backoffice/IdleTimeoutModal.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/IdleTimeoutModal.tsx)<br>[`api/src/audit/transaction-log.entity.ts`](file:///d:/Python/ProRegis/api/src/audit/transaction-log.entity.ts) |

### 3.2 การทำงานของ 1-Click Seamless SSO & Idle Timeout Redirect
1. **เข้าสู่ระบบจาก CIAM Portal (`https://ciam.windowasia.com/portal`):**
   - เมื่อผู้ใช้คลิกการ์ด ProRegis (ชี้มาที่ `/backoffice`, `/backoffice/dashboard`, `/auth/start`, `/backoffice/auth/start` หรือ `/api/auth/sso/login`) หน้า [`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx) จะเรียก `handleCiamSso()` อัตโนมัติเมื่อ `sso_enabled == true && !break_glass_active`
   - หาก CIAM ส่ง `?code=...` เข้ามาที่ `/backoffice` ระบบจะส่งต่อไปยัง `/auth/callback` เพื่อแลก Token ทันที
2. **เมื่อเซสชันหมดเวลาเนื่องจาก Idle Timeout (`?reason=idle_timeout`):**
   - Frontend และ Backend (`X-Session-Expired: idle_timeout`) จะล้าง Session ของ ProRegis แล้ว Redirect มายัง `/backoffice?reason=idle_timeout&redirect_uri=...`
   - หน้า Login จะ **หยุด Auto-SSO ชั่วคราวในรอบนั้น** และแสดงแบนเนอร์แจ้งเตือนสีเหลืองให้ผู้ใช้รับทราบเหตุผล แล้วเลือกกดเข้าด้วย SSO หรือ Local Login ต่อได้ทันที (หลังล็อกอินสำเร็จจะกลับไปยัง `redirect_uri` เดิมหากขึ้นต้นด้วย `/backoffice/`)
3. **การออกจากระบบ (Seamless Return to Portal):**
   - เมื่อผู้ใช้ที่ล็อกอินผ่าน SSO กด **"ออกจากระบบ"** ใน [`web/src/app/backoffice/layout.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/layout.tsx) ระบบจะล้าง Session ของ ProRegis แล้วพากลับไปยัง `https://ciam.windowasia.com/portal`
4. **การล็อกอินด้วย Local DB / AD โดยตรง:**
   - เข้าผ่าน `/backoffice?local=1` หรือเมื่อ Logout จากบัญชี Local ระบบจะตั้งค่า `bo_manual_login = "1"` เพื่อเปิดฟอร์ม Login ปกติค้างไว้

### 3.3 การจัดการ One-Way AD และ Local Account (Matrix 4 กรณี)

| กรณี | แหล่งสร้างบัญชี | ค่า `isAdAuth` / `use_ad_auth` | รหัสผ่านที่ใช้ Login | พฤติกรรมการยืนยันตัวตน |
|---|---|:---:|---|---|
| **กรณีที่ 1** | มอบสิทธิ์จาก CIAM (พนักงาน AD) | `true` | รหัสผ่าน Windows/AD (`wa.net`) | เข้าผ่านปุ่ม SSO หรือ Portal Launch 100% |
| **กรณีที่ 2** | สร้าง Local Account จาก CIAM | `false` | รหัสผ่านเริ่มต้นที่ CIAM ส่งมา | เข้าผ่าน SSO ได้ และเข้าตรงผ่านฟอร์ม Local หน้าเว็บ ProRegis ได้ทันที (Hash ลง DB แล้ว) |
| **กรณีที่ 3** | สร้างบน ProRegis ติ๊ก AD | `true` | รหัสผ่าน Windows/AD (`wa.net`) | ซิงก์ขึ้น CIAM และจับคู่ตัวตน AD ให้อัตโนมัติ |
| **กรณีที่ 4** | สร้างบน ProRegis เป็น Local | `false` | รหัสผ่านที่ตั้งใน ProRegis | Login ตรงบน ProRegis หรือกดอนุมัติเป็น Portal Account บน CIAM |

### 3.4 คีย์การตั้งค่า Central IAM & AI ในตาราง `system_settings`
- **หมวด `central_iam`:** `ciam_base_url`, `ciam_client_id`, `ciam_client_secret`, `ciam_m2m_key`, `ciam_sso_enabled`, `ciam_break_glass_active`, `ciam_ad_gateway_url`, `ciam_auto_provision_group` (`IMAGE_EDITOR`), `ciam_session_ttl_minutes` (`480`), `ciam_idle_timeout_minutes` (`30`), `ciam_idle_warning_seconds` (`60`)
- **หมวด `ai_copilot`:** `ai_copilot_enabled`, `ai_provider`, `ai_model`, `ai_api_key`, `ai_base_url`, `ai_system_prompt`, `ai_allow_mcp_tools`

---

## 4. ข้อควรระวังทางสถาปัตยกรรมสำหรับรอบพัฒนาถัดไป (Critical Architecture & Pitfalls)

> **⚠️ อ่านส่วนนี้ก่อนแก้ไข Guard, Database Entity, CORS หรือ Login Flow:**

1. **ห้ามฉีด Dependencies เข้า Constructor ของ `JwtAuthGuard`:**
   - `JwtAuthGuard` ถูกนำไปใช้ผ่าน `@UseGuards(JwtAuthGuard)` ในหลาย Module (`AuthModule`, `BackofficeModule`, `CiamModule`, `CrmModule`, `UsersModule`) ที่ไม่ได้ import `AuditModule` หรือ `CiamModule` ทั้งหมด
   - หากเพิ่ม constructor dependency ใน `JwtAuthGuard` จะเกิด NestJS DI startup crash (`Nest can't resolve dependencies`) ทันที
   - **Pattern ที่ถูกต้อง:** ใช้ Module-level state/callbacks (`setIdleTimeoutMinutes`, `setIdleTimeoutAuditHandler`, `revokedUserTimestamps`) และเชื่อมจาก `CiamService.onModuleInit()` เท่านั้น
2. **TypeORM `synchronize: true` Safety บนฐานข้อมูล VPS Production:**
   - ห้ามเปลี่ยนชนิด Primary Key หรือคอลัมน์เดิมของตารางที่มีข้อมูลบน VPS (เช่น `system_settings.key` ต้องเป็น `varchar`, `system_settings.value` ต้องเป็น `varchar`)
   - ทุกคอลัมน์ใหม่ที่เป็น `NOT NULL` บนตารางเดิมที่มีข้อมูลอยู่แล้ว (เช่น `transaction_logs.ip_address`) **ต้องมี `default` เสมอ** มิฉะนั้น TypeORM `ALTER TABLE ... ADD COLUMN NOT NULL` จะล้มเหลวและทำให้ API container ไม่สตาร์ท
3. **CORS `exposedHeaders` ใน `api/src/main.ts`:**
   - ต้องคง `exposedHeaders: ['X-Session-Expired', 'Retry-After', 'X-CIAM-Framework-Version']` ไว้ใน `app.enableCors(...)` เพื่อให้ Frontend สามารถอ่าน `res.headers.get('X-Session-Expired')` และ `Retry-After` ข้าม Origin ได้
4. **ป้องกัน Auto-SSO Redirect Loop เมื่อเกิด Idle Timeout:**
   - ใน `web/src/app/backoffice/page.tsx` เมื่อมี Query `?reason=idle_timeout` ห้ามปล่อยให้ `handleCiamSso()` ทำงานอัตโนมัติ มิฉะนั้นถ้าเซสชัน CIAM บนเบราว์เซอร์ยังอยู่ ผู้ใช้จะถูกเด้งกลับเข้าระบบทันทีโดยไม่เห็นข้อความแจ้งเตือน Idle Timeout
5. **SSO Callback ใช้เฉพาะ Rate Limit Layer 1 (`evaluateRateLimitOnly`):**
   - ห้ามนำ Honeypot หรือ Timing Guard (`evaluateBotDefense`) ไปติดที่ `POST /auth/sso/callback` เพราะการ Redirect กลับจาก OIDC ไม่มีฟิลด์ฟอร์ม `corporate_fax` / `form_render_ts`
6. **`GET /settings/ai` ต้องผ่าน `JwtAuthGuard` และแยกข้อมูลตาม Role:**
   - ผู้ใช้ที่ไม่ใช่ `SYSTEM_ADMIN` จะได้รับเฉพาะ `{ enabled, provider, has_api_key }` เพื่อให้ [`SpokeCopilotWidget.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/SpokeCopilotWidget.tsx) ทำงานได้โดยไม่เปิดเผย `api_key_masked`, `base_url` หรือ `system_prompt`

---

## 5. รายการไฟล์สำคัญในระบบ (Key Files Reference)

### Backend (`api/`)
- [`api/src/main.ts`](file:///d:/Python/ProRegis/api/src/main.ts) — Bootstrap NestJS & CORS (`exposedHeaders: X-Session-Expired, Retry-After, X-CIAM-Framework-Version`)
- [`api/src/auth/bot-defense.ts`](file:///d:/Python/ProRegis/api/src/auth/bot-defense.ts) — ระบบป้องกันบอท 3 ชั้น (`evaluateBotDefense`, `evaluateRateLimitOnly`, `resolveClientIp`, `Retry-After` Header, Audit Callback)
- [`api/src/auth/ciam-v213.spec.ts`](file:///d:/Python/ProRegis/api/src/auth/ciam-v213.spec.ts) — Automated Unit Test Suite สำหรับ CIAM v2.15.0, Idle Timeout, Mandatory IP Normalization, AI DLP, Bot Defense, Password Policy
- [`api/src/auth/auth.controller.ts`](file:///d:/Python/ProRegis/api/src/auth/auth.controller.ts) — Login Controller รองรับ Bot Defense, 90-Day Policy, `POST /auth/local/change-password`, `POST /auth/session/ping`, `POST /auth/logout`
- [`api/src/auth/jwt-auth.guard.ts`](file:///d:/Python/ProRegis/api/src/auth/jwt-auth.guard.ts) — Zero-DI Guard ดูแล Session Revocation + Sliding Idle Timeout (`X-Session-Expired: idle_timeout` + `TO-01` Audit)
- [`api/src/users/user.entity.ts`](file:///d:/Python/ProRegis/api/src/users/user.entity.ts) — ตาราง `users` (`password_changed_at`, `must_change_password`)
- [`api/src/users/users.service.ts`](file:///d:/Python/ProRegis/api/src/users/users.service.ts) — `validatePasswordComplexity()` (6 กฎ) และ `isPasswordExpired()` (90 วัน)
- [`api/src/ciam/ciam.module.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.module.ts) — NestJS Module สำหรับ Central IAM และ AI Copilot
- [`api/src/ciam/ciam.controller.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.controller.ts) — Controllers รองรับ Group A–E, `/api/directory/accounts`, IP Header Extraction และ `X-CIAM-Framework-Version: 2.15.0`
- [`api/src/ciam/ciam.service.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.service.ts) — Core Service ดูแล OIDC PKCE, JWKS RS256, JIT Provisioning, Reverse Heartbeat 120s, True 2-Way Sync, AI DLP/Zero-Training/RBAC และ Idle Timeout Sync
- [`api/src/audit/transaction-log.entity.ts`](file:///d:/Python/ProRegis/api/src/audit/transaction-log.entity.ts) — Entity `transaction_logs` พร้อม `ip_address NOT NULL` และ `idx_trans_logs_ip`
- [`api/src/audit/audit.service.ts`](file:///d:/Python/ProRegis/api/src/audit/audit.service.ts) — `normalizeAuditIp()` และ `recordTransactionLog()` ตาม ISO 27001
- [`api/src/backoffice/system-setting.entity.ts`](file:///d:/Python/ProRegis/api/src/backoffice/system-setting.entity.ts) — Entity `system_settings` สำหรับคอนฟิกแบบ Zero `.env`
- [`ciam_agent.py`](file:///d:/Python/ProRegis/ciam_agent.py) — Outbound Python Agent สอดคล้องกับ Framework v2.15.0

### Frontend (`web/`)
- [`web/src/app/backoffice/useIdleTimeout.ts`](file:///d:/Python/ProRegis/web/src/app/backoffice/useIdleTimeout.ts) — React Hook ตรวจจับความไม่เคลื่อนไหว (throttled + cross-tab sync ผ่าน `localStorage`)
- [`web/src/app/backoffice/IdleTimeoutModal.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/IdleTimeoutModal.tsx) — Countdown Modal แจ้งเตือนก่อนตัดเซสชันพร้อมปุ่ม `"ขยายเวลาใช้งาน"`
- [`web/src/app/backoffice/ForcedPasswordChangeModal.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/ForcedPasswordChangeModal.tsx) — Fullscreen Modal บังคับเปลี่ยนรหัสผ่านเมื่อครบ 90 วัน พร้อม Real-time Checklist 6 ข้อ
- [`web/src/app/backoffice/layout.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/layout.tsx) — Layout หลังบ้าน ตรวจสอบสถานะ `mustChangePassword`, Idle Timeout (`IdleTimeoutModal`), Dynamic TTL และ `SpokeCopilotWidget`
- [`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx) — หน้า Login หลังบ้าน รองรับ Auto-SSO Launch, แบนเนอร์ `?reason=idle_timeout`, Honeypot Decoy และ `form_render_ts`
- [`web/src/app/auth/start/page.tsx`](file:///d:/Python/ProRegis/web/src/app/auth/start/page.tsx) & [`web/src/app/backoffice/auth/start/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/auth/start/page.tsx) — Endpoint เริ่มต้น RFC 9700 Seamless SSO Bounce
- [`web/src/app/auth/callback/page.tsx`](file:///d:/Python/ProRegis/web/src/app/auth/callback/page.tsx) & [`web/src/app/backoffice/auth/callback/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/auth/callback/page.tsx) — OAuth2 Callback แลก Token RS256
- [`web/src/app/backoffice/settings/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/settings/page.tsx) — หน้าตั้งค่าระบบ 8 แท็บ (รวมตั้งค่า Idle Timeout นาที & Warning วินาที) พร้อมปุ่มทดสอบและซิงก์บัญชีทันที
- [`web/src/app/backoffice/logs/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/logs/page.tsx) — หน้าแสดง Audit Logs และ Transaction Logs พร้อมคอลัมน์ `IP Address`
- [`web/src/app/backoffice/SpokeCopilotWidget.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/SpokeCopilotWidget.tsx) — Floating Chat Widget สำหรับ AI Copilot

---

## 6. คู่มือการทดสอบและการ Deploy (Operations Runbook)

### 6.1 การทดสอบบนเครื่อง Local ก่อน Push
ทุกครั้งที่มีการแก้ไขโค้ด ให้รันคำสั่งเหล่านี้บนเครื่องพัฒนา:
*(หมายเหตุสำหรับ Windows PowerShell 5.1: ใช้ `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };` แทน `&&`)*
```powershell
# 1. รัน Unit Tests (Backend)
npm --prefix api run test

# 2. รัน Compile Build (Backend)
npm --prefix api run build

# 3. รัน Production Build (Frontend)
npm --prefix web run build
```

### 6.2 การ Push โค้ดขึ้น GitHub
เมื่อ Build และ Test ผ่าน 100% แล้ว:
```powershell
git add .
git commit -m "คำอธิบายการแก้ไข"
git push origin main
```

### 6.3 การ Deploy บนเซิร์ฟเวอร์ VPS Production (`proregis.windowasia.com`)
ให้ USER เป็นผู้รันบนเครื่อง VPS:
```bash
cd /var/www/Proregis
git pull origin main
docker compose up -d --build
```
*(หากติด Conflict ที่ไฟล์ `api/.env` บน VPS ให้สั่ง `git checkout -- api/.env` ก่อน `git pull origin main`)*

---

## 7. แผนงานพัฒนาต่อยอดในอนาคต (Future Enhancements Roadmap)

1. **ขยายความสามารถ In-App AI Copilot & Central IAM MCP (Group E):**
   - เชื่อมต่อกับ Central IAM Core MCP Server (`https://ciam.windowasia.com/api/v1/mcp/sse`) ผ่าน SSE over HTTPS เพื่อใช้ Read-Only Tools กลาง (เช่น `ciam_get_dashboard_summary`, `ciam_get_ghost_accounts`, `ciam_preview_offboarding_impact`)
   - เพิ่ม Read-Only Analytics Tools เฉพาะของ ProRegis (กรองตาม RBAC ของ Role เช่น `CRM_MANAGER` ดูสถิติลูกค้า, `QR_GENERATOR` ดูยอดผลิต/สแกน QR รายเดือน)
2. **ปรับปรุงประสิทธิภาพ CRM & Analytics หลังบ้าน (`/backoffice/crm`, `/backoffice/dashboard`):**
   - พัฒนา Export รายงานประวัติรับประกันในรูปแบบ Excel / PDF รายเดือน
   - เพิ่มระบบแจ้งเตือนลูกค้าล่วงหน้าก่อนการรับประกันสินค้าหมดอายุผ่าน SMS / LINE OA
3. **การเชื่อมโยง SAP B1 Service Layer:**
   - ขยาย Endpoint Fallback Cache สำหรับข้อมูลคำสั่งผลิตและ Barcode ในกรณีที่ SAP B1 Service Layer ภายในโรงงานปิดปรับปรุง
