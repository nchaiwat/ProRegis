import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('products_metadata')
export class ProductMetadata {
  @PrimaryColumn({ type: 'varchar', name: 'item_code' })
  itemCode: string;

  @Column({ type: 'varchar', name: 'item_name', nullable: true })
  itemName: string | null;

  @Column({ type: 'text', name: 'image_base64', nullable: true })
  imageBase64: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
