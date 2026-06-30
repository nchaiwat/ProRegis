import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  QR_GENERATOR = 'QR_GENERATOR',
  CRM_MANAGER = 'CRM_MANAGER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'system_seq_id', type: 'integer', generated: 'increment', unique: true })
  systemSeqId: number;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'first_name', type: 'varchar', default: '' })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', default: '' })
  lastName: string;

  @Column({ name: 'department', type: 'varchar', default: '' })
  department: string;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string | null;

  @Column({ name: 'mobile', type: 'varchar', nullable: true })
  mobile: string | null;

  @Column({ name: 'telegram_id', type: 'varchar', nullable: true })
  telegramId: string | null;

  @Column({ name: 'pin_code', type: 'varchar', length: 6, nullable: true })
  pinCode: string | null;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date | null;

  @Column({
    type: 'varchar',
    default: UserRole.CRM_MANAGER,
  })
  role: UserRole;

  @Column({
    type: 'varchar',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'failed_attempts', default: 0 })
  failedAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
