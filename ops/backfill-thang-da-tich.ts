import { MongoClient } from 'mongodb';

/**
 * Backfill `thangDaTich` cho quỹ phép đã cấp TRƯỚC P3.10.
 *
 * PHẢI CHẠY TRƯỚC LẦN CHỐT BẢNG CÔNG ĐẦU TIÊN SAU KHI DEPLOY.
 *
 * Vì sao: trước P3.10, phép được cấp MỘT CỤC theo lịch (`capPhepDauNam`) —
 * "từ ngày vào làm, tháng nào còn ≥50% ngày làm việc theo lịch thì tính".
 * Từ P3.10, mỗi lần chốt bảng công tháng M sẽ cấp thêm phép của tháng M.
 * Quỹ cũ không ghi lại nó đã tính những tháng nào, nên nếu không đánh dấu
 * trước thì mọi tháng đã nằm trong lần cấp cũ sẽ được cấp LẦN THỨ HAI khi
 * bảng công của nó được chốt.
 *
 * Script này suy lại ĐÚNG tập tháng mà luật cũ đã tính và ghi vào
 * `thangDaTich`. Nó KHÔNG đụng `soNgayDuocCap` — số dư nhân viên đang nhìn
 * thấy giữ nguyên tuyệt đối, kể cả khi luật mới lẽ ra cho ít hơn. Hạ số là
 * đẩy quỹ về âm với người đã nghỉ hết phép.
 *
 * `thangTheoLich()` chép từ `be/apps/config-service/src/quy-phep/luat-phep.ts`
 * vì script chạy ngoài cây mã nguồn app. Bên đó có test
 * `số phần tử KHỚP demThangLamViec` khoá hai bản không lệch — lệch một tháng
 * là tháng đó được cấp hai lần.
 *
 * Idempotent: chỉ đụng quỹ CHƯA có `thangDaTich`. Chạy lại báo "không có gì
 * phải đổi".
 *
 * Chạy (từ `be/`, xem ops/README.md):
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/backfill-thang-da-tich.ts --dry-run
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/backfill-thang-da-tich.ts
 */

const DRY_RUN = process.argv.includes('--dry-run');

const NGUONG_THANG_LE = 0.5;
const MOT_NGAY = 24 * 60 * 60 * 1000;

function moc(ngay: string): number {
  const [nam, thang, ngayTrongThang] = ngay.split('-').map(Number);
  return Date.UTC(nam, thang - 1, ngayTrongThang);
}

/** Lịch rỗng/undefined = CHƯA CẤU HÌNH ⇒ mọi ngày đều tính. */
function laNgayLamViec(t: number, ngayLamViecTrongTuan?: number[]): boolean {
  if (!ngayLamViecTrongTuan || ngayLamViecTrongTuan.length === 0) return true;
  return ngayLamViecTrongTuan.includes(new Date(t).getUTCDay());
}

/** Chép nguyên từ `luat-phep.ts` — xem doc-comment đầu file. */
function thangTheoLich(input: {
  ngayVaoLam: string;
  nam: number;
  ngayLamViecTrongTuan?: number[];
}): string[] {
  const mocVao = moc(input.ngayVaoLam);
  const ds: string[] = [];

  for (let thang = 1; thang <= 12; thang += 1) {
    const dauThang = Date.UTC(input.nam, thang - 1, 1);
    const cuoiThang = Date.UTC(input.nam, thang, 0);
    if (mocVao > cuoiThang) continue;

    let tong = 0;
    let conLai = 0;
    for (let t = dauThang; t <= cuoiThang; t += MOT_NGAY) {
      if (!laNgayLamViec(t, input.ngayLamViecTrongTuan)) continue;
      tong += 1;
      if (t >= mocVao) conLai += 1;
    }

    if (tong > 0 && conLai >= NGUONG_THANG_LE * tong) {
      ds.push(`${input.nam}-${String(thang).padStart(2, '0')}`);
    }
  }

  return ds;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE || 'nhan_su';
  if (!uri) throw new Error('MONGODB_URI required');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.log(
    `Backfill thangDaTich trên ${dbName}.leave_balances${DRY_RUN ? ' (DRY RUN — không ghi gì)' : ''}\n`,
  );

  const quys = await db
    .collection('leave_balances')
    .find({ thangDaTich: { $exists: false } })
    .toArray();
  console.log(`Tìm thấy ${quys.length} quỹ chưa có thangDaTich\n`);

  // Lịch làm việc nằm trên hồ sơ NV, không trên quỹ. Nạp một lượt rồi tra.
  const nvs = await db.collection('employees').find({}).toArray();
  const lichTheoNv = new Map<string, number[] | undefined>();
  for (const nv of nvs) {
    lichTheoNv.set(String(nv._id), nv.ngayLamViecTrongTuan);
  }

  let daDanhDau = 0;
  let boQua = 0;

  for (const quy of quys) {
    const nhan = `quỹ ${quy._id} (NV ${quy.employeeName ?? quy.employeeId}, năm ${quy.nam})`;

    // Quỹ dữ liệu cũ thiếu căn cứ cấp thì KHÔNG đoán ngày vào làm — đoán sai
    // một tháng là cấp trùng hoặc cấp thiếu một ngày phép thật.
    const ngayVaoLam = quy.canCuCap?.ngayVaoLam;
    if (!ngayVaoLam || typeof quy.nam !== 'number') {
      console.log(
        `- BỎ QUA ${nhan}: thiếu canCuCap.ngayVaoLam hoặc nam — cần xử lý tay trước khi chốt bảng công`,
      );
      boQua++;
      continue;
    }

    const thangDaTich = thangTheoLich({
      ngayVaoLam,
      nam: quy.nam,
      ngayLamViecTrongTuan: lichTheoNv.get(String(quy.employeeId)),
    });

    console.log(
      `- ĐÁNH DẤU ${nhan}: ${thangDaTich.length} tháng [${thangDaTich.join(', ')}] — soNgayDuocCap giữ nguyên ${quy.soNgayDuocCap}`,
    );

    if (!DRY_RUN) {
      await db
        .collection('leave_balances')
        .updateOne({ _id: quy._id }, { $set: { thangDaTich } });
    }
    daDanhDau++;
  }

  console.log(
    `\n${DRY_RUN ? 'DRY RUN — không ghi gì. Sẽ' : 'Đã'} đánh dấu ${daDanhDau} quỹ, bỏ qua ${boQua} quỹ, tổng ${quys.length}.`,
  );

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
