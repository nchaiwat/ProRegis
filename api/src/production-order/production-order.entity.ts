import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('production_orders')
export class ProductionOrder {
  @PrimaryColumn({ type: 'varchar', name: 'doc_num' })
  docNum: string; // Production Order (9 digits)

  @Column({ type: 'varchar', name: 'item_code' })
  itemCode: string; // Item Code from SAP B1 (e.g. FA00-D0112-200205)

  @Column({ type: 'varchar', name: 'item_name', nullable: true })
  itemName: string | null; // Item Name/Description from SAP B1

  @Column({ type: 'integer', name: 'planned_qty', default: 0 })
  plannedQty: number; // Planned Quantity from SAP B1 (total item count in Lot)

  @Column({ type: 'varchar', name: 'order_date', nullable: true })
  orderDate: string | null; // SAP B1 PostingDate

  @Column({ type: 'varchar', name: 'start_date', nullable: true })
  startDate: string | null; // SAP B1 StartDate

  @Column({ type: 'varchar', name: 'status', nullable: true })
  status: string | null; // SAP B1 ProductionOrderStatus

  @Column({ type: 'integer', name: 'completed_qty', default: 0 })
  completedQty: number; // SAP B1 CompletedQuantity

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
