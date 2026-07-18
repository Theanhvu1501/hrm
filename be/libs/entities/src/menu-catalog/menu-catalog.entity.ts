import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

// Tầng FEATURE: ánh xạ menu (route FE) ↔ API path-prefix (sau gateway).
// Keyed theo tính năng, KHÔNG theo lĩnh vực → thêm/đổi lĩnh vực không đụng tới đây.
@Entity('menu_catalog')
export class MenuCatalog extends BaseEntity {
  @Column({ unique: true })
  menuKey: string; // = key route FE, vd '/danh-muc/hang-hoa-vat-tu'

  @Column()
  label: string;

  @Column({ nullable: true })
  parentLabel: string;

  // API path-prefix (gồm prefix service) mà menu này gọi tới.
  // Rỗng = menu chưa có API (ComingSoon) → không enforce.
  @Column({ type: 'json', default: [] })
  apiPrefixes: string[]; // vd ['/master-data/hang-hoa-vat-tu']
}
