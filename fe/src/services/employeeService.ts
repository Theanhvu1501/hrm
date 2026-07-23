import { ServiceBase } from './base/service-base';

export interface BangCap {
  ten: string;
  noiCap?: string;
  nam?: string;
}

export interface NguoiPhuThuoc {
  hoTen: string;
  quanHe?: string;
  ngaySinh?: string;
  giayTo?: string;
}

export interface LienHeKhanCap {
  hoTen?: string;
  quanHe?: string;
  soDienThoai?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  hoTen: string;
  ngaySinh?: string;
  gioiTinh?: string;
  cccd: string;
  mst?: string;
  soDienThoai?: string;
  email?: string;
  diaChi?: string;
  phongBan?: string;
  chucDanh?: string;
  ngayVaoLam?: string;
  loaiHopDong: string;
  trangThai: string;
  bangCap?: BangCap[];
  nguoiPhuThuoc?: NguoiPhuThuoc[];
  lienHeKhanCap?: LienHeKhanCap;
  isActive: boolean;
  userId?: string;
  workShiftId?: string;
  ngayLamViecTrongTuan?: number[];
  // Công tắc HR trong tab "Chấm công": bật cho nhân viên thị trường/công
  // trình/làm tại nhà — nếu tắt (mặc định), nhân viên đứng ngoài bán kính
  // địa điểm sẽ bị BE chặn chấm công (xem `employee.entity.ts`, Task 1/2).
  choPhepChamNgoaiVung?: boolean;
}

export interface EmployeeFilter {
  hoTen?: string;
  phongBan?: string;
  trangThai?: string;
  isActive?: boolean | string;
}

export interface CreateEmployeeDto {
  hoTen: string;
  cccd: string;
  ngaySinh?: string;
  gioiTinh?: string;
  mst?: string;
  soDienThoai?: string;
  email?: string;
  diaChi?: string;
  phongBan?: string;
  chucDanh?: string;
  ngayVaoLam?: string;
  loaiHopDong?: string;
  trangThai?: string;
  bangCap?: BangCap[];
  nguoiPhuThuoc?: NguoiPhuThuoc[];
  lienHeKhanCap?: LienHeKhanCap;
  userId?: string;
  workShiftId?: string;
  ngayLamViecTrongTuan?: number[];
  choPhepChamNgoaiVung?: boolean;
}

export type UpdateEmployeeDto = Partial<CreateEmployeeDto>;

class EmployeeService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/nhan-vien' });
  }

  async getList(filter?: EmployeeFilter): Promise<Employee[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: filter,
    });
    return res.map(this.transform);
  }

  async get(id: string): Promise<Employee> {
    const res = await super.get<Record<string, unknown>>({ endpoint: `/${id}` });
    return this.transform(res);
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const res = await this.post<Record<string, unknown>>(dto, {});
    return this.transform(res);
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const res = await this.put<Record<string, unknown>>(dto, { endpoint: `/${id}` });
    return this.transform(res);
  }

  async remove(id: string): Promise<void> {
    await super.delete({ endpoint: `/${id}` });
  }

  async updateStatus(id: string, trangThai: string): Promise<Employee> {
    const res = await this.patch<Record<string, unknown>>(
      { trangThai },
      { endpoint: `/${id}/trang-thai` },
    );
    return this.transform(res);
  }

  private transform(x: Record<string, unknown>): Employee {
    return {
      id: (x._id as string) || (x.id as string),
      employeeId: x.employeeId as string,
      hoTen: x.hoTen as string,
      ngaySinh: x.ngaySinh as string | undefined,
      gioiTinh: x.gioiTinh as string | undefined,
      cccd: x.cccd as string,
      mst: x.mst as string | undefined,
      soDienThoai: x.soDienThoai as string | undefined,
      email: x.email as string | undefined,
      diaChi: x.diaChi as string | undefined,
      phongBan: x.phongBan as string | undefined,
      chucDanh: x.chucDanh as string | undefined,
      ngayVaoLam: x.ngayVaoLam as string | undefined,
      loaiHopDong: (x.loaiHopDong as string) ?? 'thu_viec',
      trangThai: (x.trangThai as string) ?? 'dang_lam_viec',
      bangCap: (x.bangCap as BangCap[]) ?? undefined,
      nguoiPhuThuoc: (x.nguoiPhuThuoc as NguoiPhuThuoc[]) ?? undefined,
      lienHeKhanCap: (x.lienHeKhanCap as LienHeKhanCap) ?? undefined,
      isActive: (x.isActive as boolean) ?? true,
      userId: x.userId as string | undefined,
      workShiftId: x.workShiftId as string | undefined,
      ngayLamViecTrongTuan: x.ngayLamViecTrongTuan as number[] | undefined,
      // `??` (không phải `||`) để không nuốt mất giá trị `false` hợp lệ đọc
      // từ BE — hồ sơ chưa từng lưu trường này mới rơi vào mặc định an toàn.
      choPhepChamNgoaiVung: (x.choPhepChamNgoaiVung as boolean) ?? false,
    };
  }
}

export const employeeService = new EmployeeService();
