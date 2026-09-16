import { MongoClient } from 'mongodb';

/**
 * Chuyển ô "Phụ cấp cố định" trên hồ sơ NV sang một KHOẢN LƯƠNG riêng.
 *
 * Vì sao cần: yêu cầu d9 bỏ ô "Phụ cấp cố định" khỏi tab Lương — phụ cấp nay
 * khai theo từng khoản trong Cấu hình lương rồi đặt số riêng cho từng người.
 * Nhưng dữ liệu đang chạy có:
 *   - `cau_hinh_luong.khoanLuong` chứa một khoản `thamSo.nguonHoSo = 'phuCapCoDinh'`
 *     (khoản `PHU_CAP` trong seed), và
 *   - `employees.phuCapCoDinh` giữ số tiền của từng người.
 * Bỏ ô nhập mà không di trú thì HR không còn đường sửa con số đó từ giao
 * diện — nó vẫn vào bảng lương hàng tháng nhưng không ai sửa được.
 *
 * Script làm hai việc, cho từng tenant:
 *   1. Khoản có `nguonHoSo = 'phuCapCoDinh'` → bỏ `nguonHoSo`, bật
 *      `choPhepRieng` (để hiện trong tab Lương của hồ sơ). `thamSo.soTien`
 *      đặt 0 = mức chung công ty không có; ai có bao nhiêu thì nằm ở mức
 *      riêng bên dưới.
 *   2. Mỗi NV có `phuCapCoDinh > 0` → ghi `giaTriKhoan[<mã khoản>] = số đó`,
 *      TRỪ KHI khoá đó đã có (không ghi đè số HR đã đặt tay).
 *
 * Cột `employees.phuCapCoDinh` được GIỮ NGUYÊN, không xoá: các dòng lương đã
 * chốt còn snapshot nó, và giữ lại là còn đường đối chiếu nếu số sau khi di
 * trú lệch.
 *
 * Idempotent: chạy lần hai không đổi gì thêm.
 *
 * Chạy:
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/chuyen-phucapcodinh-sang-khoan.ts --dry-run
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/chuyen-phucapcodinh-sang-khoan.ts
 */

interface KhoanLuong {
  ma: string;
  ten: string;
  loaiCongThuc: string;
  thamSo: { soTien?: number; dinhMuc?: number; tyLe?: number; nguonHoSo?: string };
  choPhepRieng?: boolean;
  [k: string]: unknown;
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE ?? 'nhan_su';
  const dryRun = process.argv.includes('--dry-run');

  if (!uri) {
    console.error('Thiếu MONGODB_URI');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  try {
    const cauHinhs = await db
      .collection('cau_hinh_luong')
      .find({ 'khoanLuong.thamSo.nguonHoSo': 'phuCapCoDinh' })
      .toArray();

    if (!cauHinhs.length) {
      console.log('Không cấu hình lương nào còn dùng nguonHoSo=phuCapCoDinh — không có gì để làm.');
      return;
    }

    for (const ch of cauHinhs) {
      const tenantId = ch.tenantId as string | undefined;
      const khoan = (ch.khoanLuong ?? []) as KhoanLuong[];
      const khoanPhuCap = khoan.find(
        (k) => k.thamSo?.nguonHoSo === 'phuCapCoDinh',
      );
      if (!khoanPhuCap) continue;

      console.log(
        `\n[tenant ${tenantId ?? '(không rõ)'}] khoản "${khoanPhuCap.ten}" (${khoanPhuCap.ma})`,
      );

      const khoanMoi = khoan.map((k) =>
        k.thamSo?.nguonHoSo === 'phuCapCoDinh'
          ? {
              ...k,
              thamSo: { soTien: k.thamSo.soTien ?? 0 },
              choPhepRieng: true,
            }
          : k,
      );

      // Chỉ NV của đúng tenant này. Thiếu bộ lọc tenant là số của công ty A
      // nhảy sang mã khoản của công ty B.
      const locNV: Record<string, unknown> = { phuCapCoDinh: { $gt: 0 } };
      if (tenantId) locNV.tenantId = tenantId;
      const nvs = await db.collection('employees').find(locNV).toArray();

      let daGhi = 0;
      let boQua = 0;
      for (const nv of nvs) {
        const bang = (nv.giaTriKhoan ?? {}) as Record<string, number>;
        if (Object.prototype.hasOwnProperty.call(bang, khoanPhuCap.ma)) {
          boQua++;
          continue;
        }
        console.log(
          `  ${nv.employeeId} ${nv.hoTen}: ${Number(nv.phuCapCoDinh).toLocaleString('vi-VN')} ₫ → giaTriKhoan.${khoanPhuCap.ma}`,
        );
        if (!dryRun) {
          await db
            .collection('employees')
            .updateOne(
              { _id: nv._id },
              { $set: { [`giaTriKhoan.${khoanPhuCap.ma}`]: nv.phuCapCoDinh } },
            );
        }
        daGhi++;
      }

      if (!dryRun) {
        await db
          .collection('cau_hinh_luong')
          .updateOne({ _id: ch._id }, { $set: { khoanLuong: khoanMoi } });
      }
      console.log(
        `  → ${daGhi} nhân viên chuyển sang mức riêng, ${boQua} đã có sẵn nên bỏ qua.`,
      );
    }

    console.log(dryRun ? '\n(dry-run — chưa ghi gì)' : '\nXong.');
  } finally {
    await client.close();
  }
}

void main();
