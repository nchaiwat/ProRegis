# ProRegis — Engineering Handoff Document (HANDOFF.md)

**อัปเดตล่าสุด:** 19 พฤศจิกายน 2026  
**สถานะระบบ:** Production Ready (Full Compliance with Central IAM Standard Specification v2.13.0)  
**ขอบเขตงาน:** ระบบหลังบ้าน (Backoffice) — Enterprise Central IAM Integration (v2.13.0 - One-Way AD, Local Account Password Provisioning, Real DB Persistence, Framework Version Handshake 2.13.0), In-App Bot Defense 3 ชั้น, บังคับเปลี่ยนรหัสผ่านทุก 90 วัน (Local Password Policy), True 2-Way Sync & ISO 27001 Audit Logs

---

## 1. สรุปภาพรวมสิ่งที่พัฒนาและส่งมอบแล้ว (Completed Deliverables)

### 1.1 มาตรฐาน Central IAM Integration (v2.13.0) ครบทั้ง 7 หมวด (Groups A–G)

| หมวด | รายละเอียดและกลไกการทำงาน | Endpoints & ไฟล์หลักที่รับผิดชอบ |
|---|---|---|
| **Group A: Settings Channel** | • ดึงและแก้ไขคอนฟิก Central IAM แบบ Real-time จาก DB (Zero `.env` Dependency)<br>• Masking รหัสลับ `ciam_client_secret` และ `ciam_m2m_key` ไม่ส่งคืนค่าเต็มผ่าน GET API<br>• ทดสอบการเชื่อมต่อ OIDC Discovery & Asymmetric JWKS Keys จากเซิร์ฟเวอร์ | `GET /api/settings/ciam-sso`<br>`PUT /api/settings/ciam-sso`<br>`POST /api/settings/ciam-sso/test-connection` |
| **Group B: SSO Execution Flow** | • OIDC Authorization Code Flow with PKCE (`S256`) และ Asymmetric RS256 Signature Verification ผ่าน JWKS<br>• **Framework Version Handshake (`framework_version: '2.13.0'`):** ส่งเวอร์ชันกำกับใน `GET /api/auth/sso/config`<br>• Just-In-Time (JIT) Auto-Provisioning สิทธิ์เริ่มต้น `IMAGE_EDITOR` (Least Privilege)<br>• **SSO Inactive Guard (`SSO-04`):** ปฏิเสธการล็อกอินทันทีหากบัญชีในระบบลูกถูกระงับสิทธิ์ (`is_active: false`) แม้จะถือ Token ที่ถูกต้องจาก CIAM<br>• สวิตช์ฉุกเฉิน Break-Glass พร้อมแจ้งเตือน Telegram ผู้บริหารไอที | `GET /api/auth/sso/config`<br>`GET /api/auth/sso/login` & `/start`<br>`POST /api/auth/sso/authorize-url`<br>`POST /api/auth/sso/callback`<br>`POST /api/auth/sso/break-glass-toggle` |
| **Group C: Inbound Directory (Mode A)** | • M2M Directory Governance ตรวจสอบ `X-Management-API-Key`, IP Whitelist (`157.173.219.153` ฯลฯ) และ Replay Timestamp<br>• ลำดับการอ่าน IP Headers: `x-ciam-origin-ip` &rarr; `x-origin-ip` &rarr; `x-forwarded-for`<br>• **Framework Version Handshake:** ส่ง `"framework_version": "2.13.0"` ใน Root JSON และ Header `X-CIAM-Framework-Version`<br>• **Local Account Password Provisioning (v2.13.0):** รับ `password` และ `must_change_password` สำหรับ Local Account (`use_ad_auth: false`) แล้ว Hash ด้วย `bcrypt` ลง DB ทันที เพื่อรองรับการ Login ตรงคู่กับ SSO<br>• รองรับ Fallback Path `/api/directory/accounts`<br>• Health Check & Daily Auto-Reconciliation ประจำวันเวลา 04:00 น.<br>• 1-Click Offboard/Reactivate ยกเลิก Session ทันที พร้อม Protected Local Admin Guard | `GET /api/v1/directory/accounts`<br>`POST /api/v1/directory/accounts`<br>`PATCH /api/v1/directory/accounts/:username/status` |
| **Group D: Outbound Agent & True 2-Way Sync (Mode C)** | • Reverse Heartbeat Background Worker ยิง Outbound HTTPS 443 ไปยัง CIAM ทุก 120 วินาที พร้อม `"framework_version": "2.13.0"`<br>• **True 2-Way Status Sync:** ส่ง Payload `accounts` ระบุ `status_origin: 'SPOKE_APP'`, `status_updated_at`<br>• **Timestamp Reconciliation & Authority Lock:** เปรียบเทียบเวลาแก้ไขล่าสุด และเคารพการล็อคสิทธิ์ (`is_status_locked`) จาก CIAM<br>• รองรับคำสั่ง `PROVISION_USER`, `DISABLE_USER`, `ENABLE_USER`, `REQUEST_FULL_SYNC`<br>• ปุ่ม `[ ⚡ ซิงก์บัญชีผู้ใช้กับ CIAM ทันที ]` บนหน้า Settings | `POST /api/settings/ciam-agent/sync-now`<br>[`api/src/ciam/ciam.service.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.service.ts)<br>`ciam_agent.py` |
| **Group E: In-App AI Copilot & MCP Tools** | • ผู้ช่วย AI ประจำระบบหลังบ้าน รองรับ Google Gemini, OpenAI, Anthropic, Ollama<br>• Zero-Training DLP Headers (`X-No-Model-Training: true`, `X-Data-Retention: none`, `store: false`) พร้อม Scrubbing รหัสผ่านและความลับก่อนส่งเข้า LLM<br>• ซ่อน Chat Widget อัตโนมัติเมื่อปิดใช้งาน พร้อม Read-Only MCP Tools ประจำระบบ | `GET /api/settings/ai`<br>`PUT /api/settings/ai`<br>`POST /api/settings/ai/test`<br>`POST /api/ai/chat`<br>[`web/src/app/backoffice/SpokeCopilotWidget.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/SpokeCopilotWidget.tsx) |
| **Group F: In-App Bot Defense 3 ชั้น (v2.10.0)** | • **Layer 1 (IP Rate Limiting):** Sliding-Window 10 requests / 60 วินาที ต่อ IP พร้อม Header `Retry-After` และ Corporate IP Whitelist (`157.173.219.153`, `49.231.185.245`, `58.8.190.63`, Docker host, localhost)<br>• **Layer 2 (Decoy Honeypot Trap):** ฟิลด์หลอก `corporate_fax` และ `security_honey` ซ่อนจากมนุษย์ด้วย CSS `left: -9999px` และ `tabIndex={-1}` หากมีบอทกรอกเข้ามาจะ Reject ทันทีด้วย HTTP 401<br>• **Layer 3 (Submission Velocity Guard):** ตรวจจับเวลาส่งฟอร์มด้วย `form_render_ts` หากเร็วกว่า 400ms (< 0.4 วินาที) จะถือเป็น Bot Script และ Reject ทันทีด้วย HTTP 400 | [`api/src/auth/bot-defense.ts`](file:///d:/Python/ProRegis/api/src/auth/bot-defense.ts)<br>`POST /auth/login`<br>[`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx) |
| **Group G: Local Password Policy & 90-Day Rotation (v2.12.0)** | • **90-Day Forced Rotation:** ตาราง `users` เพิ่มฟิลด์ `password_changed_at` และ `must_change_password`<br>• **Password Complexity (6 ข้อ):** ความยาว 8–16 ตัวอักษร, พิมพ์ใหญ่ (A-Z) &ge; 1, พิมพ์เล็ก (a-z) &ge; 1, ตัวเลข (0-9) &ge; 1, อักขระพิเศษ &ge; 1, และห้ามมี Username อยู่ในรหัสผ่าน<br>• **Forced Interception Modal:** บล็อกหน้าจอไม่ให้กดข้ามหรือเข้าเมนูใดๆ จนกว่าจะเปลี่ยนรหัสผ่านใหม่สำเร็จ | [`api/src/users/user.entity.ts`](file:///d:/Python/ProRegis/api/src/users/user.entity.ts)<br>`POST /auth/local/change-password`<br>[`web/src/app/backoffice/ForcedPasswordChangeModal.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/ForcedPasswordChangeModal.tsx)<br>[`web/src/app/backoffice/layout.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/layout.tsx) |

---

### 1.2 การทำงานของ 1-Click Seamless SSO จากหน้า Central IAM Portal
1. **เข้าสู่ระบบจาก CIAM Portal (`https://ciam.windowasia.com/portal`):**
   - เมื่อผู้ใช้คลิกการ์ด ProRegis บน Portal ของ CIAM (ลิงก์ชี้มาที่ `/backoffice`, `/backoffice/dashboard`, `/auth/start`, `/backoffice/auth/start` หรือ `/api/auth/sso/login`)
   - หน้า [`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx) ตรวจพบว่า `sso_enabled == true` และไม่ได้อยู่ในโหมด Break-Glass จะสั่ง **`handleCiamSso()` อัตโนมัติทันทีโดยไม่หยุดรอที่หน้า Login**
   - หาก CIAM ส่ง `?code=...` เข้ามาที่ `/backoffice` หรือ `/backoffice/*` ระบบจะส่งต่อไปยัง `/auth/callback` เพื่อแลก Token และพาเข้าหน้า Dashboard ทันที
2. **การออกจากระบบ (Seamless Return to Portal):**
   - เมื่อผู้ใช้ที่ล็อกอินผ่าน SSO กดปุ่ม **"ออกจากระบบ"** ใน [`web/src/app/backoffice/layout.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/layout.tsx) (หรือเมื่อ Token หมดอายุ `HTTP 401`) ระบบจะล้างเฉพาะ Session ของ ProRegis แล้วพากลับไปยัง `https://ciam.windowasia.com/portal` ทันที
3. **การล็อกอินด้วย Local DB / Active Directory โดยตรง:**
   - หากต้องการล็อกอินด้วยบัญชี Local (เช่น `admin`) โดยไม่ให้เด้งไป SSO สามารถเข้าผ่าน `/backoffice?local=1` หรือเมื่อ Logout จากบัญชี Local ระบบจะตั้งค่า `bo_manual_login = "1"` เพื่อเปิดหน้าฟอร์ม Login ปกติค้างไว้ให้

---

### 1.3 หน้าจอและการจัดการระบบหลังบ้าน (Backoffice Enhancements)
1. **หน้าตั้งค่าระบบแยก 8 แท็บ ([`web/src/app/backoffice/settings/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/settings/page.tsx)):**
   - `ทั่วไป & QR Code`, `Central IAM (SSO)`, `AI Copilot`, `SMS Gateway`, `Email SMTP`, `Telegram Alert`, `SAP B1 ERP`, และ `Danger Zone`
2. **หน้าประวัติการใช้งานและ Audit Trail ([`web/src/app/backoffice/logs/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/logs/page.tsx)):**
   - ตาราง `CIAM & ISO 27001 Transaction Logs` (`SSO-01`–`SSO-04`, `BG-01`, `BG-02`, `CFG-01`) และ `System Audit Logs` เดิมของระบบ
3. **Responsive Login & Bot Protection ([`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx)):**
   - รองรับ Responsive แบบ Desktop Compact SSO / Mobile Familiar Form พร้อมฟิลด์ดักบอท Decoy Honeypot และ Form Render Timestamp

---

## 2. รายการไฟล์สำคัญในระบบ (Key Files Reference)

### Backend (`api/`)
- [`api/src/auth/bot-defense.ts`](file:///d:/Python/ProRegis/api/src/auth/bot-defense.ts) — โมดูลป้องกันบอท 3 ชั้น (IP Rate Limiting, Honeypot Trap, Timing Guard)
- [`api/src/auth/auth.controller.ts`](file:///d:/Python/ProRegis/api/src/auth/auth.controller.ts) — Login Controller รองรับ Bot Defense, คำนวณอายุรหัสผ่าน 90 วัน และ Endpoint `POST /auth/local/change-password`
- [`api/src/auth/jwt-auth.guard.ts`](file:///d:/Python/ProRegis/api/src/auth/jwt-auth.guard.ts) — Session Revocation Interceptor สำหรับเตะผู้ใช้ที่ถูก 1-Click Offboard ออกจากระบบทันที
- [`api/src/users/user.entity.ts`](file:///d:/Python/ProRegis/api/src/users/user.entity.ts) — ตาราง `users` เพิ่มคอลัมน์ `password_changed_at` และ `must_change_password`
- [`api/src/users/users.service.ts`](file:///d:/Python/ProRegis/api/src/users/users.service.ts) — ฟังก์ชัน `validatePasswordComplexity()` และ `isPasswordExpired()` ตามมาตรฐานองค์กร
- [`api/src/ciam/ciam.module.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.module.ts) — NestJS Module สำหรับ Central IAM และ AI Copilot
- [`api/src/ciam/ciam.controller.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.controller.ts) — Controllers 5 หมวดหลักของ CIAM
- [`api/src/ciam/ciam.service.ts`](file:///d:/Python/ProRegis/api/src/ciam/ciam.service.ts) — Core Service ดูแล OIDC PKCE, JWKS, JIT Provisioning, Reverse Heartbeat 120s และ True 2-Way Sync
- [`api/src/audit/transaction-log.entity.ts`](file:///d:/Python/ProRegis/api/src/audit/transaction-log.entity.ts) — Entity ตาราง `transaction_logs` ตาม ISO 27001
- [`api/src/backoffice/system-setting.entity.ts`](file:///d:/Python/ProRegis/api/src/backoffice/system-setting.entity.ts) — ตาราง `system_settings` สำหรับคอนฟิกแบบ Zero `.env`

### Frontend (`web/`)
- [`web/src/app/backoffice/ForcedPasswordChangeModal.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/ForcedPasswordChangeModal.tsx) — Fullscreen Modal บังคับเปลี่ยนรหัสผ่านเมื่อครบ 90 วัน พร้อม Real-time Checklist 6 ข้อ
- [`web/src/app/backoffice/layout.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/layout.tsx) — Layout หลังบ้าน ตรวจสอบสถานะ `mustChangePassword`, ฝัง `ForcedPasswordChangeModal` และ `SpokeCopilotWidget`
- [`web/src/app/backoffice/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/page.tsx) — หน้าเข้าสู่ระบบหลังบ้าน รองรับ Auto-SSO Launch, Honeypot Decoy และบันทึก `form_render_ts`
- [`web/src/app/auth/start/page.tsx`](file:///d:/Python/ProRegis/web/src/app/auth/start/page.tsx) & [`web/src/app/backoffice/auth/start/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/auth/start/page.tsx) — Endpoint เริ่มต้น RFC 9700 Seamless SSO Bounce
- [`web/src/app/auth/callback/page.tsx`](file:///d:/Python/ProRegis/web/src/app/auth/callback/page.tsx) & [`web/src/app/backoffice/auth/callback/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/auth/callback/page.tsx) — OAuth2 Callback แลก Token RS256
- [`web/src/app/backoffice/settings/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/settings/page.tsx) — หน้าตั้งค่าระบบแบบ 8 แท็บ พร้อมปุ่มทดสอบและปุ่มซิงก์บัญชีทันที
- [`web/src/app/backoffice/logs/page.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/logs/page.tsx) — หน้าแสดง Audit Logs และ Transaction Logs
- [`web/src/app/backoffice/SpokeCopilotWidget.tsx`](file:///d:/Python/ProRegis/web/src/app/backoffice/SpokeCopilotWidget.tsx) — Floating Chat Widget สำหรับ AI Copilot

---

## 3. คู่มือการดูแลระบบและการ Deploy ขึ้น Production (Operations Runbook)

### 3.1 การอัปเดตโค้ดขึ้น Production VPS (`proregis.windowasia.com`)
> **⚠️ สำคัญมาก:** ทุกครั้งที่แก้ไขโค้ดเสร็จ ต้องทดสอบ build ผ่านทั้ง `api` และ `web` บนเครื่อง Local ก่อน Push ขึ้น GitHub จากนั้นจึงเข้าไปรันบน VPS โดยต้อง `cd /var/www/Proregis` ก่อนเสมอ และใช้ `docker-compose.yml` หลัก (ห้ามใช้ `docker-compose.local.yml` บน VPS)

1. **บนเครื่อง Local (Local Machine):**
   ```powershell
   git add .
   git commit -m "feat(ciam): upgrade to Central IAM v2.12.0 (Bot Defense, 90-day Password Policy, True 2-Way Sync)"
   git push origin main
   ```

2. **บนเครื่อง VPS (Production Server):**
   ```bash
   cd /var/www/Proregis
   git pull origin main
   docker compose up -d --build
   ```
   *(หากติด Conflict ที่ไฟล์ `api/.env` บน VPS ให้สั่ง `git checkout -- api/.env` ก่อน `git pull origin main`)*

### 3.2 การตั้งค่าและตรวจสอบการเชื่อมต่อ Central IAM ครั้งแรก
1. เข้าสู่หน้า `/backoffice/settings` -> เลือกแท็บ **`Central IAM (SSO)`**
2. ตรวจสอบค่า `Central IAM Base URL` (`https://ciam.windowasia.com`), `OIDC Client ID`, และกรอก `OIDC Client Secret` / `M2M Key`
3. เลือก `กลุ่มสิทธิ์เริ่มต้น (Default Auto-Provision Group)` (ค่าเริ่มต้นคือ `IMAGE_EDITOR`)
4. กดปุ่ม **`บันทึกการตั้งค่า Central IAM`**
5. กดปุ่ม **`⚡ ทดสอบการเชื่อมต่อ`** เพื่อตรวจสอบสถานะ Online และ Key ID ของ JWKS
6. กดปุ่ม **`⚡ ซิงก์บัญชีผู้ใช้กับ CIAM ทันที`** เพื่อแลกเปลี่ยนรายชื่อผู้ใช้และสถานะ Active/Inactive ให้ตรงกัน 100%

### 3.3 กรณีฉุกเฉินเมื่อระบบ Central IAM ล่ม (Break-Glass Procedure)
- หาก Central IAM ขัดข้อง และต้องการล็อกอินด้วยรหัสผ่าน Local DB หรือ AD Direct Gateway ทันที:
  1. เปิด URL: **`https://proregis.windowasia.com/backoffice?local=1`**
  2. ล็อกอินด้วยบัญชี `SYSTEM_ADMIN` (โหมด `Database (DB)`)
  3. ไปที่ `/backoffice/settings` -> แท็บ **`Central IAM (SSO)`**
  4. สับสวิตช์เปิด **Break-Glass Emergency Mode** พร้อมระบุเหตุผลยืนยัน
