import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Button, Divider, Input, Space } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";

export function BangCapGiaCanhTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();
  const bangCapArray = useFieldArray({ control, name: "bangCap" });
  const nguoiPhuThuocArray = useFieldArray({ control, name: "nguoiPhuThuoc" });

  return (
    <div>
      <Divider titlePlacement="left">Bằng cấp</Divider>
      <Space direction="vertical" className="w-full" size="small">
        {bangCapArray.fields.map((field, index) => (
          <Space key={field.id} align="baseline" wrap>
            <Controller
              name={`bangCap.${index}.ten`}
              control={control}
              render={({ field: f }) => (
                <Input {...f} placeholder="Tên bằng cấp" style={{ width: 200 }} />
              )}
            />
            <Controller
              name={`bangCap.${index}.noiCap`}
              control={control}
              render={({ field: f }) => (
                <Input {...f} placeholder="Nơi cấp" style={{ width: 200 }} />
              )}
            />
            <Controller
              name={`bangCap.${index}.nam`}
              control={control}
              render={({ field: f }) => (
                <Input {...f} placeholder="Năm" style={{ width: 100 }} />
              )}
            />
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => bangCapArray.remove(index)}
            />
          </Space>
        ))}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => bangCapArray.append({ ten: "", noiCap: "", nam: "" })}
        >
          Thêm bằng cấp
        </Button>
      </Space>

      <Divider titlePlacement="left">Gia cảnh (Người phụ thuộc)</Divider>
      <Space direction="vertical" className="w-full" size="small">
        {nguoiPhuThuocArray.fields.map((field, index) => (
          <Space key={field.id} align="baseline" wrap>
            <Controller
              name={`nguoiPhuThuoc.${index}.hoTen`}
              control={control}
              render={({ field: f }) => (
                <Input {...f} placeholder="Họ tên" style={{ width: 180 }} />
              )}
            />
            <Controller
              name={`nguoiPhuThuoc.${index}.quanHe`}
              control={control}
              render={({ field: f }) => (
                <Input {...f} placeholder="Quan hệ" style={{ width: 140 }} />
              )}
            />
            <Controller
              name={`nguoiPhuThuoc.${index}.ngaySinh`}
              control={control}
              render={({ field: f }) => (
                <Input {...f} type="date" style={{ width: 160 }} />
              )}
            />
            <Controller
              name={`nguoiPhuThuoc.${index}.giayTo`}
              control={control}
              render={({ field: f }) => (
                <Input {...f} placeholder="Giấy tờ" style={{ width: 160 }} />
              )}
            />
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => nguoiPhuThuocArray.remove(index)}
            />
          </Space>
        ))}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() =>
            nguoiPhuThuocArray.append({
              hoTen: "",
              quanHe: "",
              ngaySinh: "",
              giayTo: "",
            })
          }
        >
          Thêm người phụ thuộc
        </Button>
      </Space>
    </div>
  );
}
