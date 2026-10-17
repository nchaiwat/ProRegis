import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'varchar' })
  key: string;

  @Column({ type: 'varchar' })
  value: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 50, default: 'general', nullable: true })
  category?: string;

  @Column({ name: 'data_type', type: 'varchar', length: 20, default: 'string', nullable: true })
  dataType?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
