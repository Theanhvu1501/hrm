import { useEffect, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { InputNumber, Checkbox, Row, Col, Select } from "antd";
import {
  cauHinhLuongService,
  type CauHinhLuong,
} from "@/services/cauHinhLuongService";
import { FieldLabel } from "@/components/form/FieldLabel";
import { OChonNgay } from "@/components/form/OChonNgay";
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
    <div className="mb-2 border-b border-border pb-1.5">
      <div className="text-[12.5px] font-bold">{children}</div>
      {mo && (
        <div className="mt-0.5 text-[10.5px] text-[hsl(var(--ink-2))]">{mo}</div>
      )}
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
      <FieldLabel>{nhan}</FieldLabel>
      {children}
      {goiY && (
        <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">{goiY}</div>
      )}
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
          <div className="ml-6 text-[10.5px] text-[hsl(var(--ink-2))]">{mo}</div>
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

  /**
   * Khoản được phép đặt số riêng cho từng người. Cố ý lọc theo cờ
   * `choPhepRieng` chứ không hiện hết: công ty khai 20 khoản thì tab Lương
   * biến thành 20 ô trống, không ai biết ô nào cần điền.
   */
  const khoanRieng = (chung?.khoanLuong ?? []).filter((k) => k.choPhepRieng);

  /** Mức chung công ty của một khoản, để hiện làm gợi ý dưới ô nhập. */
  const mucChung = (k: (typeof khoanRieng)[number]): number | undefined =>
    k.loaiCongThuc === "DINH_MUC_x_CONG" ? k.thamSo.dinhMuc : k.thamSo.soTien;

  const nguoiPhuThuoc = useWatch({ control, name: "nguoiPhuThuoc" });
  // Đếm đúng như BE: chỉ dòng CÓ họ tên mới là một người phụ thuộc — dòng
  // trống người dùng vừa bấm "Thêm" chưa phải là một suất giảm trừ.
  const soNPT = (nguoiPhuThuoc ?? []).filter((n) => n?.hoTen?.trim()).length;

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
      <Row gutter={[12, 8]}>
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
        {/* Hai ô cũ đã bỏ (yêu cầu d9):
            - "Phụ cấp cố định": phụ cấp nay khai theo từng khoản ở Cấu hình
              lương rồi đặt số riêng bên dưới, nên một ô gộp là con số thứ hai
              nói cùng một chuyện.
            - "Số người phụ thuộc": đã nhập ở tab Bằng cấp & Gia cảnh; BE đếm
              từ đó (`chuanHoaHoSo`). Ở đây chỉ HIỂN THỊ lại. */}
        <Col span={12}>
          <O
            nhan="Số người phụ thuộc"
            goiY="Đếm từ danh sách ở tab Bằng cấp & Gia cảnh — sửa ở tab đó."
          >
            <div className="flex h-[32px] items-center text-[12px]">
              {soNPT} người
            </div>
          </O>
        </Col>
      </Row>

      {khoanRieng.length > 0 && (
        <div className="mt-4">
          <TieuDeNhom mo="Để trống = ăn mức chung của công ty. Điền 0 = người này không có khoản đó.">
            Phụ cấp riêng của người này
          </TieuDeNhom>
          <Row gutter={[12, 8]}>
            {khoanRieng.map((k) => (
              <Col span={12} key={k.ma}>
                <O
                  nhan={`${k.ten}${
                    k.loaiCongThuc === "DINH_MUC_x_CONG" ? " (₫/ngày)" : " (₫/tháng)"
                  }`}
                  goiY={
                    mucChung(k) === undefined
                      ? "Công ty chưa đặt mức chung."
                      : `Theo công ty: ${mucChung(k)!.toLocaleString("vi-VN")} ₫`
                  }
                >
                  <Controller
                    name={`giaTriKhoan.${k.ma}` as never}
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...tien}
                        placeholder="Theo công ty"
                        {...field}
                        value={(field.value as number | null | undefined) ?? null}
                      />
                    )}
                  />
                </O>
              </Col>
            ))}
          </Row>
        </div>
      )}

      <div className="mt-4">
        <TieuDeNhom>Hợp đồng &amp; bảo hiểm</TieuDeNhom>
        <Row gutter={[12, 8]}>
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
          {/* Yêu cầu d9: "Mục đóng BH: chọn thời điểm báo tăng => từ thời
              điểm". Chỉ hiện khi đã tích đóng BH — hỏi mốc báo tăng của người
              không đóng bảo hiểm là một ô không bao giờ dùng tới. */}
          {dongBH && (
            <Col span={12}>
              <O
                nhan="Báo tăng bảo hiểm từ ngày"
                goiY="Để trống = đóng từ đầu. Bảng BHXH chỉ trích từ tháng này trở đi."
              >
                <Controller
                  name="ngayBatDauDongBH"
                  control={control}
                  render={({ field }) => (
                    <OChonNgay
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </O>
            </Col>
          )}
        </Row>

        {/* Bốn ô tick trên cộng lại ra đúng MỘT cách tính, mà nhìn ô tick thì
            không thấy được — nhất là khi tick nhiều ô cùng lúc, cái nào thắng.
            Khối này nói thẳng kết quả, tỷ lệ lấy thật từ Cấu hình lương. */}
        <div className="mt-3 border border-border bg-muted px-3 py-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[hsl(var(--ink-2))]">
            Kết quả áp dụng
          </div>
          <dl className="mt-1.5 space-y-1 text-[11px]">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-[hsl(var(--ink-2))]">Thuế TNCN</dt>
              <dd>{dienGiai.thue}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-[hsl(var(--ink-2))]">Bảo hiểm</dt>
              <dd>{dienGiai.baoHiem}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-4">
        <TieuDeNhom mo="Chỉ điền khi nhân viên này khác quy định chung. Ô để trống thì lấy theo Cấu hình lương.">
          Cấu hình riêng
        </TieuDeNhom>
        <Row gutter={[12, 8]}>
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
                      {
                        value: "LUONG_VA_PHU_CAP",
                        label: "Lương + phụ cấp tính BHXH",
                      },
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
