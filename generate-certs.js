// generate-certs.js
// สร้าง self-signed certificate สำหรับ HTTPS development
// รัน: node generate-certs.js
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const LAN_IP = '192.168.68.104'; // Wi-Fi IP ของเครื่อง

const attrs = [
  { name: 'commonName', value: 'ProRegis Dev' },
  { name: 'organizationName', value: 'Window Asia' },
  { name: 'countryName', value: 'TH' },
];

const opts = {
  keySize: 2048,
  days: 825, // iOS/Android จำกัดไม่เกิน 825 วัน
  algorithm: 'sha256',
  extensions: [
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },     // DNS: localhost
        { type: 7, ip: '127.0.0.1' },        // IP: loopback
        { type: 7, ip: LAN_IP },             // IP: LAN Wi-Fi
      ],
    },
    { name: 'basicConstraints', cA: true },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
    },
  ],
};

console.log('🔐 Generating self-signed certificate...');
console.log(`   Covering: localhost, 127.0.0.1, ${LAN_IP}`);

const pems = selfsigned.generate(attrs, opts);

const certDir = path.join(__dirname, 'certs');
fs.mkdirSync(certDir, { recursive: true });

fs.writeFileSync(path.join(certDir, 'cert.pem'), pems.cert);
fs.writeFileSync(path.join(certDir, 'key.pem'), pems.private);

console.log('✅ Certificates saved to ./certs/');
console.log('   cert.pem — install this on your mobile device to trust it');
console.log('   key.pem  — private key (keep secret)');
console.log('');
console.log('📱 Mobile setup:');
console.log(`   1. Copy certs/cert.pem to your phone`);
console.log(`   2. iOS: Settings → General → VPN & Device Management → Install cert`);
console.log(`   3. Android: Settings → Security → Install certificate`);
console.log(`   4. iOS only: Settings → General → About → Certificate Trust Settings → Enable`);
console.log(`   5. Open https://${LAN_IP}:3443 on your phone`);
