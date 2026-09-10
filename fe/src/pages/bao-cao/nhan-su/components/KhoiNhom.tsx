import { Card } from 'antd';
import type { NhomChiSo } from '../baoCao.types';
import BieuDoNhom from './BieuDoNhom';
import TheChiSo from './TheChiSo';

/**
 * Một nhóm chỉ số: tiêu đề đánh số, câu mô tả mục đích, hàng thẻ chỉ số, rồi
 * đến biểu đồ. Thứ tự này giữ nguyên bố cục bảng gốc của khách hàng — số
 * trước, diễn giải xu hướng sau.
 */
export default function KhoiNhom({ nhom }: { nhom: NhomChiSo }) {
  return (
    <Card>
      <h2 className="m-0 text-[12.5px] font-bold leading-[18px] text-[hsl(var(--ink))]">
        {nhom.soThuTu}. {nhom.ten}
      </h2>
      <p className="mb-3 mt-0.5 text-[10.5px] text-[hsl(var(--ink-2))]">{nhom.moTa}</p>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {nhom.chiSo.map((c) => (
          <TheChiSo key={c.ma} chiSo={c} />
        ))}
      </div>

      <div
        className={`grid gap-3 ${nhom.bieuDo.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}
      >
        {nhom.bieuDo.map((b) => (
          <BieuDoNhom key={b.ma} bieuDo={b} />
        ))}
      </div>
    </Card>
  );
}
