import {
  Form,
  DatePicker,
  Select,
  InputNumber,
  Input,
  Row,
  Col,
} from "antd";
import { CollapsibleSection } from "./CollapsibleSection";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import { LoaiChungTuType } from "@/services/loaiChungTuService";

interface BasicInfoFieldsProps {
  isEditing: boolean;
  form: ReturnType<typeof Form.useForm>[0];
}

export function BasicInfoFields({ isEditing, form }: BasicInfoFieldsProps) {
  const [loaiChungTuList] = useNhatKyChungState("loaiChungTuList", []);

  return (
    <>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item
            name="ngay"
            label="Ngày Phát Sinh CT"
            rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
            className="mb-2"
          >
            <DatePicker format="DD/MM/YYYY" className="w-full" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="ngayGhiSo"
            label="Ngày ghi sổ"
            className="mb-2"
          >
            <DatePicker format="DD/MM/YYYY" className="w-full" placeholder="Mặc định = ngày phát sinh" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="loai"
            label="Nghiệp vụ"
            rules={[{ required: true, message: "Vui lòng chọn nghiệp vụ" }]}
            className="mb-2"
          >
            <Select
              showSearch
              placeholder="Chọn nghiệp vụ"
              disabled={isEditing}
              optionFilterProp="label"
              options={loaiChungTuList?.map((lct: LoaiChungTuType) => ({
                value: lct.ma,
                label: lct.ten,
              }))}
              onChange={(value) => {
                const loaiChungTu = loaiChungTuList?.find((lct: LoaiChungTuType) => lct.ma === value);
                form.setFieldsValue({ loaiTen: loaiChungTu?.ten || value });
              }}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="soTien"
            label="Số tiền"
            rules={[
              { required: true, message: "Vui lòng nhập số tiền" },
              { type: "number", min: 1, message: "Số tiền phải lớn hơn 0" },
            ]}
            className="mb-2"
          >
            <InputNumber
              min={0}
              className="w-full"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => {
                const num = value
                  ? Number(value.replace(/\$\s?|(,*)/g, ""))
                  : 0;
                return num as unknown as 0;
              }}
              addonAfter="VNĐ"
            />
          </Form.Item>
        </Col>
      </Row>
      {/* Hidden field for loaiTen */}
      <Form.Item name="loaiTen" hidden>
        <Input />
      </Form.Item>
      <Form.Item
        name="noiDung"
        label="Nội dung"
        rules={[
          { required: true, message: "Vui lòng nhập nội dung" },
          { max: 500, message: "Nội dung tối đa 500 ký tự" },
        ]}
        className="mb-2"
      >
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder="Nhập nội dung bút toán"
        />
      </Form.Item>
      
      <CollapsibleSection title="Thông tin bổ sung" defaultOpen={false}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="nguoiGiaoDich"
              label="Người giao dịch"
              rules={[{ max: 200, message: "Người giao dịch tối đa 200 ký tự" }]}
              className="mb-2"
            >
              <Input placeholder="Nhập tên người giao dịch" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="diaChi"
              label="Địa chỉ"
              rules={[{ max: 500, message: "Địa chỉ tối đa 500 ký tự" }]}
              className="mb-2"
            >
              <Input placeholder="Nhập địa chỉ" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="ghiChu"
          label="Ghi chú"
          rules={[{ max: 1000, message: "Ghi chú tối đa 1000 ký tự" }]}
          className="mb-0"
        >
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Nhập ghi chú (nếu có)"
          />
        </Form.Item>
      </CollapsibleSection>
    </>
  );
}
