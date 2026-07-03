import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { OtpModule } from './otp/otp.module';
import { RegistrationModule } from './registration/registration.module';
import { BackofficeModule } from './backoffice/backoffice.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { SapModule } from './sap/sap.module';
import { Registration } from './registration/registration.entity';
import { GenerationLog } from './backoffice/generation-log.entity';
import { User } from './users/user.entity';
import { RolePermission } from './users/role-permission.entity';
import { AuditLog } from './audit/audit-log.entity';
import { ProductionOrder } from './production-order/production-order.entity';
import { ProductMetadata } from './products/product-metadata.entity';
import { SystemSetting } from './backoffice/system-setting.entity';

@Module({
  imports: [
    // Load .env variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Asynchronous TypeORM Configuration linked to PostgreSQL env variables
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DB_HOST', '127.0.0.1');
        const port = configService.get<number>('DB_PORT', 5439);
        const username = configService.get<string>('DB_USERNAME', 'postgres');
        const password = configService.get<string>('DB_PASSWORD', 'postgrespassword');
        const database = configService.get<string>('DB_DATABASE', 'proregis');
        
        console.log('[DEBUG DB CONFIG]', { host, port, username, passwordLength: password?.length, database });
        
        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: [Registration, GenerationLog, User, AuditLog, ProductionOrder, RolePermission, ProductMetadata, SystemSetting],
          synchronize: true, // Automatically updates tables to match entity schema (Dev mode only)
        };
      },
    }),
    ProductsModule,
    OtpModule,
    RegistrationModule,
    BackofficeModule,
    UsersModule,
    AuditModule,
    AuthModule,
    CrmModule,
    SapModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
