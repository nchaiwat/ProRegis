import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('generation_logs')
export class GenerationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'username' })
  username: string;

  @Column({ type: 'varchar', name: 'doc_num' })
  docNum: string;

  @Column({ name: 'start_seq' })
  startSeq: number;

  @Column({ name: 'quantity' })
  quantity: number;

  @Column({ type: 'varchar', name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt: Date;
}

