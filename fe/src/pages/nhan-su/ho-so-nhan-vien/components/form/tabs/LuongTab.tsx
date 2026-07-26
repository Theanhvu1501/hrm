import { useEffect, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { InputNumber, Checkbox, Row, Col, Select } from "antd";
import {
  cauHinhLuongService,
  type CauHinhLuong,
} from "@/services/cauHinhLuongService";
import type { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import { dienGiaiThueVaBaoHiem } from "./luongTab.dienGiai";

const tien = {
  style: { width: "100%" } as const,
  min: 0,
  step: 100000,
  formatter: (v?: number | string) =>
    `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  parser: (v?: string) => Number((v ?? "").replace(/,/g, "")) as unknown as number,
};

const tyLe = {
  style: { width: "100%" } as const,
  min: 0,
  max: 100,
  addonAfter: "%",
};

/** Tiêu đề một nhóm — gạch chân mảnh, hợp với kiểu sắc cạnh chung của app. */
function TieuDeNhom({
  children,
  mo,
}: {
  children: React.ReactNode;
  mo?: string;
}) {
  return (
    <div className="mb-3 border-b border-border pb-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide">
        {children}
      </div>
      {mo && <div className="mt-0.5 text-xs text-muted-foreground">{mo}</div>}
    </div>
  );
}

/** Một ô nhập: nhãn đúng kiểu các tab khác (KHÔNG dùng Form.Item — antd đặt
 *  nhãn và khoảng cách khác hẳn, đứng cạnh các tab kia sẽ lệch). */
function O({
  nhan,
  goiY,
  children,
}: {
  nhan: string;
  goiY?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium">{nhan}</label>
      {children}
      {goiY && <div className="mt-1 text-xs text-muted-foreground">{goiY}</div>}
    </div>
  );
}

/** Ô tick kèm một dòng giải thích, thay cho các Checkbox dính liền một hàng. */
function CoTick({
  ten,
  nhan,
  mo,
}: {
  ten: "dongBH" | "thoiVu" | "camKet" | "hopDongThu2";
  nhan: string;
  mo: string;
}) {
  const { control } = useFormContext<HoSoNhanVienFormValues>();
  return (
    <Controller
      name={ten}
      control={control}
      render={({ field }) => (
        <div>
          <Checkbox
            checked={!!field.value}
            onChange={(e) => field.onChange(e.target.checked)}
          >
            {nhan}
          </Checkbox>
          <div className="ml-6 text-xs text-muted-foreground">{mo}</div>
        </div>
      )}
    />
  );
}

export function LuongTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();

  // Cấu hình chung dùng cho hai việc: placeholder "để trống thì ra số mấy" ở
  // nhóm Cấu hình riêng, và các tỷ lệ thật trong khối Kết quả áp dụng. Lỗi tải
  // (vd không có quyền `/luong/cau-hinh:xem`) KHÔNG chặn form lưu.
  const [chung, setChung] = useState<CauHinhLuong | null>(null);
  useEffect(() => {
    cauHinhLuongService
      .get()
      .then(setChung)
      .catch(() => setChung(null));
  }, []);

  const [dongBH, thoiVu, camKet, hopDongThu2] =
    useWatch({
      control,
      name: ["dongBH", "thoiVu", "camKet", "hopDongThu2"],
    }) ?? [];
  const dienGiai = dienGiaiThueVaBaoHiem(
    { dongBH, thoiVu, camKet, hopDongThu2 },
    chung
  );

  const ph = (v?: number, donVi = "") =>
    v === undefined
      ? "Theo cấu hình lương"
      : `${v}${donVi} — theo cấu hình lương`;

  return (
    <div>
      <TieuDeNhom mo="Một kỳ lương sinh ra hai bảng từ hai con số này: mức khai báo để nộp thuế và bảo hiểm, lương thoả thuận là số nhân viên thực nhận.">
        Thu nhập
      </TieuDeNhom>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <O nhan="Lương thoả thuận (₫/tháng)">
            <Controller
              name="luongThoaThuan"
              control={control}
              render={({ field }) => <InputNumber {...tien} {...field} />}
            />
          </O>
        </Col>
        <Col span={12}>
          <O
            nhan="Mức lương khai báo (₫/tháng)"
            goiY={
              chung
                ? `Để trống: dùng ${chung.mucKhaiBaoMacDinh.toLocaleString(
                    "vi-VN"
                  )} ₫ trong Cấu hình lương.`
                : "Để trống: dùng mức mặc định trong Cấu hình lương."
            }
          >
            <Controller
              name="mucKhaiBao"
              control={control}
              render={({ field }) => <InputNumber {...tien} {...field} />}
            />
          </O>
        </Col>
        <Col span={12}>
          <O
            nhan="Phụ cấp cố định (₫/tháng)"
            goiY="Xăng xe, điện thoại, chuyên cần… gộp một số."
          >
            <Controller
              name="phuCapCoDinh"
              control={control}
              render={({ field }) => <InputNumber {...tien} {...field} />}
            />
          </O>
        </Col>
        <Col span={12}>
          <O nhan="Số người phụ thuộc" goiY="Dùng để tính giảm trừ gia cảnh.">
            <Controller
              name="soNguoiPhuThuoc"
              control={control}
              render={({ field }) => (
                <InputNumber style={{ width: "100%" }} min={0} {...field} />
              )}
            />
          </O>
        </Col>
      </Row>

      <div className="mt-6">
        <TieuDeNhom>Hợp đồng &amp; bảo hiểm</TieuDeNhom>
        <Row gutter={[16, 12]}>
          <Col span={12}>
            <CoTick
              ten="dongBH"
              nhan="Đóng bảo hiểm"
              mo="Nhân viên tham gia BHXH tại công ty này."
            />
          </Col>
          <Col span={12}>
            <CoTick
              ten="thoiVu"
              nhan="Hợp đồng thời vụ"
              mo="Khấu trừ thuế theo tỷ lệ thời vụ thay vì lũy tiến."
            />
          </Col>
          <Col span={12}>
            <CoTick
              ten="camKet"
              nhan="Có bản cam kết"
              mo="Thu nhập cả năm chưa tới mức phải nộp thuế."
            />
          </Col>
          <Col span={12}>
            <CoTick
              ten="hopDongThu2"
              nhan="Hợp đồng lao động thứ 2"
              mo="Nhân viên đã có hợp đồng chính ở công ty khác."
            />
          </Col>
        </Row>

        {/* Bốn ô tick trên cộng lại ra đúng MỘT cách tính, mà nhìn ô tick thì
            không thấy được — nhất là khi tick nhiều ô cùng lúc, cái nào thắng.
            Khối này nói thẳng kết quả, tỷ lệ lấy thật từ Cấu hình lương. */}
        <div className="mt-4 border border-border bg-muted px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Kết quả áp dụng
          </div>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted-foreground">Thuế TNCN</dt>
              <dd>{dienGiai.thue}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted-foreground">Bảo hiểm</dt>
              <dd>{dienGiai.baoHiem}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6">
        <TieuDeNhom mo="Chỉ điền khi nhân viên này khác quy định chung. Ô để trống thì lấy theo Cấu hình lương.">
          Cấu hình riêng
        </TieuDeNhom>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <O nhan="Công chuẩn (ngày/tháng)">
              <Controller
                name="orCongChuan"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    style={{ width: "100%" }}
                    min={1}
                    placeholder={ph(chung?.congChuan)}
                    {...field}
                  />
                )}
              />
            </O>
          </Col>
          <Col span={12}>
            <O nhan="Tỷ lệ hưởng khi thử việc">
              <Controller
                name="orThuViecPhanTram"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...tyLe}
                    placeholder={ph(
                      chung ? chung.thuViec.tyLe * 100 : undefined,
                      "%"
                    )}
                    {...field}
                  />
                )}
              />
            </O>
          </Col>
          <Col span={12}>
            <O nhan="Tỷ lệ bảo hiểm nhân viên đóng">
              <Controller
                name="orBhxhPhanTram"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...tyLe}
                    placeholder={ph(
                      chung ? chung.bhxh.tyLe * 100 : undefined,
                      "%"
                    )}
                    {...field}
                  />
                )}
              />
            </O>
          </Col>
          <Col span={12}>
            <O nhan="Căn cứ đóng bảo hiểm">
              <Controller
                name="orBhxhCanCu"
                control={control}
                render={({ field }) => (
                  <Select
                    style={{ width: "100%" }}
                    allowClear
                    placeholder={
                      chung?.bhxh.canCu === "LUONG_THOA_THUAN"
                        ? "Lương thoả thuận — theo cấu hình lương"
                        : "Mức khai báo — theo cấu hình lương"
                    }
                    options={[
                      { value: "MUC_KHAI_BAO", label: "Mức khai báo" },
                      { value: "LUONG_THOA_THUAN", label: "Lương thoả thuận" },
                    ]}
                    {...field}
                  />
                )}
              />
            </O>
          </Col>
        </Row>
      </div>
    </div>
  );
}
