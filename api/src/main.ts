import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
  // ---------------------------------------------------------------------------
  // HTTPS support — ถ้ามี certs ให้รันแบบ HTTPS (สำหรับ mobile testing)
  // ---------------------------------------------------------------------------
  const certDir = path.join(process.cwd(), '..', 'web', 'certs');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');

  const useHttps = fs.existsSync(keyPath) && fs.existsSync(certPath);

  const app = await NestFactory.create(AppModule, {
    ...(useHttps && {
      httpsOptions: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
  });

  // Enable Cross-Origin Resource Sharing (CORS) for frontend requests
  app.enableCors({
    origin: '*', // In production, replace with specific frontend domains
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT ?? (useHttps ? 3444 : 3001);
  await app.listen(port, '0.0.0.0');

  const protocol = useHttps ? 'https' : 'http';
  console.log(`[NESTJS BACKEND] Running on ${protocol}://0.0.0.0:${port}`);
  if (useHttps) {
    const localIp = getLocalIp();
    console.log(`[NESTJS BACKEND] HTTPS enabled — LAN: https://${localIp}:${port}`);
  }
}
bootstrap();

