import { useEffect, useState } from "react";
import { Alert, Button, Modal } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import {
  useDonTuCuaToiHandler,
  useDonTuCuaToiState,
} from "../DonTuCuaToiHandlerContext";
import {
  BUOI_OPTIONS,
  LOAI_DON_OPTIONS,
  LOAI_NGHI_OPTIONS,
  labelFor,
} from "@/pages/cham-cong/don-cham-cong/constants";
import { homNayVN } from "@/ultils/thoiGianVN";
import {
  GIA_TRI_MAC_DINH,
  GiaTriFormDon,
  hienTruong,
} from "../truongDon";
import { MAT_HINH_LOAI } from "../loaiDonUI";
import "./FormNopDon.state";
import "../don-tu.css";

/**
 * Form nộp đơn của nhân viên.
 *
 * Giá trị form nằm ở `useState` cục bộ chứ không ở CHandler: đây là dữ liệu
 * sống đúng bằng thời gian dialog mở, không ai bên ngoài form cần đọc nó.
 * Handler chỉ nhận trọn bộ giá trị lúc bấm nộp — nhờ vậy `dungDtoNopDon()` là
 * cửa duy nhất dữ liệu đi ra mạng.
 */
export function FormNopDon() {
  const handler = useDonTuCuaToiHandler();
  const [formMo] = useDonTuCuaToiState("formMo", false);
  const [loaiDaChon] = useDonTuCuaToiState("loaiDaChon", "");
  const [dangGui] = useDonTuCuaToiState("dangGui", false);
  const [loiGui] = useDonTuCuaToiState("loiGui", "");
  const [v, setV] = useState<GiaTriFormDon>(GIA_TRI_MAC_DINH);

  // Mỗi lần mở lại là một tờ đơn mới, ĐÚNG loại đã chọn ở bước trước. Ngày mặc
  // định là hôm nay: phần lớn đơn giải trình/OT nói về chính ngày hôm nay, còn
  // đơn nghỉ thì người dùng sửa. Phụ thuộc `loaiDaChon` để đổi loại (Đổi loại →
  // chọn lại) cũng đặt lại form sang loại mới.
  useEffect(() => {
    if (formMo && loaiDaChon) {
      setV({ ...GIA_TRI_MAC_DINH, loaiDon: loaiDaChon, ngay: homNayVN() });
    }
  }, [formMo, loaiDaChon]);

  const sua = <K extends keyof GiaTriFormDon>(k: K, giaTri: GiaTriFormDon[K]) =>
    setV((truoc) => ({ ...truoc, [k]: giaTri }));

  const laDonNghi = v.loaiDon === "nghi_phep" || v.loaiDon === "nghi_bu";
  const matHinh = loaiDaChon ? MAT_HINH_LOAI[loaiDaChon] : null;
  const nhanLoai = labelFor(LOAI_DON_OPTIONS, loaiDaChon || undefined);

  return (
    <Modal
      open={!!formMo}
      // Đầu form nhắc lại loại đơn đã chọn (icon + tên) kèm nút "Đổi loại" quay
      // về tấm chọn — người dùng luôn thấy mình đang điền đơn gì, và đổi ý
      // không phải đóng hết đi làm lại.
      title={
        <div className="flex items-center gap-2">
          {matHinh && (
            <span
              className="don-tu-icon don-tu-icon-nho"
              style={{ background: matHinh.gradient }}
            >
              {matHinh.icon}
            </span>
          )}
          <span>{nhanLoai}</span>
          <button
            type="button"
            className="don-tu-doi-loai"
            onClick={() => handler.executeEvent("doiLoai", {})}
          >
            <LeftOutlined /> Đổi loại
          </button>
        </div>
      }
      onCancel={() => handler.executeEvent("dongForm", {})}
      centered
      destroyOnHidden
      // Bo góc phải override tại chỗ: ConfigProvider ở App.tsx đặt
      // borderRadius 0 cho TOÀN dự án (quyết định của các màn quản trị). Sửa
      // token toàn cục để làm mềm một dialog của vỏ nhân viên là phá mọi bảng
      // và form bên khu quản trị.
      styles={{ content: { borderRadius: 16 } }}
      footer={[
        <Button
          key="huy"
          onClick={() => handler.executeEvent("dongForm", {})}
          style={{ borderRadius: 999 }}
        >
          Đóng
        </Button>,
        <Button
          key="gui"
          type="primary"
          loading={!!dangGui}
          onClick={() => handler.executeEvent("nopDon", v)}
          style={{ borderRadius: 999, backgroundColor: "#1f7769", borderColor: "#1f7769" }}
        >
          Gửi đơn
        </Button>,
      ]}
    >
      <div className="mb-3">
        <label className="don-tu-label" htmlFor="don-ngay">
          {laDonNghi ? "Từ ngày" : "Ngày"}
        </label>
        <input
          id="don-ngay"
          type="date"
          className="don-tu-field"
          value={v.ngay}
          onChange={(e) => sua("ngay", e.target.value)}
        />
      </div>

      {hienTruong(v, "denNgay") && (
        <div className="mb-3">
          <label className="don-tu-label" htmlFor="don-den-ngay">
            Đến ngày
          </label>
          <input
            id="don-den-ngay"
            type="date"
            className="don-tu-field"
            value={v.denNgay}
            onChange={(e) => sua("denNgay", e.target.value)}
          />
          <div className="mt-1 text-[11px] text-[color:var(--emp-muted)]">
            Để trống nếu chỉ nghỉ một ngày.
          </div>
        </div>
      )}

      {hienTruong(v, "buoi") && (
        <div className="mb-3">
          <label className="don-tu-label" htmlFor="don-buoi">
            Buổi
          </label>
          <select
            id="don-buoi"
            className="don-tu-field"
            value={v.buoi}
            onChange={(e) => sua("buoi", e.target.value as GiaTriFormDon["buoi"])}
          >
            {BUOI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {hienTruong(v, "loaiNghi") && (
        <div className="mb-3">
          <label className="don-tu-label" htmlFor="don-loai-nghi">
            Loại nghỉ
          </label>
          <select
            id="don-loai-nghi"
            className="don-tu-field"
            value={v.loaiNghi}
            onChange={(e) =>
              sua("loaiNghi", e.target.value as GiaTriFormDon["loaiNghi"])
            }
          >
            <option value="">— Chọn loại nghỉ —</option>
            {LOAI_NGHI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {hienTruong(v, "gioTu") && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="don-tu-label" htmlFor="don-gio-tu">
              Từ giờ
            </label>
            <input
              id="don-gio-tu"
              type="time"
              className="don-tu-field"
              value={v.gioTu}
              onChange={(e) => sua("gioTu", e.target.value)}
            />
          </div>
          <div>
            <label className="don-tu-label" htmlFor="don-gio-den">
              Đến giờ
            </label>
            <input
              id="don-gio-den"
              type="time"
              className="don-tu-field"
              value={v.gioDen}
              onChange={(e) => sua("gioDen", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="mb-1">
        <label className="don-tu-label" htmlFor="don-ly-do">
          Lý do
        </label>
        <textarea
          id="don-ly-do"
          rows={3}
          className="don-tu-field"
          placeholder="Nói ngắn gọn lý do để người duyệt hiểu ngay"
          value={v.lyDo}
          onChange={(e) => sua("lyDo", e.target.value)}
        />
      </div>

      {/* Lỗi nằm NGAY TRÊN nút gửi (cuối form) chứ không phải đầu form: trên
          màn hình điện thoại người dùng đang nhìn nút, một câu lỗi ở đầu form
          rất dễ nằm ngoài vùng nhìn thấy. */}
      {loiGui && (
        <Alert
          className="mt-2"
          type="error"
          showIcon
          // antd v6: `message` đã deprecated, dùng `title`.
          title={loiGui}
          style={{ borderRadius: 10 }}
        />
      )}
    </Modal>
  );
}
