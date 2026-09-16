import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Select, Tabs, Tag, Tooltip } from 'antd';
import { FilterBar } from '@/components/common/FilterBar';
import { DANH_SACH_KY, KY_MAC_DINH, layBaoCao } from './duLieuMau';
import KhoiNhom from './components/KhoiNhom';
import { apDungSoThat } from './soThat';
import { SuDungLaoDongTab } from './components/SuDungLaoDongTab';
import {
  baoCaoNhanSuService,
  type ChiSoThang,
} from '@/services/baoCaoNhanSuService';
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
  const [chuoi, setChuoi] = useState<ChiSoThang[] | null>(null);

  useEffect(() => {
    let huy = false;
    baoCaoNhanSuService
      .chiSo(ky)
      .then((ds) => {
        if (!huy) setChuoi(ds);
      })
      // Lỗi tải (chưa có quyền, BE cũ) KHÔNG làm trắng màn hình — khung báo
      // cáo vẫn hiện, chỉ là chưa có số thật.
      .catch(() => {
        if (!huy) setChuoi(null);
      });
    return () => {
      huy = true;
    };
  }, [ky]);

  const baoCao = useMemo(() => {
    const khung = layBaoCao(ky);
    return chuoi ? apDungSoThat(khung, chuoi, ky) : khung;
  }, [ky, chuoi]);

  return (
    <div className="bao-cao-nhan-su space-y-3">
      <Card>
        <FilterBar
          filters={
            <>
              <Select
                value={ky}
                onChange={setKy}
                style={{ width: 150 }}
                aria-label="Kỳ báo cáo"
                options={DANH_SACH_KY.map((k) => ({ value: k, label: nhanKy(k) }))}
              />
              <Tooltip title="Lọc theo phòng ban sẽ hoạt động khi báo cáo nối vào dữ liệu thật.">
                {/* Cố ý để disabled thay vì bỏ hẳn: khách hàng cần thấy bộ lọc
                    đã nằm trong thiết kế, nhưng một ô lọc bấm vào mà số không
                    đổi thì tệ hơn nhiều so với một ô lọc nói rõ là chưa bật. */}
                <Select
                  disabled
                  value="tat-ca"
                  style={{ width: 170 }}
                  aria-label="Phòng ban"
                  options={[{ value: 'tat-ca', label: 'Tất cả phòng ban' }]}
                />
              </Tooltip>
              <span className="text-[11px] text-[hsl(var(--ink-2))]">
                So sánh với {nhanKy(baoCao.kyTruoc).toLowerCase()}
              </span>
            </>
          }
          actions={
            chuoi ? (
              <Tooltip title="Các chỉ số có nguồn được tính từ dữ liệu thật của công ty (hồ sơ, quá trình công tác, bảng công). Chỉ số chưa có module nguồn vẫn để trống.">
                <Tag color="green" className="cursor-help">
                  Dữ liệu thật
                </Tag>
              </Tooltip>
            ) : (
              <Tooltip title="Chưa tải được số liệu thật — khung báo cáo đang hiện bộ mẫu trong ứng dụng.">
                <Tag color="orange" className="cursor-help">
                  Số liệu mẫu
                </Tag>
              </Tooltip>
            )
          }
        />

        <Alert
          type="info"
          showIcon
          // antd 6 đã bỏ `message` sang deprecated; code cũ trong repo còn dùng
          // `message`, code mới dùng `title`.
          title={
            <span className="text-[11px]">
              <b>{baoCao.soChiSoCoSoLieu}</b> / {baoCao.soChiSoCoSoLieu + baoCao.soChiSoChuaCoNguon}{' '}
              chỉ số đã có nguồn dữ liệu trong hệ thống.{' '}
              <b>{baoCao.soChiSoChuaCoNguon}</b> chỉ số còn lại cần bổ sung module Tuyển dụng, Đào tạo,
              Biên bản vi phạm và cờ nhân sự cốt cán — các ô đó để trống, không điền số ước lượng.
            </span>
          }
        />
      </Card>

      <Tabs
        items={[
          {
            key: 'chi-so',
            label: 'Chỉ số nhân sự',
            children: (
              <div className="space-y-3">
                {baoCao.nhom.map((n) => (
                  <KhoiNhom key={n.ma} nhom={n} />
                ))}
              </div>
            ),
          },
          {
            key: 'su-dung-lao-dong',
            label: 'Tình hình sử dụng lao động',
            children: <SuDungLaoDongTab />,
          },
        ]}
      />
    </div>
  );
}
