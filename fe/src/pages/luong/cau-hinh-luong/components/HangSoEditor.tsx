import { Row, Col, InputNumber, Select, Checkbox } from "antd";
import { useCauHinhLuongState } from "../CauHinhLuongHandlerContext";
import type { CauHinhLuong } from "@/services/cauHinhLuongService";
import "../CauHinhLuongPage.state";

interface HangSoEditorProps {
  canEdit: boolean;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block mb-1 text-sm font-medium">{children}</label>;
}

export function HangSoEditor({ canEdit }: HangSoEditorProps) {
  const [cauHinh, setCauHinh] = useCauHinhLuongState(
    "cauHinh",
    null as CauHinhLuong | null
  );

  if (!cauHinh) return null;

  const capNhat = (patch: Partial<CauHinhLuong>) => {
    setCauHinh({ ...cauHinh, ...patch });
  };

  return (
    <Row gutter={[16, 16]}>
      <Col span={8}>
        <FieldLabel>Mức khai báo mặc định</FieldLabel>
        <InputNumber
          className="w-full"
          min={0}
          value={cauHinh.mucKhaiBaoMacDinh}
          disabled={!canEdit}
          onChange={(v) => capNhat({ mucKhaiBaoMacDinh: v ?? 0 })}
        />
      </Col>
      <Col span={8}>
        <FieldLabel>Công chuẩn / tháng</FieldLabel>
        <InputNumber
          className="w-full"
          min={0}
          value={cauHinh.congChuan}
          disabled={!canEdit}
          onChange={(v) => capNhat({ congChuan: v ?? 0 })}
        />
      </Col>
      <Col span={8}>
        <FieldLabel>Làm tròn (đến số tiền)</FieldLabel>
        <InputNumber
          className="w-full"
          min={0}
          value={cauHinh.lamTron}
          disabled={!canEdit}
          onChange={(v) => capNhat({ lamTron: v ?? 0 })}
        />
      </Col>

      <Col span={8}>
        <FieldLabel>Giảm trừ bản thân</FieldLabel>
        <InputNumber
          className="w-full"
          min={0}
          value={cauHinh.giamTruBanThan}
          disabled={!canEdit}
          onChange={(v) => capNhat({ giamTruBanThan: v ?? 0 })}
        />
      </Col>
      <Col span={8}>
        <FieldLabel>Giảm trừ người phụ thuộc</FieldLabel>
        <InputNumber
          className="w-full"
          min={0}
          value={cauHinh.giamTruNPT}
          disabled={!canEdit}
          onChange={(v) => capNhat({ giamTruNPT: v ?? 0 })}
        />
      </Col>

      <Col span={8}>
        <FieldLabel>Tỷ lệ BHXH (người lao động)</FieldLabel>
        <InputNumber
          className="w-full"
          min={0}
          max={100}
          addonAfter="%"
          value={cauHinh.bhxh.tyLe * 100}
          disabled={!canEdit}
          onChange={(v) => capNhat({ bhxh: { ...cauHinh.bhxh, tyLe: (v ?? 0) / 100 } })}
        />
      </Col>
      <Col span={8}>
        <FieldLabel>Căn cứ đóng BHXH</FieldLabel>
        <Select
          className="w-full"
          value={cauHinh.bhxh.canCu}
          disabled={!canEdit}
          options={[
            { value: "MUC_KHAI_BAO", label: "Mức khai báo" },
            { value: "LUONG_THOA_THUAN", label: "Lương thoả thuận" },
          ]}
          onChange={(canCu) => capNhat({ bhxh: { ...cauHinh.bhxh, canCu } })}
        />
      </Col>
      <Col span={8}>
        <FieldLabel>Tỷ lệ hưởng khi thử việc</FieldLabel>
        <InputNumber
          className="w-full"
          min={0}
          max={100}
          addonAfter="%"
          value={cauHinh.thuViec.tyLe * 100}
          disabled={!canEdit}
          onChange={(v) => capNhat({ thuViec: { tyLe: (v ?? 0) / 100 } })}
        />
      </Col>

      <Col span={8}>
        <FieldLabel>Tỷ lệ quy tắc thời vụ</FieldLabel>
        <InputNumber
          className="w-full"
          min={0}
          max={100}
          addonAfter="%"
          value={cauHinh.quyTacThoiVu.tyLe * 100}
          disabled={!canEdit}
          onChange={(v) =>
            capNhat({ quyTacThoiVu: { ...cauHinh.quyTacThoiVu, tyLe: (v ?? 0) / 100 } })
          }
        />
      </Col>
      <Col span={8}>
        <FieldLabel>Ngưỡng quy tắc thời vụ</FieldLabel>
        <InputNumber
          className="w-full"
          min={0}
          value={cauHinh.quyTacThoiVu.nguong}
          disabled={!canEdit}
          onChange={(v) =>
            capNhat({ quyTacThoiVu: { ...cauHinh.quyTacThoiVu, nguong: v ?? 0 } })
          }
        />
      </Col>
      <Col span={8} className="flex items-end">
        <Checkbox
          checked={cauHinh.quyTacCamKet.mienThue}
          disabled={!canEdit}
          onChange={(e) => capNhat({ quyTacCamKet: { mienThue: e.target.checked } })}
        >
          Quy tắc cam kết: miễn thuế
        </Checkbox>
      </Col>
    </Row>
  );
}
