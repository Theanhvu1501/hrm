import { Row, Col, InputNumber, Select, Alert, Button, Switch } from "antd";
import { useCauHinhLuongState } from "../CauHinhLuongHandlerContext";
import {
  HE_SO_TICH_SAN,
  LAM_THEM_MAC_DINH,
  type CauHinhLamThem,
  type CauHinhLuong,
} from "@/services/cauHinhLuongService";
import "../CauHinhLuongPage.state";

/**
 * Khai `soGioMoiNgay` + `lamThem` — tức BẬT quỹ giờ làm thêm cho công ty.
 *
 * (review nhánh, IMPORTANT 6) `ops/README.md` bước 3 vẫn bảo vận hành "vào màn
 * Cấu hình lương điền và lưu tay", nhưng màn đó CHƯA HỀ có hai trường này —
 * `grep -rn "lamThem\|soGioMoiNgay" fe/src` không ra gì. Và
 * `bang-luong.service.ts.layCauHinh()` chỉ tự tạo cấu hình có sẵn `lamThem`
 * khi CHƯA có bản ghi nào; công ty đã từng chạy bảng lương thì bản ghi cũ
 * không bao giờ được bồi thêm. Hệ quả: mọi tenant đã dùng lương trước P4.2a
 * KHÔNG có đường nào bật được tính năng — `layCauHinh()` trả `null`, không
 * đơn OT nào tích quỹ, và runbook mô tả một thao tác không tồn tại.
 *
 * CỐ Ý chọn màn hình thay vì backfill kiểu `bhCongTy`: backfill sẽ BẬT NGẦM
 * tính năng cho mọi tenant ngay lúc deploy, mà bật nó = đơn nghỉ bù của TOÀN
 * CÔNG TY bị chặn cho tới khi có đơn OT đầu tiên được duyệt (xem cảnh báo HR
 * ở bước 4 của runbook). Đó là quyết định của công ty, không phải hệ quả phụ
 * của một lần deploy.
 */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block mb-1 text-sm font-medium">{children}</label>;
}

const TRUONG_HE_SO = [
  { khoa: "ngay_thuong", nhan: "Ngày thường" },
  { khoa: "ngay_nghi", nhan: "Ngày nghỉ hằng tuần" },
  { khoa: "ngay_le", nhan: "Ngày lễ / Tết" },
] as const;

export function LamThemEditor({ canEdit }: { canEdit: boolean }) {
  const [cauHinh, setCauHinh] = useCauHinhLuongState(
    "cauHinh",
    null as CauHinhLuong | null
  );

  if (!cauHinh) return null;

  const lamThem = cauHinh.lamThem;

  const capNhat = (patch: Partial<CauHinhLuong>) =>
    setCauHinh({ ...cauHinh, ...patch });

  const capNhatLamThem = (patch: Partial<CauHinhLamThem>) =>
    capNhat({ lamThem: { ...(lamThem as CauHinhLamThem), ...patch } });

  if (!lamThem) {
    return (
      <div className="space-y-3">
        <Alert
          type="warning"
          showIcon
          title="Công ty chưa bật quỹ giờ làm thêm."
          description="Chưa bật thì đơn làm thêm được duyệt KHÔNG tích giờ vào quỹ nào, và đơn nghỉ bù vẫn nộp tự do như trước."
        />
        <Alert
          type="error"
          showIcon
          title="Báo HR TRƯỚC khi bật."
          description="Từ lúc bật, đơn nghỉ bù trừ vào quỹ giờ và bị chặn ngay lúc nộp nếu không đủ số dư. Cố ý KHÔNG có backfill: mọi nhân viên bắt đầu ở 0 giờ, nên cả công ty không nộp được nghỉ bù cho tới khi có đơn làm thêm đầu tiên được duyệt. Nên bật cùng lúc với đợt duyệt làm thêm đầu tiên."
        />
        {canEdit && (
          <Button
            type="primary"
            onClick={() =>
              capNhat({
                soGioMoiNgay: cauHinh.soGioMoiNgay ?? 8,
                lamThem: {
                  ...LAM_THEM_MAC_DINH,
                  heSoTichQuy: { ...LAM_THEM_MAC_DINH.heSoTichQuy },
                },
              })
            }
          >
            Bật quỹ giờ làm thêm
          </Button>
        )}
        {canEdit && (
          <p className="text-sm text-muted-foreground">
            Bấm nút trên chỉ điền sẵn giá trị mặc định vào form — vẫn phải bấm
            “Lưu cấu hình” mới có hiệu lực.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        title="Quỹ giờ làm thêm đang bật."
        description="Đơn làm thêm được duyệt sẽ tích giờ (đã nhân hệ số) vào quỹ; đơn nghỉ bù trừ vào quỹ này theo thứ tự sắp hết hạn trước."
      />

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <FieldLabel>Số giờ của một ngày công</FieldLabel>
          <InputNumber
            className="w-full"
            min={0.5}
            step={0.5}
            addonAfter="giờ"
            value={cauHinh.soGioMoiNgay ?? 8}
            disabled={!canEdit}
            onChange={(v) => capNhat({ soGioMoiNgay: v ?? 8 })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Dùng quy đổi khi nhân viên xin nghỉ bù trọn ngày / nửa buổi.
          </p>
        </Col>

        <Col span={8}>
          <FieldLabel>Chế độ bù</FieldLabel>
          <Select
            className="w-full"
            value={lamThem.cheDoBu}
            disabled={!canEdit}
            // Ba chế độ còn lại (chi_tien / nhan_vien_chon / nghi_bu_va_chenh)
            // bị DTO backend từ chối là "chưa được hỗ trợ" — không bày ra một
            // lựa chọn chắc chắn 400.
            options={[{ value: "chi_nghi_bu", label: "Chỉ nghỉ bù" }]}
            onChange={(cheDoBu) => capNhatLamThem({ cheDoBu })}
          />
        </Col>

        <Col span={8}>
          <FieldLabel>Khi quỹ hết hạn</FieldLabel>
          <Select
            className="w-full"
            value={lamThem.khiHetHan}
            disabled={!canEdit}
            options={[
              { value: "quy_ra_tien", label: "Quy ra tiền (trả kỳ lương sau)" },
              { value: "huy_bo", label: "Huỷ bỏ (giờ mất hẳn)" },
            ]}
            onChange={(khiHetHan) => capNhatLamThem({ khiHetHan })}
          />
        </Col>

        {TRUONG_HE_SO.map(({ khoa, nhan }) => (
          <Col span={8} key={khoa}>
            <FieldLabel>Hệ số tích quỹ — {nhan}</FieldLabel>
            <InputNumber
              className="w-full"
              min={HE_SO_TICH_SAN[khoa]}
              step={0.5}
              value={lamThem.heSoTichQuy[khoa]}
              disabled={!canEdit}
              onChange={(v) =>
                capNhatLamThem({
                  heSoTichQuy: {
                    ...lamThem.heSoTichQuy,
                    [khoa]: v ?? HE_SO_TICH_SAN[khoa],
                  },
                })
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tối thiểu {HE_SO_TICH_SAN[khoa].toFixed(1)} (sàn BLLĐ 2019 Đ98.1)
            </p>
          </Col>
        ))}

        <Col span={8} className="flex items-end gap-2">
          <Switch
            checked={lamThem.soThangHanDung !== null}
            disabled={!canEdit}
            onChange={(bat) =>
              capNhatLamThem({ soThangHanDung: bat ? 6 : null })
            }
          />
          <span className="text-sm">Quỹ có hạn dùng</span>
        </Col>

        {lamThem.soThangHanDung !== null && (
          <Col span={8}>
            <FieldLabel>Số tháng còn hiệu lực</FieldLabel>
            <InputNumber
              className="w-full"
              min={1}
              precision={0}
              addonAfter="tháng"
              value={lamThem.soThangHanDung}
              disabled={!canEdit}
              onChange={(v) => capNhatLamThem({ soThangHanDung: v ?? 1 })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tính từ cuối tháng tích. Quỹ quá hạn phải được HR đóng tay ở màn
              Quỹ giờ làm thêm — không có tác vụ tự chạy.
            </p>
          </Col>
        )}
      </Row>
    </div>
  );
}
