const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 1. กำหนด Key ลับและ IV เหมือนกับหลังบ้านเว็บ
const SECRET_KEY = crypto.createHash('sha256').update('WindowAsiaSecretKey2026').digest().slice(0, 16);
const IV = crypto.createHash('sha256').update('WindowAsiaIV2026').digest().slice(0, 16);
const BASE_URL = 'https://proregis.windowasia.com/p';

/**
 * เข้ารหัสและแปลงเป็น Base64URL
 */
function encryptToToken(docNum, seqNum) {
  const rawData = `${docNum}:${seqNum}`;
  const cipher = crypto.createCipheriv('aes-128-cbc', SECRET_KEY, IV);
  let encrypted = cipher.update(rawData, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * ฟังก์ชันหลักในการสร้างไฟล์ CSV สำหรับงานพิมพ์ล็อตใหญ่
 * @param {string} docNum เลขที่ใบสั่งผลิต
 * @param {number} quantity จำนวนสินค้าที่ต้องการผลิตในล็อตนี้
 */
function generateQRLot(docNum, quantity) {
  const csvRows = [];
  
  // หัวข้อคอลัมน์ของ CSV (Header)
  csvRows.push('DocNum,Sequence,InternalCode,PublicToken,QRCodeURL');
  
  for (let i = 1; i <= quantity; i++) {
    // กำหนดลำดับเป็นเลข 3 หลัก เช่น 001, 002
    const seqStr = String(i).padStart(3, '0');
    const internalCode = `${docNum}-${seqStr}`;
    const token = encryptToToken(docNum, seqStr);
    const qrUrl = `${BASE_URL}/${token}`;
    
    // ใส่ข้อมูลในแต่ละแถว
    csvRows.push(`${docNum},${seqStr},${internalCode},${token},${qrUrl}`);
  }
  
  // กำหนดชื่อไฟล์บันทึกตามเลขที่ใบสั่งผลิต
  const fileName = `QR_Print_Job_${docNum}.csv`;
  const filePath = path.join(__dirname, fileName);
  
  fs.writeFileSync(filePath, csvRows.join('\n'), 'utf8');
  
  console.log(`\n=== สร้างคิวงานพิมพ์เสร็จเรียบร้อย! ===`);
  console.log(`ไฟล์เซฟอยู่ที่: ${filePath}`);
  console.log(`จำนวนแถวที่บันทึก: ${quantity} แถว`);
  console.log(`------------------------------------`);
  console.log(`สามารถนำไฟล์ CSV นี้ไป Import เข้าโปรแกรม BarTender หรือเครื่องพิมพ์สติกเกอร์ที่โรงงานเพื่อสั่งพิมพ์สติกเกอร์บาร์โค้ดล็อตใหญ่ได้ทันที!`);
}

// รับค่าจาก Command Line Arguments
// รูปแบบการพิมพ์ใช้งาน: node qr_batch_generator.js <เลขใบสั่งผลิต> <จำนวนที่จะพิมพ์>
// ตัวอย่าง: node qr_batch_generator.js 260600700 20
const args = process.argv.slice(2);
const inputDocNum = args[0] || "260600700";
const inputQty = parseInt(args[1], 10) || 20;

generateQRLot(inputDocNum, inputQty);
