# ProRegis — Engineering Handoff Document (HANDOFF.md)

**อัปเดตล่าสุด:** 17 ตุลาคม 2026  
**สถานะระบบ:** Production Ready (`origin/main` ล่าสุด: `304584b1`)  
**ขอบเขตงาน:** ระบบหลังบ้าน (Backoffice) — Enterprise Central IAM Integration (v2.8.0), 1-Click Portal SSO Launch, In-App AI Copilot & Tabbed System Settings

---

## 1. สรุปภาพรวมสิ่งที่พัฒนาและส่งมอบแล้ว (Completed Deliverables)

### 1.1 มาตรฐาน Central IAM Integration (v2.8.0) ครบ 5 หมวด (Groups A–E)
| หมวด | รายละเอียดการทำงาน | Endpoints / ไฟล์หลัก |
|---|---|---|
| **Group A: Settings Channel** | ดึง/แก้ไขคอนฟิก Central IAM แบบ Real-time จาก DB (Zero `.env`), Mask รหัสลับ `ciam_client_secret` และ `ciam_m2m_key`, ทดสอบการเชื่อมต่อ OIDC Discovery & JWKS | `GET /api/settings/ciam-sso`<br>`PUT /api/settings/ciam-sso`<br>`POST /api/settings/ciam-sso/test-connection` |
| **Group B: SSO Execution Flow** | OIDC Authorization Code Flow with PKCE (`S256`), ตรวจสอบลายเซ็น `RS256` ผ่าน JWKS, JIT Auto-Provisioning (Role เริ่มต้น `IMAGE_EDITOR`), สวิตช์ฉุกเฉิน Break-Glass พร้อมแจ้งเตือน Telegram | `GET /api/auth/sso/config`<br>`GET /api/auth/sso/login` & `/start`<br>`POST /api/auth/sso/authorize-url`<br>`POST /api/auth/sso/callback`<br>`POST /api/auth/sso/break-glass-toggle` |
| **Group C: Inbound Directory (Mode A)** | M2M Directory Governance ตรวจสอบ `X-Management-API-Key`, IP Whitelist (`157.173.219.153`) และ Replay Timestamp สำหรับดึงบัญชี, สร้างบัญชี และสั่ง 1-Click Offboard/Reactivate | `GET /api/v1/directory/accounts`<br>`POST /api/v1/directory/accounts`<br>`PATCH /api/v1/directory/accounts/:username/status` |
| **Group D: Outbound Agent & Two-Way Sync (Mode C)** | Background Worker ส่ง Reverse Heartbeat ทุก 120 วินาทีไปยัง CIAM, ประมวลผลคำสั่ง `PROVISION_USER`, `DISABLE_USER`, `ENABLE_USER`, `REQUEST_FULL_SYNC` และปุ่มสั่งซิงก์ทันทีบน UI | `POST /api/settings/ciam-agent/sync-now`<br>`api/src/ciam/ciam.service.ts`<br>`ciam_agent.py` |
| **Group E: In-App AI Copilot & MCP Tools** | ระบบผู้ช่วย AI ประจำระบบหลังบ้าน รองรับ Google Gemini, OpenAI, Anthropic, Ollama/Custom พร้อม MCP Tools ภายในและเชื่อมต่อ Central IAM MCP, ซ่อน Widget อัตโนมัติเมื่อปิดใช้งาน | `GET /api/settings/ai`<br>`PUT /api/settings/ai`<br>`POST /api/settings/ai/test`<br>`POST /api/ai/chat`<br>`web/src/app/backoffice/SpokeCopilotWidget.tsx` |

---

### 1.2 การทำงานของ 1-Click Seamless SSO จากหน้า Central IAM Portal
1. **เข้าสู่ระบบจาก CIAM Portal (`https://ciam.windowasia.com/portal`):**
   - เมื่อผู้ใช้คลิกการ์ด ProRegis บนหน้า Portal ของ CIAM (ไม่ว่าลิงก์จะชี้มาที่ `/backoffice`, `/backoffice/dashboard`, `/auth/start`, `/backoffice/auth/start` หรือ `/api/auth/sso/login`)
   - หน้า [`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx) จะตรวจพบว่า `sso_enabled == true` และไม่ได้อยู่ในโหมด Break-Glass แล้วสั่ง **`handleCiamSso()` อัตโนมัติทันทีโดยไม่หยุดรอที่หน้า Login**
   - นอกจากนี้ หาก CIAM ส่ง `?code=...` เข้ามาที่ `/backoffice` หรือ `/backoffice/*` ระบบจะส่งต่อไปยัง `/auth/callback` เพื่อแลก Token และเข้าสู่ระบบหลังบ้านทันที
2. **การออกจากระบบ (Seamless Return to Portal):**
   - เมื่อผู้ใช้ที่ล็อกอินผ่าน SSO กดปุ่ม **"ออกจากระบบ"** ใน [`web/src/app/backoffice/layout.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/layout.tsx) (หรือเมื่อ Token หมดอายุ `HTTP 401`) ระบบจะล้างเฉพาะ Session ของ ProRegis แล้วพากลับไปยัง `https://ciam.windowasia.com/portal` ทันที
3. **การล็อกอินด้วย Local DB / Active Directory โดยตรง:**
   - หากต้องการล็อกอินด้วยบัญชี Local (เช่น `admin`) โดยไม่ให้เด้งไป SSO สามารถเข้าผ่าน `/backoffice?local=1` หรือเมื่อ Logout จากบัญชี Local ระบบจะตั้งค่า `bo_manual_login = "1"` เพื่อเปิดหน้าฟอร์ม Login ปกติค้างไว้ให้

---

### 1.3 การปรับปรุงหน้า UI ระบบหลังบ้าน (Backoffice UI Enhancements)
1. **หน้าตั้งค่าระบบแบบแยกแท็บ ([`web/src/app/backoffice/settings/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/settings/page.tsx)):**
   - แบ่งการตั้งค่าออกเป็น 8 แท็บ: `ทั่วไป & QR Code`, `Central IAM (SSO)`, `AI Copilot`, `SMS Gateway`, `Email SMTP`, `Telegram Alert`, `SAP B1 ERP`, และ `Danger Zone`
2. **หน้าประวัติการใช้งานและ Audit Trail ([`web/src/app/backoffice/logs/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/logs/page.tsx)):**
   - มี 2 แท็บให้สลับดูได้ระหว่าง `CIAM & ISO 27001 Transaction Logs` (`SSO-01`–`SSO-04`, `BG-01`, `BG-02`, `CFG-01`) และ `System Audit Logs` เดิมของระบบ
3. **หน้าเข้าสู่ระบบหลังบ้าน ([`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx)):**
   - รองรับทั้ง Responsive Login (Desktop & Mobile), แถบแจ้งเตือนโหมดฉุกเฉิน Break-Glass และ Auto-SSO Launch

---

## 2. รายการไฟล์สำคัญที่สร้างและแก้ไข (Key Files Reference)

### Backend (`api/`)
- [`api/src/ciam/ciam.module.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.module.ts) — NestJS Module สำหรับระบบ Central IAM และ AI Copilot
- [`api/src/ciam/ciam.controller.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.controller.ts) — Controllers ทั้ง 5 หมวด (`CiamSettingsController`, `CiamSsoAuthController`, `CiamDirectoryController`, `CiamAgentController`, `AiCopilotController`)
- [`api/src/ciam/ciam.service.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.service.ts) — Core Service จัดการ Dynamic Settings, OIDC PKCE S256, JWKS RS256 Verification, JIT Auto-Provisioning, Directory Governance, 120s Reverse Heartbeat Agent และ AI Copilot
- [`api/src/audit/transaction-log.entity.ts`](file:///d:/Python/ProRegis/api/src/audit/transaction-log.entity.ts) — Entity ตาราง `transaction_logs` ตามมาตรฐาน ISO 27001
- [`api/src/audit/audit.service.ts`](file:///d:/Python/ProRegis/api/src/audit/audit.service.ts) — เพิ่มฟังก์ชัน `recordTransactionLog()` และ `getTransactionLogs()`
- [`api/src/auth/auth.controller.ts`](file:///d:/Python/ProRegis/api/src/auth/auth.controller.ts) — อัปเดต `/auth/login` ให้รองรับการสลับไปใช้ `ciam_ad_gateway_url` ในโหมด Break-Glass (`BG-02`) และตรวจสอบสถานะ `isActive`
- [`api/src/auth/jwt-auth.guard.ts`](file:///d:/Python/ProRegis/api/src/auth/jwt-auth.guard.ts) — ตรวจสอบสถานะ `isActive` แบบ Real-time ในทุก Request เพื่อเตะผู้ใช้ที่ถูกสั่ง 1-Click Offboard ออกจากระบบทันที
- [`api/src/backoffice/system-setting.entity.ts`](file:///d:/Python/ProRegis/api/src/backoffice/system-setting.entity.ts) — เพิ่มคอลัมน์ `category`, `dataType`, `updatedAt` โดยคงโครงสร้าง Primary Key (`key` varchar) ให้ตรงกับฐานข้อมูล Production

### Frontend (`web/`)
- [`web/src/app/auth/start/page.tsx`](file:///d:/Python/ProRegis/web/src/app/auth/start/page.tsx) & [`web/src/app/backoffice/auth/start/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/auth/start/page.tsx) — หน้าเริ่มต้น RFC 9700 Seamless SSO Bounce
- [`web/src/app/auth/callback/page.tsx`](file:///d:/Python/ProRegis/web/src/app/auth/callback/page.tsx) & [`web/src/app/backoffice/auth/callback/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/auth/callback/page.tsx) — หน้ารับ OAuth2 Callback และแลกเปลี่ยน JWT Token
- [`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx) — หน้า Login หลังบ้าน พร้อมระบบ Auto-Initiate 1-Click SSO และโหมด Local Login (`?local=1`)
- [`web/src/app/backoffice/layout.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/layout.tsx) — Auth Guard, Seamless Logout กลับสู่ CIAM Portal และการฝัง `SpokeCopilotWidget`
- [`web/src/app/backoffice/settings/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/settings/page.tsx) — หน้าตั้งค่าระบบแบบ 8 แท็บ
- [`web/src/app/backoffice/logs/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/logs/page.tsx) — หน้าแสดงผล Transaction Logs & System Audit Logs
- [`web/src/app/backoffice/SpokeCopilotWidget.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/SpokeCopilotWidget.tsx) — Floating Chat Widget สำหรับผู้ช่วย AI หลังบ้าน

---

## 3. คู่มือการดูแลระบบและแก้ไขปัญหาเบื้องต้น (Operations Runbook)

### 3.1 การอัปเดตโค้ดขึ้น Production VPS (`proregis.windowasia.com`)
1. บนเครื่อง Local (หลังจากทดสอบ `npm run build` ทั้ง `api` และ `web` ผ่านแล้ว):
   ```powershell
   git add .
   git commit -m "คำอธิบายการแก้ไข"
   git push origin main
   ```
2. บนเครื่อง VPS:
   ```bash
   cd /var/www/Proregis && git pull origin main && docker compose up -d --build
   ```
   *(หากติด Conflict ที่ไฟล์ `api/.env` บน VPS ให้ใช้ `git checkout -- api/.env` ก่อน `git pull origin main`)*

### 3.2 การตั้งค่าเชื่อมต่อกับ Central IAM ครั้งแรกบนหน้าเว็บ
1. เข้าสู่หน้า `/backoffice/settings` -> เลือกแท็บ **`Central IAM (SSO)`**
2. ตรวจสอบค่า `Central IAM Base URL` (`https://ciam.windowasia.com`), `OIDC Client ID`, และกรอก `OIDC Client Secret` / `M2M Key` ที่ได้จากหน้าทะเบียนแอปของ Central IAM
3. เลือก `กลุ่มสิทธิ์เริ่มต้น (Default Auto-Provision Group)` (ค่าเริ่มต้นคือ `IMAGE_EDITOR`)
4. กดปุ่ม **`บันทึกการตั้งค่า Central IAM`**
5. กดปุ่ม **`⚡ ทดสอบการเชื่อมต่อ`** เพื่อเช็คสถานะ Online และ JWKS Key ID
6. กดปุ่ม **`⚡ ซิงก์บัญชีผู้ใช้กับ CIAM ทันที`** เพื่อซิงก์รายชื่อผู้ใช้และสถานะ Active/Inactive ให้ตรงกัน 100%

### 3.3 กรณีฉุกเฉินเมื่อระบบ Central IAM ล่ม (Break-Glass Procedure)
- หากต้องการเข้าหน้า Login ด้วยรหัสผ่าน Local DB ทันทีโดยไม่ให้หน้าเว็บเด้งไปหา CIAM:
  - เปิด URL: **`https://proregis.windowasia.com/backoffice?local=1`**
  - ล็อกอินด้วยบัญชี `SYSTEM_ADMIN` (โหมด `Database (DB)`)
  - ไปที่ `/backoffice/settings` -> แท็บ **`Central IAM (SSO)`** -> กดเปิดสวิตช์ **Break-Glass Emergency Mode** พร้อมระบุเหตุผล
