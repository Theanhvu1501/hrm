import { Form, Select, Row, Col, Input } from "antd";
import { QuyChuan } from "@/types";
import { LoaiChungTuType } from "@/services/loaiChungTuService";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import { CollapsibleSection } from "./CollapsibleSection";

interface AccountingFieldsProps {
  form: ReturnType<typeof Form.useForm>[0];
}

export function AccountingFields({ form }: AccountingFieldsProps) {
  const [quyChaunList] = useNhatKyChungState("quyChaunList", []);
  const [taiKhoanList] = useNhatKyChungState("taiKhoanList", []);
  const [loaiChungTuList] = useNhatKyChungState("loaiChungTuList", []);

  const handleQuyChaunChange = (value: string) => {
    const quyChuan = quyChaunList?.find((qc: QuyChuan) => qc.nghiepVu === value);
    if (quyChuan) {
      // Auto-fill loại chứng từ và tài khoản từ quy chuẩn
      const loaiChungTu = loaiChungTuList?.find((lct: LoaiChungTuType) => lct.ma === quyChuan.loaiGiaoDich);
      form.setFieldsValue({
        taiKhoanNo: quyChuan.taiKhoanNo,
        taiKhoanCo: quyChuan.taiKhoanCo,
        noiDung: quyChuan.moTa || form.getFieldValue("noiDung"),
        // Auto-fill loại chứng từ
        loai: quyChuan.loaiGiaoDich,
        loaiTen: loaiChungTu?.ten || quyChuan.loaiGiaoDich,
      });
    }
  };

  return (
    <>
      <CollapsibleSection title="Hạch toán" defaultOpen={true} required={true}>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="quyChuan" label="Loại giao dịch" className="mb-2">
              <Select
                showSearch
                allowClear
                placeholder="Chọn loại giao dịch"
                optionFilterProp="label"
                onChange={handleQuyChaunChange}
                options={quyChaunList?.map((q: QuyChuan) => ({
                  value: q.nghiepVu,
                  label: q.nghiepVu,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="taiKhoanNo"
              label="TK Nợ"
              rules={[{ required: true, message: "Vui lòng chọn TK Nợ" }]}
              className="mb-2"
            >
              <Select
                showSearch
                placeholder="Chọn TK Nợ"
                optionFilterProp="label"
                options={taiKhoanList?.map((tk: { ma: string; ten: string }) => ({
                  value: tk.ma,
                  label: `${tk.ma} - ${tk.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="taiKhoanCo"
              label="TK Có"
              rules={[{ required: true, message: "Vui lòng chọn TK Có" }]}
              className="mb-0"
            >
              <Select
                showSearch
                placeholder="Chọn TK Có"
                optionFilterProp="label"
                options={taiKhoanList?.map((tk: { ma: string; ten: string }) => ({
                  value: tk.ma,
                  label: `${tk.ma} - ${tk.ten}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </CollapsibleSection>
    </>
  );
}
