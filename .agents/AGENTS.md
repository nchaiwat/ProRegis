# ProRegis — System Summary (AGENTS.md)

> **⚠️ AI ต้องอ่านไฟล์นี้ทุกครั้งก่อนเริ่มทำงาน** เพื่อเข้าใจ Business Logic และ Flow ของระบบก่อนแก้ไข Code ใดๆ

---

## 1. ภาพรวมระบบ

**ProRegis** คือระบบลงทะเบียนรับประกันสินค้าของบริษัท Window Asia โดยลูกค้าสแกน QR Code จากสินค้า (หน้าต่าง/กระจก) เพื่อลงทะเบียนรับประกัน

### Technology Stack
| Layer | Technology |
|---|---|
| Frontend (Customer + Backoffice) | Next.js 14 (App Router) + TypeScript |
| Backend API | NestJS + TypeScript |
| Database | PostgreSQL (TypeORM) |
| Reverse Proxy | Nginx |
| Container | Docker Compose |
| SMS OTP Provider | SMSMKT API |
| Maps | Google Maps Platform |
| ERP Integration | SAP Business One Service Layer |

### URL (Local Development)
- **Customer Registration:** `http://localhost/p/{token}`
- **Backoffice:** `http://localhost/backoffice`
- **API:** `http://localhost/api`

### Start/Rebuild Command
```powershell
docker compose -f docker-compose.local.yml up -d --build
```

---

## 2. QR Code 2 ระบบ (สำคัญมาก)

ระบบรองรับ QR Code 2 ประเภทพร้อมกัน Logic ระหว่างสองระบบต้องไม่ปนกัน:

### Static QR
- QR Code 1 ใบต่อ 1 รุ่นสินค้า (ItemCode/DocNum)
- Token ยาว **9 หลัก** = DocNum ตรงๆ (เช่น `260503702`)
- Token ยาว **12 หลัก** = DocNum (9) + SeqNum (3) แต่ในโหมด Static ใช้แค่ 9 หลักแรก
- ลูกค้าหลายคนใช้ QR เดิมซ้ำได้ -> ระบบนับจำนวนชิ้น (Unit Count) ต่อรุ่น
- มี Duplicate Check Logic (ดู Section 4)

### Dynamic QR
- QR Code 1 ใบต่อ 1 ชิ้นสินค้า (AES Encrypted)
- Token ยาว **12 หลัก** encrypted -> ถอดรหัสผ่าน `/backoffice/decrypt` -> ได้ DocNum + SeqNum
- ลงทะเบียนได้ครั้งเดียวต่อ QR Code
- ไม่มี Duplicate Check Modal

### การตรวจสอบ Mode
- ค่า `qrMode` ถูก set จาก Product record ใน DB (field `qrMode`: `"STATIC"` หรือ `"DYNAMIC"`)
- Frontend ดึงค่านี้จาก `/products/{docNum}` response

---

## 3. Session Management (2 Layer)

ระบบใช้ localStorage เก็บ Session 2 ชั้นแยกกัน:

### Layer 1: Profile Session
```
Key: "proregis_customer_session"
อายุ: 1 ชั่วโมง
เก็บ: firstName, lastName, address, province, postalCode, phone, email, timestamp
```
- บันทึกหลังลงทะเบียนสำเร็จ
- ใช้สำหรับ autofill ฟอร์มครั้งถัดไป และข้าม OTP
- **ถูกลบเมื่อ:** ลูกค้าเลือก "ลงทะเบียนบ้านหลังใหม่"

### Layer 2: OTP Session
```
Key: "proregis_otp_session"
อายุ: 30 นาที
เก็บ: phone, verifiedAt
```
- บันทึกทันทีที่ OTP ยืนยันสำเร็จ
- ใช้สำหรับข้าม OTP ถ้าเบอร์เดิมยังในช่วง 30 นาที
- **ไม่ถูกลบ** เมื่อลงทะเบียนบ้านใหม่ -> ทำให้บ้านหลังใหม่ไม่ต้องทำ OTP ซ้ำ
- ถูกลบเองเมื่อหมดอายุ 30 นาที

### OTP Bypass Priority (ตรวจตามลำดับ)
1. `verificationMode === "LINE"` -> ข้าม (ใช้ LINE Auth แทน)
2. `hasActiveSession === true` (Profile Session ใน 1 ชั่วโมง) -> ข้าม
3. OTP Session ตรงเบอร์ + ยังไม่เกิน 30 นาที -> ข้าม
4. ไม่มีเงื่อนใดเลย -> ส่ง SMS OTP จริง

---

## 4. Static QR — Duplicate Registration Flow (สำคัญมาก)

### ขั้นตอนการลงทะเบียน (ลูกค้าใหม่ครั้งแรก)
```
Step 1: ข้อมูลสินค้า (ดึงจาก DB -> fallback SAP B1)
Step 2: ยอมรับ PDPA Consent
Step 3: กรอกเบอร์โทร -> OTP -> เปิดฟอร์มข้อมูล -> Submit
Step 4: Dashboard รับประกัน (แสดง 1 ชิ้น, ประวัติ, สิทธิประโยชน์)
```

### Flow หลัง OTP ยืนยันสำเร็จ (Static QR เท่านั้น)
```
OTP ผ่าน -> บันทึก OTP Session ->
  call /registration/check-status (docNum + phone + GPS)
    พบแล้ว N ชิ้น -> Modal ถาม:
      [ลงทะเบียนชิ้นที่ N+1] -> call /registration/add-unit -> Dashboard
      [ลงทะเบียนบ้านหลังใหม่] -> ลบ Profile Session -> reload Step 1
    ไม่พบ -> isPhoneVerified = true -> เปิดฟอร์มข้อมูล
```

### กรณี "ลงทะเบียนเพิ่มเติม" จาก Dashboard (Step 4)
```
กด "ลงทะเบียนเพิ่มเติม" -> เปิด QR Scanner ->
  Scan QR เดียวกัน (Static) -> แสดง Duplicate Modal ทันที
  Scan QR ต่างกัน -> router.push('/p/{newToken}')
```

### API check-status ตรวจอะไร
- รับ: `{ docNum, phone, latitude, longitude }`
- ถ้า GPS ห่างกัน > 500 เมตร -> ถือเป็นบ้านหลังใหม่ (`existingAtOtherSite: true`)
- Return: `{ registered: boolean, count: number, existingAtOtherSite: boolean }`

---

## 5. OTP ระบบ SMS

### Provider: SMSMKT
- API Key: `a7aa2b729a72af46265ea2a15b15e708`
- API Secret: `4bu6uRdNlUKq10ZI`
- ตั้งค่าผ่าน Backoffice > Settings (บันทึกใน DB table `system_settings`)

### โหมด OTP (ตั้งค่าจาก Backoffice)
- `SMS_OTP_MODE = "TEST"` -> ไม่ส่ง SMS จริง, รหัสทดสอบ = `123456`
- `SMS_OTP_MODE = "LIVE"` -> ส่ง SMS จริงผ่าน SMSMKT API

### API Endpoints OTP
- `POST /otp/request` — ขอรหัส OTP (ส่ง SMS หรือ mock)
- `POST /registration/by-phone` — ยืนยัน OTP และดึง Profile เดิม

---

## 6. Backoffice

### URL: `http://localhost/backoffice`
### เมนูหลัก
| เมนู | Path | หน้าที่ |
|---|---|---|
| Dashboard | `/backoffice/dashboard` | สถิติ, แผนที่, กราฟ |
| Product Tracker (Dynamic QR) | `/backoffice/production-tracker/dynamic` | รายการ Dynamic QR |
| Product Tracker (Static QR) | `/backoffice/production-tracker/static` | รายการ Static QR |
| QR Generator | `/backoffice/generate` | สร้าง/พิมพ์ QR Code |
| Checker | `/backoffice/checker` | ตรวจสอบ Token/DocNum |
| CRM | `/backoffice/crm` | ข้อมูลลูกค้า |
| ผู้ใช้งาน | `/backoffice/users` | จัดการ Admin |
| Groups | `/backoffice/groups` | จัดการกลุ่มสินค้า |
| Logs | `/backoffice/logs` | Audit Log |
| Settings | `/backoffice/settings` | ตั้งค่า SMS, SAP, OTP Mode |

---

## 7. โครงสร้าง File สำคัญ

### Frontend (web/)
```
web/src/app/
  p/[token]/page.tsx                          <- หน้าลงทะเบียนลูกค้า (ไฟล์หลัก ~2260+ บรรทัด)
  QrScannerModal.tsx                          <- Component สแกน QR Camera
  translations.ts                             <- ข้อความ TH/EN ทุกหน้า
  backoffice/
    layout.tsx                                <- Sidebar + Auth Guard
    dashboard/page.tsx                        <- Dashboard + แผนที่
    production-tracker/[type]/page.tsx        <- รายการ Dynamic/Static
    generate/page.tsx                         <- QR Generator
    checker/page.tsx                          <- ตรวจสอบ QR/Token
    settings/page.tsx                         <- Settings
    crm/page.tsx                              <- CRM ลูกค้า
  my-warranty/page.tsx                        <- ประวัติรับประกันลูกค้า
```

### Backend (api/src/)
```
api/src/
  registration/   <- Core: ลงทะเบียน, add-unit, check-status, by-phone
  otp/            <- ส่ง/ยืนยัน OTP (SMSMKT + mock mode)
  products/       <- ดึงข้อมูลสินค้าจาก DB หรือ SAP B1
  backoffice/     <- Dashboard stats, QR decrypt, analytics
  sap/            <- SAP B1 Service Layer integration
  auth/           <- JWT Login/Register
  users/          <- จัดการ Admin Users
  audit/          <- บันทึก Log
  telegram/       <- แจ้งเตือน Telegram เมื่อมีลงทะเบียนใหม่
```

---

## 8. Business Rules สำคัญ

1. **Province Normalization:** `"Bangkok"` (EN) ใน DB ต้อง normalize เป็น `"กรุงเทพมหานคร"` ใน analytics
2. **Duplicate Modal Buttons:** ห้ามใช้ "ใช่/ไม่ใช่" ใช้ชื่อ Action เช่น "ลงทะเบียนชิ้นที่ 2" / "ลงทะเบียนบ้านหลังใหม่"
3. **Language:** ถ้าลูกค้าเลือก Province เป็น EN ให้แสดงที่อยู่ทั้งหมดเป็น EN ถ้า TH ให้แสดง TH
4. **ขนาดสินค้า:** แสดงเป็น `กว้าง x ยาว` (ซม.) ค่าเริ่มต้น 100x100
5. **PDPA PDF:** `https://windowasia.com/wp-content/uploads/2024/02/นโยบายการคุ้มครองข้อมูลส่วนบุคคล-.pdf`
6. **Sidebar Menu:** "Product Tracker (Dynamic QR)" และ "Product Tracker (Static QR)"
7. **OTP ไม่ขอซ้ำ:** เบอร์เดิมยืนยันแล้วไม่เกิน 30 นาที ข้ามได้เลย
8. **UI Consistency:** ปุ่มหน้า Customer ต้องมีขนาด `h-12` (48px) ทุกปุ่มเท่ากัน

---

## 9. Environment Variables

### API (`api/.env`)
```
PORT=3001
DB_HOST=127.0.0.1  |  DB_PORT=5439  |  DB_DATABASE=proregis
TELEGRAM_BOT_TOKEN=8231754616:AAHcITgZR6_Gc8XJx-6Fxj-Cyy5bZZQG2hw
SAP_SERVICE_LAYER_URL=http://wa-dbs2.wa.net:50002/b1s/v2
SAP_COMPANY_DB=SBO_WA_Test_20260531  |  SAP_USERNAME=Chaiwat.N
SAP_REJECT_UNAUTHORIZED=false
```

### Web (`web/.env`)
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD9duFEcTHll_DmdTZqfR67DYvG89US5fI
```

### System Settings (เก็บใน DB — แก้ผ่าน Backoffice > Settings)
```
SMS_OTP_MODE=TEST|LIVE
SMS_PROVIDER=SMSMKT
SMS_API_KEY=a7aa2b729a72af46265ea2a15b15e708
SMS_API_SECRET=4bu6uRdNlUKq10ZI
```

---

## 10. Notes สำหรับ Developer

- **SAP Integration:** ดึง ItemCode/Product จาก SAP B1 เป็น fallback ถ้าไม่มีใน DB local
- **GPS:** ต้องใช้ HTTPS สำหรับ `navigator.geolocation` (local ใช้ self-signed cert)
- **Docker Ports:** API:3001 (internal), Web:3000 (internal), Nginx expose 80/443
- **TypeORM:** ใช้ `synchronize: true` ใน local dev — ระวัง production
- **Rebuild:** ต้อง `docker compose -f docker-compose.local.yml up -d --build` ทุกครั้งที่แก้ไฟล์
