import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Timesheet, Employee, AttendanceRequest } from '@app/entities';
import { UpdateTimesheetDto } from './dto';

export interface BangCongFilter {
  thang?: string;
  employeeId?: string;
  trangThai?: string;
  // Query-string values arrive as strings (e.g. `?isActive=false`), so this
  // must accept the raw string form as well as a real boolean.
  isActive?: boolean | string;
}

@Injectable()
export class BangCong_Service {
  constructor(
    @InjectRepository(Timesheet)
    private readonly repo: Repository<Timesheet>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(AttendanceRequest)
    private readonly requestRepo: Repository<AttendanceRequest>,
  ) {}

  private coerceIsActive(value?: boolean | string): boolean {
    if (value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return value !== 'false';
  }

  /**
   * Hours between two "HH:mm" strings. Returns 0 if either bound is missing,
   * unparseable, or the range is non-positive (never negative OT).
   */
  private parseOtHours(gioTu?: string, gioDen?: string): number {
    if (!gioTu || !gioDen) return 0;

    const [fromH, fromM] = gioTu.split(':').map(Number);
    const [toH, toM] = gioDen.split(':').map(Number);
    if ([fromH, fromM, toH, toM].some((n) => Number.isNaN(n))) return 0;

    const minutes = toH * 60 + toM - (fromH * 60 + fromM);
    return minutes > 0 ? minutes / 60 : 0;
  }

  private async sumApprovedOtHours(
    employeeId: string,
    thang: string,
  ): Promise<number> {
    const requests = await this.requestRepo.find({
      where: {
        employeeId,
        loaiDon: 'lam_them_gio',
        trangThai: 'da_duyet',
        isActive: true,
      },
    });

    return requests
      .filter((r) => (r.ngay ?? '').startsWith(thang))
      .reduce((sum, r) => sum + this.parseOtHours(r.gioTu, r.gioDen), 0);
  }

  /**
   * Upserts one Timesheet row per active employee for `thang`. Existing rows
   * keep their manually-entered values (soNgayCong, soLanDiMuon, ...) — only
   * soGioLamThem is (re)computed every run from approved lam_them_gio
   * requests, since that field is fully automatic.
   */
  async generate(thang: string): Promise<Timesheet[]> {
    const employees = await this.employeeRepo.find({
      where: { isActive: true },
    });

    const rows: Timesheet[] = [];

    for (const emp of employees) {
      const employeeId = String((emp as any)._id);

      const existing = await this.repo.find({
        where: { thang, employeeId },
      });

      let row = existing[0];
      if (!row) {
        row = this.repo.create({
          thang,
          employeeId,
          employeeName: emp.hoTen,
          employeeCode: emp.employeeId,
          soNgayCong: 0,
          soGioLamThem: 0,
          soLanDiMuon: 0,
          soLanVeSom: 0,
          trangThai: 'nhap',
          isActive: true,
        } as Partial<Timesheet>);
      }

      row.soGioLamThem = await this.sumApprovedOtHours(employeeId, thang);

      rows.push(await this.repo.save(row));
    }

    return rows;
  }

  async findAll(filter?: BangCongFilter): Promise<Timesheet[]> {
    const where: Record<string, any> = {
      isActive: this.coerceIsActive(filter?.isActive),
    };

    if (filter?.thang) where.thang = filter.thang;
    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.trangThai) where.trangThai = filter.trangThai;

    return this.repo.find({ where });
  }

  async findOne(id: string): Promise<Timesheet> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy bảng công với ID ${id}`);
    }

    return item;
  }

  async update(id: string, dto: UpdateTimesheetDto): Promise<Timesheet> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async finalize(thang: string): Promise<Timesheet[]> {
    const rows = await this.repo.find({ where: { thang, isActive: true } });

    const saved: Timesheet[] = [];
    for (const row of rows) {
      row.trangThai = 'chot';
      saved.push(await this.repo.save(row));
    }

    return saved;
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
