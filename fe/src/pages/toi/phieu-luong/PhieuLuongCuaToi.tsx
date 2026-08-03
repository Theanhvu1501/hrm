import { useCallback, useEffect, useState } from "react";
import { Alert, Collapse, Select, Spin } from "antd";
import {
  phieuLuongService,
  type PhieuLuong,
} from "@/services/phieuLuongService";

/**
 * Phiếu lương của chính nhân viên đang đăng nhập.
 *
 * Màn CHỈ ĐỌC nên dùng `useState` thuần, không CHandler — đúng lệ
 * `BangCongThang.tsx` trong cùng vỏ `/toi`. CHandler tồn tại cho các màn có
 * vòng đời (tổng hợp → sửa → chốt), màn này không có.
 *
 * Backend chỉ trả kỳ ĐÃ CHỐT và chỉ mức THỰC TẾ; không có gì để lọc thêm ở
 * đây. Ba trạng thái rỗng đều báo rõ thay vì hiện bảng trống — bảng trống làm
 * người dùng tưởng mình mất lương.
 */

function formatTien(v?: number): string {
  if (v === undefined || v === null) return "0";
  return v.toLocaleString("vi-VN");
}

function nhanThang(thang: string): string {
  const [nam, thangSo] = thang.split("-");
  return `Tháng ${thangSo}/${nam}`;
}

function Dong({
  nhan,
  tien,
  am,
  dam,
}: {
  nhan: string;
  tien: number;
  am?: boolean;
  dam?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-1 ${dam ? "font-semibold text-base" : "text-sm"}`}
    >
      <span>{nhan}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {am && tien > 0 ? "-" : ""}
        {formatTien(tien)}
      </span>
    </div>
  );
}

export default function PhieuLuongCuaToi() {
  const [cacKy, setCacKy] = useState<string[] | null>(null);
  const [thang, setThang] = useState<string | null>(null);
  const [phieu, setPhieu] = useState<PhieuLuong | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [loiHoSo, setLoiHoSo] = useState(false);

  useEffect(() => {
    let huy = false;
    phieuLuongService
      .cacKy()
      .then((ds) => {
        if (huy) return;
        setCacKy(ds);
        setThang(ds[0] ?? null);
        if (ds.length === 0) setDangTai(false);
      })
      .catch((e: unknown) => {
        if (huy) return;
        // 404 = `resolveEmployeeFromUser()` không tìm thấy hồ sơ. Đây là
        // trạng thái THẬT (tài khoản quản trị thuần, người mới chưa có hồ sơ),
        // không phải lỗi hệ thống — báo đúng việc cần làm thay vì "thử lại".
        const status = (e as { response?: { status?: number } })?.response?.status;
        setLoiHoSo(status === 404);
        setCacKy([]);
        setDangTai(false);
      });
    return () => {
      huy = true;
    };
  }, []);

  const taiPhieu = useCallback((thangCanTai: string) => {
    setDangTai(true);
    phieuLuongService
      .phieu(thangCanTai)
      .then(setPhieu)
      .catch(() => setPhieu(null))
      .finally(() => setDangTai(false));
  }, []);

  useEffect(() => {
    if (thang) taiPhieu(thang);
  }, [thang, taiPhieu]);

  if (loiHoSo) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Tài khoản chưa gắn hồ sơ nhân viên"
        description="Liên hệ HR để được gắn hồ sơ, sau đó phiếu lương sẽ hiện ở đây."
      />
    );
  }

  if (cacKy && cacKy.length === 0) {
    return (
      <Alert
        type="info"
        showIcon
        message="Chưa có phiếu lương nào"
        description="Phiếu lương chỉ hiện sau khi kế toán chốt kỳ lương."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Phiếu lương</h2>
        <Select
          value={thang ?? undefined}
          onChange={setThang}
          style={{ minWidth: 160 }}
          options={(cacKy ?? []).map((k) => ({ value: k, label: nhanThang(k) }))}
        />
      </div>

      {dangTai && <Spin />}

      {!dangTai && !phieu && (
        <Alert
          type="info"
          showIcon
          message="Chưa có phiếu lương tháng này"
          description="Kỳ lương chưa được chốt, hoặc tháng này chưa có dữ liệu."
        />
      )}

      {!dangTai && phieu && (
        <div className="rounded border p-3 space-y-3">
          <div className="text-sm text-muted-foreground">
            {phieu.hoTen} · {phieu.maNhanVien} · Công: {phieu.congThuong}
            {phieu.congThuViec > 0 && ` (thử việc ${phieu.congThuViec})`}
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">
              Các khoản
            </div>
            {phieu.khoan.map((k) => (
              <Dong key={k.ma} nhan={k.ten} tien={k.soTien} />
            ))}
            <div className="border-t mt-1 pt-1">
              <Dong nhan="Tổng thu nhập" tien={phieu.tongThuNhap} dam />
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">
              Các khoản trừ
            </div>
            <Dong nhan="BHXH" tien={phieu.bhxh} am />
            <Dong nhan="Thuế TNCN" tien={phieu.thue} am />
            <Dong nhan="Phí công đoàn" tien={phieu.phiCongDoan} am />
            <Dong nhan="Tạm ứng" tien={phieu.tamUng} am />
            <Dong nhan="Khấu trừ khác" tien={phieu.khauTruKhac} am />
            <div className="border-t mt-1 pt-1">
              <Dong nhan="THỰC LĨNH" tien={phieu.thucLinh} dam />
            </div>
          </div>

          {/* Thu gọn: trả lời câu "sao thuế lại thế" mà không làm rối phiếu. */}
          <Collapse
            ghost
            size="small"
            items={[
              {
                key: "thue",
                label: "Cách tính thuế",
                children: (
                  <div>
                    <Dong nhan="Thu nhập miễn thuế" tien={phieu.thuNhapMienThue} />
                    <Dong nhan="Trong đó, giảm trừ gia cảnh" tien={phieu.giamTru} />
                    <Dong nhan="Thu nhập tính thuế" tien={phieu.thuNhapTinhThue} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
