import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button, Divider, Input, Space } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { OChonNgay } from "@/components/form/OChonNgay";
import { DinhKemO } from "@/components/form/DinhKemO";
import { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import { useHoSoDinhKemId } from "../HoSoDinhKemContext";
import { idDong } from "../idDong";

/**
 * Dòng bằng cấp/người phụ thuộc lưu TRƯỚC bản vá này chưa có `id`, mà đính kèm
 * thì bám theo `id`. Không có khoá thì thà nói thẳng "lưu lại một lần" còn hơn
 * đính kèm vào khoá rỗng — khoá rỗng nghĩa là không lọc, và cả tệp của các dòng
 * khác sẽ hiện chung một chỗ.
 */
function ThieuKhoa() {
  return (
    <div className="mt-2 text-[10.5px] text-[hsl(var(--ink-2))]">
      Bấm Cập nhật một lần để đính kèm tệp cho dòng này.
    </div>
  );
}

export function BangCapGiaCanhTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();
  const bangCapArray = useFieldArray({ control, name: "bangCap" });
  const nguoiPhuThuocArray = useFieldArray({ control, name: "nguoiPhuThuoc" });
  const idDinhKem = useHoSoDinhKemId();

  // Đọc id nghiệp vụ của từng dòng (khác `field.id` của react-hook-form — id
  // đó chỉ sống trong bộ nhớ, không lưu xuống DB).
  const bangCap = useWatch({ control, name: "bangCap" }) ?? [];
  const nguoiPhuThuoc = useWatch({ control, name: "nguoiPhuThuoc" }) ?? [];

  return (
    <div>
      <Divider titlePlacement="left">Bằng cấp</Divider>
      <Space direction="vertical" className="w-full" size="small">
        {bangCapArray.fields.map((field, index) => {
          const khoaPhu = bangCap[index]?.id;
          return (
            <div key={field.id} className="border border-border p-2">
              <Space align="baseline" wrap>
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
              {khoaPhu ? (
                <div className="mt-2">
                  <DinhKemO
                    nhan="Bản scan bằng cấp"
                    doiTuong="nhan_vien"
                    doiTuongId={idDinhKem}
                    nhom="bang_cap"
                    khoaPhu={khoaPhu}
                    nhieu
                  />
                </div>
              ) : (
                <ThieuKhoa />
              )}
            </div>
          );
        })}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() =>
            // Sinh `id` NGAY lúc thêm dòng: tệp đính kèm bám theo id này, đợi
            // tới lúc lưu mới có thì không đính kèm được trước khi lưu.
            bangCapArray.append({ id: idDong(), ten: "", noiCap: "", nam: "" })
          }
        >
          Thêm bằng cấp
        </Button>
      </Space>

      <Divider titlePlacement="left">Gia cảnh (Người phụ thuộc)</Divider>
      <div className="mb-2 text-[10.5px] text-[hsl(var(--ink-2))]">
        Số người phụ thuộc để tính giảm trừ gia cảnh trên bảng lương và bảng
        thuế được đếm từ danh sách này — không nhập tay ở tab Lương nữa.
      </div>
      <Space direction="vertical" className="w-full" size="small">
        {nguoiPhuThuocArray.fields.map((field, index) => {
          const khoaPhu = nguoiPhuThuoc[index]?.id;
          return (
            <div key={field.id} className="border border-border p-2">
              <Space align="baseline" wrap>
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
                    <OChonNgay
                      value={f.value}
                      onChange={f.onChange}
                      onBlur={f.onBlur}
                      // Hàng này không có nhãn, các ô bên cạnh dùng placeholder
                      // làm nhãn — ô ngày cũng vậy cho khỏi lạc giữa hàng.
                      placeholder="Ngày sinh"
                      style={{ width: 160 }}
                    />
                  )}
                />
                <Controller
                  name={`nguoiPhuThuoc.${index}.giayTo`}
                  control={control}
                  render={({ field: f }) => (
                    <Input {...f} placeholder="Số giấy tờ" style={{ width: 160 }} />
                  )}
                />
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => nguoiPhuThuocArray.remove(index)}
                />
              </Space>
              {khoaPhu ? (
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <DinhKemO
                    nhan="Giấy tờ cá nhân"
                    doiTuong="nhan_vien"
                    doiTuongId={idDinhKem}
                    nhom="nguoi_phu_thuoc:ca_nhan"
                    khoaPhu={khoaPhu}
                    nhieu
                    goiY="Khai sinh, CCCD…"
                  />
                  <DinhKemO
                    nhan="Chứng minh mối quan hệ"
                    doiTuong="nhan_vien"
                    doiTuongId={idDinhKem}
                    nhom="nguoi_phu_thuoc:quan_he"
                    khoaPhu={khoaPhu}
                    nhieu
                    goiY="Hộ khẩu, giấy xác nhận…"
                  />
                  <DinhKemO
                    nhan="Giấy tờ khác"
                    doiTuong="nhan_vien"
                    doiTuongId={idDinhKem}
                    nhom="nguoi_phu_thuoc:khac"
                    khoaPhu={khoaPhu}
                    nhieu
                  />
                </div>
              ) : (
                <ThieuKhoa />
              )}
            </div>
          );
        })}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() =>
            nguoiPhuThuocArray.append({
              id: idDong(),
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
