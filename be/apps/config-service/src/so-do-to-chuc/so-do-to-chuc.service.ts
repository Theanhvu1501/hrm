import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Employee, OrgUnit } from '@app/entities';
import { CreateOrgUnitDto, UpdateOrgUnitDto } from './dto';
import { dungCay, duongDan, hauDue, type NutCay } from './lib/cayToChuc';

function objectId(id: string, ten = 'id'): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw new NotFoundException(`${ten} không hợp lệ: ${id}`);
  }
}

export interface ChucDanhChon {
  id: string;
  ten: string;
  duongDan: string;
  vaiTro?: string;
  departmentId?: string | null;
}

@Injectable()
export class SoDoToChuc_Service {
  constructor(
    @InjectRepository(OrgUnit) private readonly repo: Repository<OrgUnit>,
    @InjectRepository(Employee)
    private readonly nhanVienRepo: Repository<Employee>,
  ) {}

  private dsHieuLuc(): Promise<OrgUnit[]> {
    return this.repo.find({ where: { isActive: true } as any });
  }

  async cay(): Promise<NutCay[]> {
    return dungCay(await this.dsHieuLuc());
  }

  /**
   * Danh sách CHỨC DANH để đổ ô chọn ở Hồ sơ nhân viên và Quá trình công tác.
   * Nhãn là đường dẫn đầy đủ: hai phòng cùng có "Trưởng nhóm" thì chỉ tên lá
   * không phân biệt được người ta đang chọn cái nào.
   */
  async danhSachChucDanh(): Promise<ChucDanhChon[]> {
    const ds = await this.dsHieuLuc();
    return ds
      .filter((u) => u.loai === 'chuc_danh')
      .map((u) => ({
        id: u.id,
        ten: u.ten,
        duongDan: duongDan(u.id, ds),
        vaiTro: u.vaiTro,
        departmentId: u.departmentId ?? null,
      }))
      .sort((a, b) => a.duongDan.localeCompare(b.duongDan, 'vi'));
  }

  async findOne(id: string): Promise<OrgUnit> {
    const item = await this.repo.findOne({
      where: { _id: objectId(id) as any },
    });
    if (!item || !item.isActive) {
      throw new NotFoundException('Không tìm thấy đơn vị trong sơ đồ tổ chức');
    }
    return item;
  }

  async create(dto: CreateOrgUnitDto): Promise<OrgUnit> {
    await this.kiemCha(dto.parentId);
    return this.repo.save(
      this.repo.create({
        ...dto,
        parentId: dto.parentId || null,
        loai: dto.loai ?? 'phong_ban',
        thuTu: dto.thuTu ?? 0,
        isActive: true,
      } as Partial<OrgUnit>),
    );
  }

  async update(id: string, dto: UpdateOrgUnitDto): Promise<OrgUnit> {
    const item = await this.findOne(id);

    if (dto.parentId !== undefined) {
      const chaMoi = dto.parentId || null;
      if (chaMoi) {
        await this.kiemCha(chaMoi);
        // Đặt một nút làm con của chính hậu duệ nó tạo ra một vòng: cây không
        // dựng được nữa và cả màn hình trắng. Chặn tại đây vì sau khi ghi thì
        // chỉ sửa được bằng cách vào thẳng MongoDB.
        const ds = await this.dsHieuLuc();
        if (hauDue(id, ds).has(chaMoi)) {
          throw new BadRequestException(
            'Không thể chuyển đơn vị vào bên dưới chính nó',
          );
        }
      }
      dto.parentId = chaMoi;
    }

    Object.assign(item, dto);
    return this.repo.save(item);
  }

  /**
   * Xoá mềm. Chặn khi còn đơn vị con hoặc còn nhân viên đang mang chức danh
   * này: xoá xong thì nhánh con thành mồ côi và hồ sơ nhân viên trỏ vào một
   * chức danh không còn tồn tại — hai thứ chỉ lộ ra nhiều tháng sau.
   */
  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    const ds = await this.dsHieuLuc();

    const con = ds.filter((u) => u.parentId === id);
    if (con.length) {
      throw new BadRequestException(
        `Đơn vị này còn ${con.length} đơn vị con — chuyển hoặc xoá chúng trước.`,
      );
    }

    const dangDung = await this.nhanVienRepo.count({
      chucDanh: item.ten,
      isActive: true,
    } as any);
    if (dangDung > 0) {
      throw new BadRequestException(
        `Còn ${dangDung} nhân viên đang giữ chức danh "${item.ten}" — đổi chức danh cho họ trước.`,
      );
    }

    item.isActive = false;
    await this.repo.save(item);
  }

  private async kiemCha(parentId?: string | null): Promise<void> {
    if (!parentId) return;
    const cha = await this.repo.findOne({
      where: { _id: objectId(parentId, 'parentId') as any },
    });
    if (!cha || !cha.isActive) {
      throw new BadRequestException('Đơn vị cha không tồn tại');
    }
    if (cha.loai === 'chuc_danh') {
      // Chức danh là LÁ. Cho phép treo nút dưới một chức danh là mở đường cho
      // "Trưởng phòng > Phòng Kinh doanh", đọc ngược hẳn nghĩa sơ đồ tổ chức.
      throw new BadRequestException(
        'Không thể đặt đơn vị bên dưới một chức danh',
      );
    }
  }
}
