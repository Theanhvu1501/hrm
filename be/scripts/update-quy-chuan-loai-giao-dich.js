/**
 * Script to update quy_chuan collection with new loaiGiaoDich values
 * Maps old values (PHIEU_THU, PHIEU_CHI, BAO_CO, BAO_NO) to new detailed codes from loai_chung_tu
 */
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'digital_book';

// Mapping từ nghiệp vụ sang mã loại chứng từ mới
const NGHIEP_VU_TO_LOAI_CHUNG_TU = {
  // Phiếu thu
  'Thu tiền bán hàng': 'THU_BAN_HANG',
  'Thu tiền công nợ khách hàng': 'THU_CONG_NO_KH',
  'Thu lãi tiền gửi': 'THU_LAI_TIEN_GUI',
  'Thu hoàn ứng': 'THU_HOAN_UNG',
  'Thu tiền khác': 'THU_KHAC',
  'Rút tiền gửi về quỹ': 'RUT_TIEN_VE_QUY',
  // Phiếu chi
  'Chi mua hàng hóa': 'CHI_MUA_HANG',
  'Chi trả nhà cung cấp': 'CHI_TRA_NCC',
  'Chi lương nhân viên': 'CHI_LUONG',
  'Chi phí bán hàng': 'CHI_PHI_BAN_HANG',
  'Chi phí quản lý': 'CHI_PHI_QUAN_LY',
  'Chi tạm ứng': 'CHI_TAM_UNG',
  'Chi nộp thuế': 'CHI_NOP_THUE',
  'Chi trả lãi vay': 'CHI_TRA_LAI_VAY',
  'Chi khác': 'CHI_KHAC',
  'Nộp tiền vào ngân hàng': 'NOP_TIEN_NGAN_HANG',
  // Báo có ngân hàng
  'Thu tiền bán hàng CK': 'BAO_CO_BAN_HANG',
  'Thu công nợ qua CK': 'BAO_CO_CONG_NO',
  'Thu lãi tiền gửi (CK)': 'BAO_CO_LAI_TIEN_GUI',
  // Báo nợ ngân hàng
  'Chi mua hàng CK': 'BAO_NO_MUA_HANG',
  'Chi trả NCC qua CK': 'BAO_NO_TRA_NCC',
  'Chi lương qua CK': 'BAO_NO_LUONG',
  'Chi phí ngân hàng': 'BAO_NO_PHI_NH',
};

async function updateQuyChuan() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const quyChaunCollection = db.collection('quy_chuan');
    
    // Get all quy_chuan records
    const quyChaunList = await quyChaunCollection.find({}).toArray();
    console.log(`📋 Found ${quyChaunList.length} quy_chuan records`);
    
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    
    for (const quyChuan of quyChaunList) {
      const nghiepVu = quyChuan.nghiepVu;
      const newLoaiGiaoDich = NGHIEP_VU_TO_LOAI_CHUNG_TU[nghiepVu];
      
      if (!newLoaiGiaoDich) {
        console.log(`⚠️  No mapping found for nghiepVu: "${nghiepVu}"`);
        notFound++;
        continue;
      }
      
      // Check if already updated
      if (quyChuan.loaiGiaoDich === newLoaiGiaoDich) {
        skipped++;
        continue;
      }
      
      // Update the record
      await quyChaunCollection.updateOne(
        { _id: quyChuan._id },
        { $set: { loaiGiaoDich: newLoaiGiaoDich } }
      );
      
      console.log(`✅ Updated: "${nghiepVu}" -> loaiGiaoDich: ${newLoaiGiaoDich}`);
      updated++;
    }
    
    console.log('\n==================================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('==================================================');
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped (already correct): ${skipped}`);
    console.log(`⚠️  Not found mapping: ${notFound}`);
    console.log(`📦 Total: ${quyChaunList.length}`);
    console.log('==================================================');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

updateQuyChuan();
