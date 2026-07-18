import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('app_user_roles')
@Index('IDX_app_user_role_unique', ['userId', 'tenantId'], { unique: true })
export class AppUserRole extends BaseEntity {
  @Column() userId: string;
  @Column() declare tenantId: string;
  @Column({ default: 'KIEM_SOAT' }) role: string;  // vai trò CHỨC NĂNG của Kế toán
  @Column({ default: true }) isActive: boolean;
}

export interface AppUserRoleEntities {
  AppUserRole: typeof AppUserRole;
}

declare module '../entities' {
  interface Entities extends AppUserRoleEntities {}
}
