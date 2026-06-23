import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_username' })
  actorUsername: string;

  @Column()
  action: string; // e.g., 'LOGIN', 'QR_GENERATE', 'VIEW_PII', 'EXPORT_PII'

  @Column()
  resource: string; // e.g., 'User', 'Registration', 'QR_Batch'

  @Column({ type: 'varchar', name: 'resource_id', nullable: true })
  resourceId: string | null;

  @Column({ type: 'varchar', name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null; // JSON details (strict: no sensitive PII inside)

  @CreateDateColumn({ name: 'logged_at' })
  loggedAt: Date;
}
