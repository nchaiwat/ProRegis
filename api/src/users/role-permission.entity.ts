import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn({ type: 'varchar' })
  role: string; // e.g. SYSTEM_ADMIN, QR_GENERATOR, CRM_MANAGER

  @Column('simple-array', { name: 'allowed_menus' })
  allowedMenus: string[]; // List of allowed menu keys: ['dashboard', 'checker', 'generate', 'production-tracker', 'crm', 'users', 'groups', 'logs']
}
