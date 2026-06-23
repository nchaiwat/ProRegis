const crypto = require('crypto');

// 1. กำหนด Key ลับขนาด 16 bytes (128-bit) และ IV (Initialization Vector) ขนาด 16 bytes
// ในการผลิตจริง ควรใช้ Key และ IV ที่เป็นความลับและเก็บไว้ใน Environment Variables (.env)
const SECRET_KEY = crypto.createHash('sha256').update('WindowAsiaSecretKey2026').digest().slice(0, 16); // 16 bytes key
const IV = crypto.createHash('sha256').update('WindowAsiaIV2026').digest().slice(0, 16); // 16 bytes IV

/**
 * ฟังก์ชันสำหรับเข้ารหัสข้อมูลในโรงงาน (ผลิต QR Code)
 * @param {string} docNum เลขที่ใบสั่งผลิต (เช่น 260600700)
 * @param {number|string} seqNum ลำดับที่ของสินค้าในใบสั่งผลิตนั้น (เช่น 1 หรือ 001)
 * @returns {string} Public Token สั้น ๆ ที่ปลอดภัยและเดาไม่ได้
 */
function encryptToToken(docNum, seqNum) {
  // รวมข้อมูลเป็นชุด เช่น "260600700:001"
  const rawData = `${docNum}:${seqNum}`;
  
  const cipher = crypto.createCipheriv('aes-128-cbc', SECRET_KEY, IV);
  let encrypted = cipher.update(rawData, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // แปลง Base64 ให้เหมาะสำหรับใส่ใน URL (Base64URL) 
  // โดยการเปลี่ยน + เป็น - และเปลี่ยน / เป็น _ และลบเครื่องหมาย = ออก
  return encrypted
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * ฟังก์ชันสำหรับถอดรหัสบนเซิร์ฟเวอร์ Cloud (เมื่อลูกค้าสแกน QR)
 * @param {string} token รหัส Public Token ที่ดึงมาจาก URL
 * @returns {{docNum: string, seqNum: string}|null} ข้อมูลใบสั่งผลิตและลำดับสินค้าที่ถอดรหัสได้ (หรือ null ถ้ารหัสไม่ถูกต้อง)
 */
function decryptToken(token) {
  try {
    // แปลง Base64URL กลับมาเป็น Base64 แบบปกติ
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const decipher = crypto.createDecipheriv('aes-128-cbc', SECRET_KEY, IV);
    let decrypted = decipher.update(base64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // แยกข้อมูลด้วยเครื่องหมาย :
    const parts = decrypted.split(':');
    if (parts.length === 2) {
      return {
        docNum: parts[0],
        seqNum: parts[1]
      };
    }
    return null;
  } catch (error) {
    // ถ้ารหัสโดนแก้หรือเดามา จะเกิด Error ในการถอดรหัสและส่งค่ากลับเป็น null
    return null;
  }
}

// ==========================================
// ทดสอบการใช้งานจริง
// ==========================================

console.log("=== เริ่มทดสอบระบบ Cryptographic Stateless Token ===");

const docNum = "260600700";
const seqNum = "015";

console.log(`\n1. ข้อมูลนำเข้าจาก SAP B1:`);
console.log(`   - เลขที่ใบสั่งผลิต (DocNum): ${docNum}`);
console.log(`   - ลำดับสินค้าที่ผลิตสำเร็จ (SeqNum): ${seqNum}`);

// เข้ารหัสเพื่อสร้าง Token ที่โรงงานพิมพ์
const token = encryptToToken(docNum, seqNum);
console.log(`\n2. ผลลัพธ์รหัสสุ่มสำหรับพิมพ์ QR Code (Public Token):`);
console.log(`   - Token: "${token}" (ยาวเพียง ${token.length} ตัวอักษร)`);
console.log(`   - URL จริง: https://proregis.windowasia.com/p/${token}`);

// ถอดรหัสจำลองเมื่อลูกค้าสแกน
const decrypted = decryptToken(token);
console.log(`\n3. จำลองลูกค้าสแกนสิทธิพิเศษ (ถอดรหัสบน Cloud):`);
if (decrypted) {
  console.log(`   - ถอดรหัสสำเร็จ!`);
  console.log(`   - ได้ค่า DocNum: ${decrypted.docNum}`);
  console.log(`   - ได้ค่า SeqNum: ${decrypted.seqNum}`);
} else {
  console.log(`   - ถอดรหัสล้มเหลว!`);
}

// จำลองกรณีลูกค้าพยายามเดารหัสเล่น (เปลี่ยนตัวอักษรบางตัวใน Token)
const hackedToken = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
console.log(`\n4. จำลองกรณีลูกค้าแฮกเกอร์ลองเดารหัสแก้ตัวท้าย:`);
console.log(`   - Token ที่ถูกแก้ไข: "${hackedToken}"`);
const hackResult = decryptToken(hackedToken);
if (hackResult) {
  console.log(`   - ผลลัพธ์: สำเร็จ (ผิดปกติ!): DocNum=${hackResult.docNum}, SeqNum=${hackResult.seqNum}`);
} else {
  console.log(`   - ผลลัพธ์: ล้มเหลว! (ระบบตรวจจับได้ว่ารหัสปลอม ปฏิเสธการลงทะเบียนทันที)`);
}
