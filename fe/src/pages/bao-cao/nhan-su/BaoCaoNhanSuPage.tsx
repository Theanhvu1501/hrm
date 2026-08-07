import { useMemo, useState } from 'react';
import { Alert, Select, Tag, Tooltip } from 'antd';
import { DANH_SACH_KY, KY_MAC_DINH, layBaoCao } from './duLieuMau';
import KhoiNhom from './components/KhoiNhom';
import './baoCao.css';

/** "2026-07" → "Tháng 07/2026". */
function nhanKy(ky: string): string {
  const [nam, thang] = ky.split('-');
  return `Tháng ${thang}/${nam}`;
}

/**
 * Báo cáo nhân sự — 16 chỉ số, 4 nhóm, theo đúng khung khách hàng đưa ra.
 *
 * BẢN DEMO: số liệu lấy từ `duLieuMau.ts`, chưa nối API. Trạng thái đó được
 * nói thẳng trên đầu trang bằng thẻ "Số liệu mẫu" chứ không giấu — một
 * dashboard trông như thật mà số là bịa là thứ nguy hiểm nhất có thể đưa vào
 * phòng họp.
 *
 * 7 trong 16 chỉ số chưa có module nguồn (Tuyển dụng, Đào tạo, Biên bản vi
 * phạm, cờ nhân sự cốt cán). Chúng vẫn được giữ đúng vị trí trong khung nhưng
 * hiển thị "Chưa có dữ liệu" kèm thứ còn thiếu — cố ý, để khách hàng thấy
 * đường đi tiếp chứ không tưởng là hệ thống đã tính được.
 */
export default function BaoCaoNhanSuPage() {
  const [ky, setKy] = useState(KY_MAC_DINH);
  const baoCao = useMemo(() => layBaoCao(ky), [ky]);

  return (
    <div className="bao-cao-nhan-su p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Báo cáo nhân sự
            </h1>
            <Tooltip title="Bản demo giao diện: số liệu lấy từ bộ mẫu trong ứng dụng, chưa nối vào dữ liệu thật của công ty.">
              <Tag color="orange" className="cursor-help">
                Số liệu mẫu
              </Tag>
            </Tooltip>
          </div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Kỳ {nhanKy(baoCao.ky)} · so sánh với {nhanKy(baoCao.kyTruoc).toLowerCase()}
          </div>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            Kỳ báo cáo
            <Select
              value={ky}
              onChange={setKy}
              style={{ width: 150 }}
              options={DANH_SACH_KY.map((k) => ({ value: k, label: nhanKy(k) }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            Phòng ban
            <Tooltip title="Lọc theo phòng ban sẽ hoạt động khi báo cáo nối vào dữ liệu thật.">
              {/* Cố ý để disabled thay vì bỏ hẳn: khách hàng cần thấy bộ lọc
                  đã nằm trong thiết kế, nhưng một ô lọc bấm vào mà số không
                  đổi thì tệ hơn nhiều so với một ô lọc nói rõ là chưa bật. */}
              <Select
                disabled
                value="tat-ca"
                style={{ width: 170 }}
                options={[{ value: 'tat-ca', label: 'Tất cả phòng ban' }]}
              />
            </Tooltip>
          </label>
        </div>
      </div>

      <Alert
        type="info"
        showIcon
        className="mb-5"
        // antd 6 đã bỏ `message` sang deprecated; code cũ trong repo còn dùng
        // `message`, code mới dùng `title`.
        title={
          <span className="text-xs">
            <b>{baoCao.soChiSoCoSoLieu}</b> / {baoCao.soChiSoCoSoLieu + baoCao.soChiSoChuaCoNguon}{' '}
            chỉ số đã có nguồn dữ liệu trong hệ thống.{' '}
            <b>{baoCao.soChiSoChuaCoNguon}</b> chỉ số còn lại cần bổ sung module Tuyển dụng, Đào tạo,
            Biên bản vi phạm và cờ nhân sự cốt cán — các ô đó để trống, không điền số ước lượng.
          </span>
        }
      />

      {baoCao.nhom.map((n) => (
        <KhoiNhom key={n.ma} nhom={n} />
      ))}
    </div>
  );
}
