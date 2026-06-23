// server-https.mjs — Next.js HTTPS dev server
// รัน: node server-https.mjs
import { createServer } from 'https';
import { parse } from 'url';
import next from 'next';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // รับทุก interface (LAN + localhost)
const port = parseInt(process.env.PORT || '443');

const certDir = path.join(__dirname, 'certs');
const httpsOptions = {
  key: fs.readFileSync(path.join(certDir, 'key.pem')),
  cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
};

const app = next({ dev, hostname: '0.0.0.0', port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`✅ ProRegis Web (HTTPS) running on:`);
    console.log(`   Local:   https://localhost:${port}`);
    console.log(`   Network: https://192.168.68.104:${port}`);
  });
});
