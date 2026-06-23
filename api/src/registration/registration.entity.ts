import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('registrations')
export class Registration {
  @PrimaryColumn()
  id: string;

  @Column()
  token: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column('text')
  address: string;

  @Column()
  province: string;

  @Column({ name: 'postal_code' })
  postalCode: string;

  @Column()
  phone: string;

  @Column({ type: 'varchar', name: 'email', nullable: true })
  email: string | null;

  @Column({ name: 'mandatory_consent', default: false })
  mandatoryConsent: boolean;

  @Column({ name: 'optional_consent', default: false })
  optionalConsent: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;

  @Column({ default: 'WARRANTY_ACTIVE' })
  status: string;

  @Column({ type: 'varchar', name: 'doc_num', nullable: true })
  docNum: string | null; // Production Order (9 หลัก) ถอดรหัสจาก QR

  @Column({ type: 'varchar', name: 'seq_num', nullable: true })
  seqNum: string | null; // Running number (3 หลัก) ของสินค้าใน Lot

  @Column({ type: 'varchar', name: 'line_user_id', nullable: true })
  lineUserId: string | null; // LINE User ID (รองรับ LIFF ในอนาคต)
}

