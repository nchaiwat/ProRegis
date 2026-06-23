// generate-certs.js — ใช้ Node.js built-in crypto (ไม่ต้องติดตั้ง package เพิ่ม)
// Node 15+ รองรับ X.509 cert generation ผ่าน crypto.X509Certificate
// รัน: node generate-certs.js  (จาก folder web/)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const LAN_IP = '192.168.68.104';

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

console.log('🔐 Generating self-signed certificate via Node.js crypto...');

// Use Node.js built-in X509 generation (Node 22+)
// If older, we'll fall back to a simpler approach
try {
  const { X509Certificate } = crypto;
  
  // Try generating using forge-style approach via exec openssl
  // Actually, let's use a pure JS approach with node-forge
  throw new Error('use forge');
} catch {
  // Fallback: use child_process with node's built-in openssl binding
  const { execSync } = require('child_process');
  
  // Write private key first
  const certDir = path.join(__dirname, 'certs');
  fs.mkdirSync(certDir, { recursive: true });
  
  const keyPath = path.join(certDir, 'key.pem');
  const csrPath = path.join(certDir, 'csr.pem');
  const certPath = path.join(certDir, 'cert.pem');
  
  fs.writeFileSync(keyPath, privateKey);
  
  // Use node's own openssl that comes with the distribution
  const nodeDir = path.dirname(process.execPath);
  const possibleOpenSSL = [
    path.join(nodeDir, 'openssl.exe'),
    path.join(nodeDir, '..', 'openssl', 'openssl.exe'),
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
  ];
  
  let opensslPath = null;
  for (const p of possibleOpenSSL) {
    if (fs.existsSync(p)) {
      opensslPath = p;
      break;
    }
  }
  
  if (opensslPath) {
    console.log(`Found openssl at: ${opensslPath}`);
    
    const sanConf = path.join(certDir, 'san.cnf');
    fs.writeFileSync(sanConf, `[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no
[req_distinguished_name]
CN = ProRegis Dev
O = Window Asia
C = TH
[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = ${LAN_IP}
`);
    execSync(`"${opensslPath}" req -new -key "${keyPath}" -out "${csrPath}" -config "${sanConf}"`, { stdio: 'pipe' });
    execSync(`"${opensslPath}" x509 -req -in "${csrPath}" -signkey "${keyPath}" -out "${certPath}" -days 825 -extensions v3_req -extfile "${sanConf}"`, { stdio: 'pipe' });
    fs.unlinkSync(csrPath);
    fs.unlinkSync(sanConf);
    console.log('✅ Certificate generated with openssl!');
  } else {
    // Pure JS fallback using forge-like manual ASN.1 construction
    // ใช้ selfsigned แบบ async แทน
    console.log('OpenSSL not found, using selfsigned package...');
    generateWithSelfsigned(certDir, certPath, keyPath, LAN_IP, privateKey);
    return;
  }
  
  printInstructions(certDir, certPath, LAN_IP);
}

function generateWithSelfsigned(certDir, certPath, keyPath, lanIp, privKey) {
  const selfsigned = require('selfsigned');
  
  const attrs = [{ name: 'commonName', value: 'ProRegis Dev' }];
  const pems = selfsigned.generate(attrs, {
    keySize: 2048,
    days: 825,
    algorithm: 'sha256',
    extensions: [{
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: lanIp },
      ],
    }],
  });
  
  if (pems && pems.cert) {
    fs.writeFileSync(certPath, pems.cert);
    fs.writeFileSync(path.join(certDir, 'key.pem'), pems.private);
    console.log('✅ Certificate generated with selfsigned!');
  } else {
    console.error('❌ selfsigned failed. pems:', pems);
    process.exit(1);
  }
  printInstructions(certDir, certPath, lanIp);
}

function printInstructions(certDir, certPath, lanIp) {
  console.log('');
  console.log(`📁 Files: ${certDir}`);
  console.log(`   cert.pem — ส่งไฟล์นี้ไปติดตั้งบนมือถือ`);
  console.log(`   key.pem  — private key (อย่าแชร์)`);
  console.log('');
  console.log('📱 วิธีติดตั้ง cert บนมือถือ:');
  console.log(`   iOS: Settings → General → VPN & Device Management → Install Profile`);
  console.log(`        จากนั้น: Settings → General → About → Certificate Trust Settings → เปิด trust`);
  console.log(`   Android: Settings → Security → Encryption & Credentials → Install certificate`);
  console.log('');
  console.log(`🌐 เข้า Web ได้ที่:  https://${lanIp}:3443`);
  console.log(`🔌 API ได้ที่:       https://${lanIp}:3444`);
}
