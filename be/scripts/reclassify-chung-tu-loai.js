/**
 * Phân loại lại `chung_tu.loai` (PHIEU_THU / PHIEU_CHI / KHAC) theo cấu hình:
 *   chung_tu.danhMuc.loaiGiaoDich.ma → loai_giao_dich.loaiChungTuMa → loai_chung_tu.phanLoai
 *
 * Logic khớp với resolveLoaiFromConfig (apps/voucher-service/src/shared/loai-resolver.helper.ts).
 * v1: chỉ cập nhật `loai`, GIỮ NGUYÊN số phiếu cũ (không đánh số lại).
 *
 * Dùng:
 *   env-cmd -e db -- node scripts/reclassify-chung-tu-loai.js --tenant=<tenantId>            # dry-run
 *   env-cmd -e db -- node scripts/reclassify-chung-tu-loai.js --tenant=<tenantId> --apply    # ghi thật
 *   ... thêm --all-tenants để chạy mọi tenant (mỗi tenant tự đọc cấu hình riêng)
 */
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'digital_book';

const PHAN_LOAI_TO_LOAI = { THU: 'PHIEU_THU', CHI: 'PHIEU_CHI', KHAC: 'KHAC' };

function parseArgs(argv) {
  const args = { apply: false, allTenants: false, tenant: null };
  for (const a of argv.slice(2)) {
    if (a === '--apply') args.apply = true;
    else if (a === '--all-tenants') args.allTenants = true;
    else if (a.startsWith('--tenant=')) args.tenant = a.slice('--tenant='.length);
  }
  return args;
}

/** Suy ra loai mới cho 1 chứng từ; trả về loai cũ nếu không đủ cấu hình. */
function resolveLoai(danhMuc, currentLoai, lgdToLct, lctToPhanLoai) {
  const lgdMa = danhMuc && danhMuc.loaiGiaoDich && danhMuc.loaiGiaoDich.ma;
  if (!lgdMa) return currentLoai;
  const lctMa = lgdToLct.get(lgdMa);
  if (!lctMa) return currentLoai;
  const phanLoai = lctToPhanLoai.get(lctMa);
  if (!phanLoai) return currentLoai;
  return PHAN_LOAI_TO_LOAI[phanLoai] || currentLoai;
}

async function reclassifyTenant(db, tenantId, apply) {
  const lgdList = await db.collection('loai_giao_dich').find({ tenantId }).toArray();
  const lctList = await db.collection('loai_chung_tu').find({ tenantId }).toArray();

  const lgdToLct = new Map();
  for (const x of lgdList) if (x.ma && x.loaiChungTuMa) lgdToLct.set(x.ma, x.loaiChungTuMa);
  const lctToPhanLoai = new Map();
  for (const x of lctList) if (x.ma && x.phanLoai) lctToPhanLoai.set(x.ma, x.phanLoai);

  console.log(`\n— Tenant ${tenantId}`);
  console.log(`  cấu hình: ${lgdToLct.size}/${lgdList.length} loại giao dịch đã gán loại chứng từ; ${lctToPhanLoai.size}/${lctList.length} loại chứng từ có phân loại`);
  if (lgdToLct.size === 0 || lctToPhanLoai.size === 0) {
    console.log('  ⚠️  Chưa cấu hình đủ → mọi phiếu giữ nguyên loai. Hãy gán Loại chứng từ cho Loại giao dịch + đặt Phân loại trước.');
  }

  const docs = await db.collection('chung_tu').find({ tenantId }).toArray();
  const counts = { PHIEU_THU: 0, PHIEU_CHI: 0, KHAC: 0 };
  const changes = []; // {id, from, to}

  for (const d of docs) {
    const newLoai = resolveLoai(d.danhMuc, d.loai, lgdToLct, lctToPhanLoai);
    counts[newLoai] = (counts[newLoai] || 0) + 1;
    if (newLoai !== d.loai) changes.push({ _id: d._id, from: d.loai, to: newLoai });
  }

  console.log(`  tổng ${docs.length} phiếu → kết quả phân loại: THU=${counts.PHIEU_THU} CHI=${counts.PHIEU_CHI} KHAC=${counts.KHAC}`);
  console.log(`  số phiếu THAY ĐỔI loai: ${changes.length}`);

  if (changes.length && !apply) {
    const sample = changes.slice(0, 8).map((c) => `${c.from}→${c.to}`);
    console.log(`  ví dụ thay đổi: ${sample.join(', ')}${changes.length > 8 ? ' ...' : ''}`);
  }

  if (apply && changes.length) {
    const ops = changes.map((c) => ({
      updateOne: { filter: { _id: c._id }, update: { $set: { loai: c.to } } },
    }));
    const res = await db.collection('chung_tu').bulkWrite(ops);
    console.log(`  ✅ Đã cập nhật ${res.modifiedCount} phiếu`);
  }

  return { total: docs.length, counts, changed: changes.length };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.tenant && !args.allTenants) {
    console.error('Thiếu --tenant=<id> (hoặc --all-tenants).');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Kết nối ${DB_NAME}. Chế độ: ${args.apply ? 'APPLY (ghi thật)' : 'DRY-RUN (chỉ xem)'}`);

    let tenantIds;
    if (args.allTenants) {
      tenantIds = await db.collection('chung_tu').distinct('tenantId');
    } else {
      tenantIds = [args.tenant];
    }

    let totalChanged = 0;
    for (const tid of tenantIds) {
      const r = await reclassifyTenant(db, tid, args.apply);
      totalChanged += r.changed;
    }

    console.log(`\n==== ${args.apply ? 'ĐÃ ÁP DỤNG' : 'DRY-RUN'} | tổng phiếu thay đổi: ${totalChanged} ====`);
    if (!args.apply) console.log('Chạy lại với --apply để ghi thật.');
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
