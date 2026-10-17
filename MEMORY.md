# ProRegis — Project Memory & Engineering Rules (MEMORY.md)

> **เอกสารบันทึกความจำระยะยาวของระบบ (System Memory & Golden Rules)**  
> สำหรับทีมพัฒนาและ AI Coding Assistant เพื่อรักษาความต่อเนื่องของสถาปัตยกรรม เงื่อนไขทางธุรกิจ และมาตรฐานความปลอดภัย

---

## 1. กฎเหล็กในการพัฒนาและ Deploy (Critical Engineering Constraints)

1. **แบ่งแยกฝั่ง Customer และ Backoffice อย่างชัดเจน (Strict Boundary):**
   - **Customer Flow (`/`, `/p/[token]`, `/my-warranty`):** สำหรับลูกค้าสแกน QR Code ลงทะเบียนรับประกันสินค้า (ใช้ OTP SMS / LINE / Profile Session 1 ชม. & OTP Session 30 นาที) **ห้ามนำระบบ Central IAM SSO ของพนักงานไปปะปนกับหน้าลูกค้าโดยเด็ดขาด**
   - **Backoffice Flow (`/backoffice/*`, `/auth/*`):** สำหรับพนักงานและผู้ดูแลระบบของ Window Asia เท่านั้น ใช้ระบบพิสูจน์ตัวตน **Window Asia Central IAM (SSO v2.8.0)** ควบคู่กับ Local DB และ Active Directory (AD)

2. **ขั้นตอนการทดสอบและ Deploy ขึ้น Production VPS (`proregis.windowasia.com`):**
   - **ต้องทดสอบ Build บนเครื่อง Local ให้ผ่าน 100% ก่อนเสมอ:**
     - Backend: `cd api && npm run build`
     - Frontend: `cd web && npm run build`
   - **ต้อง Commit และ Push ขึ้น GitHub (`origin/main`) ก่อนเสมอ:**
     - **ห้ามแก้ไฟล์ `api/.env` เพื่อใส่ค่าคอนฟิก Central IAM หรือ AI** (กฎ Zero `.env` Dependency — ค่าทั้งหมดอยู่ในตาราง `system_settings` ในฐานข้อมูล และเพื่อป้องกัน Git Merge Conflict บน VPS)
   - **คำสั่ง Deploy บน VPS ต้อง `cd /var/www/Proregis` ก่อนทุกครั้ง และใช้ `docker-compose.yml` เท่านั้น:**
     ```bash
     cd /var/www/Proregis && git pull origin main && docker compose up -d --build
     ```
   - **❌ ห้ามรัน `docker-compose.local.yml` บน VPS เด็ดขาด** เพราะบน VPS ใช้ **Traefik Reverse Proxy** (`root_default` network) ร่วมกับระบบอื่น การใช้ไฟล์ local จะทำให้ Port ชนและกระทบแอปพลิเคชันอื่นบนเซิร์ฟเวอร์

3. **TypeORM Entity & PostgreSQL Schema Compatibility:**
   - ตาราง `system_settings` ใช้ `key` (`VARCHAR`) เป็น `@PrimaryColumn({ type: 'varchar' })` และ `value` เป็น `@Column({ type: 'varchar' })`
   - **ห้ามเปลี่ยน Primary Key ของ `system_settings` เป็น `id SERIAL` หรือเปลี่ยนชนิดคอลัมน์ `value` เป็น `text`** เพราะ `synchronize: true` ของ TypeORM จะพยายามสั่ง `DROP COLUMN` บนฐานข้อมูล VPS ที่มีข้อมูลอยู่แล้วและทำให้ Container พัง

---

## 2. สรุปสถาปัตยกรรม Central IAM Integration (v2.8.0 Standard)

ระบบหลังบ้าน ProRegis เชื่อมต่อกับ **Window Asia Central IAM (`https://ciam.windowasia.com`)** ตามมาตรฐาน **Enterprise Central IAM Integration for Spoke Applications v2.8.0** ครบทั้ง 5 หมวด (Mode A + Mode C Hybrid):

### 2.1 การกำหนดสิทธิ์เริ่มต้น (Principle of Least Privilege)
- เมื่อพนักงานล็อกอินผ่าน SSO ครั้งแรก (JIT Auto-Provisioning) หรือถูกสร้างผ่าน Directory Sync / Reconcile จาก CIAM:
  - ค่า Default Role เริ่มต้น (`ciam_auto_provision_group`) คือ **`IMAGE_EDITOR`** (สิทธิ์น้อยที่สุดในระบบหลังบ้าน เข้าได้เฉพาะหน้าจัดการรูปภาพสินค้า)
  - ผู้ดูแลระบบ (`SYSTEM_ADMIN`) สามารถปรับเปลี่ยนสิทธิ์รายบุคคลภายหลังได้ที่เมนู `/backoffice/users` หรือเปลี่ยนกลุ่มเริ่มต้นได้ที่ `/backoffice/settings` (แท็บ Central IAM)
- **การปกป้องบัญชีฉุกเฉิน (Protected Accounts):**
  - บัญชี `admin`, `superadmin`, `emergency_admin`, `local_admin` และบัญชี `SYSTEM_ADMIN` คนสุดท้ายของระบบ จะถูกป้องกันไม่ให้ถูกระงับสิทธิ์ (`DISABLE_USER`) จากคำสั่งภายนอก

### 2.2 พฤติกรรม Single Sign-On (1-Click Seamless Portal Launch & Logout)
- **เมื่อคลิกการ์ด ProRegis จากหน้า Central IAM Portal (`https://ciam.windowasia.com/portal`):**
  - ไม่ว่าการ์ดบน Portal จะชี้มาที่ `/backoffice`, `/backoffice/dashboard`, `/auth/start`, `/backoffice/auth/start` หรือ `/api/auth/sso/login`
  - यदि `ciam_sso_enabled == true` และ `ciam_break_glass_active == false` หน้า `/backoffice` จะทำ **Auto-Initiate 1-Click SSO (`handleCiamSso()`) ทันทีโดยไม่หยุดค้างที่หน้า Login**
  - สร้าง PKCE (`S256`) + `state` -> Redirect ไปยัง Central IAM -> Central IAM ทำ Zero-Prompt Auto-Approval -> ส่ง `code` กลับมาที่ `/auth/callback` -> ตรวจสอบลายเซ็น `RS256` ผ่าน `/.well-known/jwks.json` -> พาเข้าสู่หน้าหลังบ้านตามสิทธิ์ทันที
- **เมื่อต้องการเข้าสู่ระบบด้วย Local DB / AD โดยตรง (ไม่ผ่าน SSO):**
  - สามารถเข้าผ่าน URL `/backoffice?local=1` หรือเมื่อกดปุ่ม `"กลับสู่หน้าเข้าสู่ระบบหลังบ้าน"` หรือเมื่อ Logout จากบัญชี Local ระบบจะตั้งค่า `sessionStorage.setItem("bo_manual_login", "1")` เพื่อแสดงฟอร์มกรอก Username/Password โดยไม่เด้งไป SSO ซ้ำ
- **เมื่อกดปุ่ม "ออกจากระบบ (Logoff)" หรือ Session หมดอายุ (HTTP 401):**
  - หากเข้าใช้งานผ่าน **SSO (`bo_auth_provider === "sso"`)**: ระบบจะล้าง Session ของ ProRegis แล้วนำทางกลับไปยังหน้า **Central IAM Portal (`https://ciam.windowasia.com/portal`)** ทันที
  - หากเข้าใช้งานผ่าน **Local (`bo_auth_provider === "local"`)**: ระบบจะกลับมายังหน้า `/backoffice?local=1`

### 2.3 โหมดฉุกเฉิน Break-Glass (ISO 27001)
- เมื่อเปิด `ciam_break_glass_active = true`:
  - ระบบจะบล็อกการล็อกอินผ่าน SSO (`HTTP 503`) และซ่อนปุ่ม SSO บนหน้า Login
  - แสดงแถบแจ้งเตือนสีเหลือง/ส้มบนหน้า Login ให้เข้าใช้งานด้วยรหัสผ่านตรง
  - การยืนยันตัวตนแบบ `AD` จะสลับไปยิงตรงหา Local AD Gateway (`ciam_ad_gateway_url` เช่น `http://172.18.0.1:3100`) ก่อนแล้วจึง Fallback ไปยัง LDAP
  - บันทึก Audit Log หมวด `security_break_glass` (`BG-01`, `BG-02`) และแจ้งเตือนผ่าน Telegram ทันที

### 2.4 โครงสร้างหน้า System Settings แบบแยกแท็บ (`/backoffice/settings`)
หน้าตั้งค่าระบบถูกจัดระเบียบเป็น **8 แท็บหมวดหมู่** เพื่อให้ดูแลรักษาง่าย:
1. **ทั่วไป & QR Code (`GENERAL`):** โหมด QR (`STATIC`/`DYNAMIC`), โหมดยืนยันตัวตนลูกค้า (`OTP`/`LINE`), อายุรับประกันเริ่มต้น, ลิงก์ Google Maps
2. **Central IAM (SSO) (`CIAM`):** สถานะ Online/Offline, ปุ่มทดสอบการเชื่อมต่อ (`test-connection`), ปุ่มซิงก์บัญชีผู้ใช้ทันที (`sync-now`), ตั้งค่า OIDC Client ID/Secret (Masked), Default Group และแผงควบคุมฉุกเฉิน Break-Glass
3. **AI Copilot (`AI`):** สวิตช์เปิด/ปิด Floating Chat Widget, เลือก Provider (`google`, `openai`, `anthropic`, `ollama`, `custom`), Model, API Key (Masked), System Prompt, MCP Tools Toggle และปุ่มทดสอบ API Key
4. **SMS Gateway (`SMS`):** ตั้งค่าโหมด `TEST`/`LIVE`, SMSMKT API Key & Secret, Sender Name
5. **Email SMTP (`EMAIL`):** ตั้งค่าโหมด `TEST`/`LIVE`, SMTP Host/Port/User/Password
6. **Telegram Alert (`TELEGRAM`):** ตั้งค่า Bot Token, Group Chat ID และปุ่มส่งข้อความทดสอบ
7. **SAP B1 ERP (`SAP`):** ตั้งค่า Service Layer URL, Company DB, Username/Password
8. **Danger Zone (`DANGER`):** ล้างข้อมูลประวัติการลงทะเบียนและรีเซ็ตลำดับ QR Code (เฉพาะ `SYSTEM_ADMIN`)

---

## 3. ตารางฐานข้อมูลสำคัญที่เพิ่มใหม่

1. **`system_settings`** (`api/src/backoffice/system-setting.entity.ts`):
   - คอลัมน์: `key` (PK, varchar), `value` (varchar), `description` (varchar), `category` (varchar), `data_type` (varchar), `updated_at` (timestamp)
   - หมวดหมู่ที่รองรับ: `general`, `central_iam`, `ai_copilot`
2. **`transaction_logs`** (`api/src/audit/transaction-log.entity.ts`):
   - ตารางบันทึก ISO 27001 Security Audit Trail แยกตาม Event Code (`SSO-01` ถึง `SSO-04`, `BG-01`, `BG-02`, `CFG-01`)
   - แสดงผลในหน้า `/backoffice/logs` (แท็บ `CIAM & ISO 27001 Transaction Logs`)
