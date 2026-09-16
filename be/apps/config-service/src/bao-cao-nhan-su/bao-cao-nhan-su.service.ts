import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmploymentHistory, Timesheet } from '@app/entities';
import { dungChiSoThang, type ChiSoThang } from './lib/chiSoNhanSu';
import {
  dungBaoCaoSuDungLaoDong,
  type ChiTietSuDungLaoDong,
} from './lib/suDungLaoDong';

@Injectable()
export class BaoCaoNhanSu_Service {
  constructor(
    @InjectRepository(Employee)
    private readonly nhanVienRepo: Repository<Employee>,
    @InjectRepository(EmploymentHistory)
    private readonly quaTrinhRepo: Repository<EmploymentHistory>,
    @InjectRepository(Timesheet)
    private readonly bangCongRepo: Repository<Timesheet>,
  ) {}

  /**
   * Chỉ số của MỘT kỳ + 5 kỳ liền trước, để màn báo cáo vẽ được xu hướng mà
   * chỉ tốn một lần gọi.
   */
  async chiSo(ky: string): Promise<ChiSoThang[]> {
    if (!/^\d{4}-\d{2}$/.test(ky)) {
      throw new BadRequestException('Kỳ phải có định dạng YYYY-MM');
    }

    const [nhanVien, quaTrinh, bangCong] = await Promise.all([
      this.nhanVienRepo.find({}),
      this.quaTrinhRepo.find({}),
      this.bangCongRepo.find({}),
    ]);

    const [nam, thang] = ky.split('-').map(Number);
    const ds: ChiSoThang[] = [];
    for (let lui = 5; lui >= 0; lui -= 1) {
      const d = new Date(Date.UTC(nam, thang - 1 - lui, 1));
      const kyLui = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      ds.push(dungChiSoThang(kyLui, nhanVien, quaTrinh, bangCong));
    }
    return ds;
  }

  /** Báo cáo tình hình sử dụng lao động (yêu cầu d48). */
  async suDungLaoDong(
    tuNgay: string,
    denNgay: string,
  ): Promise<ChiTietSuDungLaoDong & { tuNgay: string; denNgay: string }> {
    const hopLe = /^\d{4}-\d{2}-\d{2}$/;
    if (!hopLe.test(tuNgay) || !hopLe.test(denNgay)) {
      throw new BadRequestException('Ngày phải có định dạng YYYY-MM-DD');
    }
    if (denNgay < tuNgay) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    const nhanVien = await this.nhanVienRepo.find({});
    return {
      tuNgay,
      denNgay,
      ...dungBaoCaoSuDungLaoDong(nhanVien, tuNgay, denNgay),
    };
  }
}
