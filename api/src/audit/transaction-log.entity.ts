import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('transaction_logs')
export class TransactionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_trans_logs_category')
  @Column({ type: 'varchar', length: 50 })
  category: string; // 'ciam_sso', 'security_break_glass', 'system_setting'

  @Column({ type: 'varchar', length: 100 })
  action: string; // e.g., 'login_success', 'login_failed', 'toggle_break_glass'

  @Column({ type: 'varchar', length: 20, default: 'success' })
  status: string; // 'success', 'failed', 'warning', 'info'

  @Column({ type: 'varchar', length: 500 })
  message: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ name: 'records_count', type: 'int', default: 0 })
  recordsCount: number;

  @Column({ name: 'duration_ms', type: 'int', default: 0 })
  durationMs: number;

  @Column({ name: 'triggered_by', type: 'varchar', length: 100 })
  triggeredBy: string;

  @Index('idx_trans_logs_created_at')
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
