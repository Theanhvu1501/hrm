import { useEffect, useState } from "react";
import { Alert, Spin } from "antd";
import {
  overtimeBalanceService,
  SoDuQuyGio,
} from "@/services/overtimeBalanceService";

/**
 * Số giờ nghỉ bù còn dùng được, hiện ngay trên form đơn nghỉ bù.
 *
 * `onHetQuy` để form khoá nút Lưu: để người dùng điền hết form rồi mới nhận
 * 409 từ backend là bắt họ làm việc thừa cho một thứ biết trước là hỏng. Cả
 * hai kiểu nghỉ (`theo_ngay` VÀ `theo_gio`) đều trừ quỹ giờ —
 * `don-cham-cong.service.ts.tinhCacTruongSnapshot()` tính `soGioNghiBu` ở cả
 * hai nhánh — nên khoá áp dụng chung cho cả đơn nghỉ bù, không phân biệt
 * kieuNghi. Backend vẫn kiểm lại — đây chỉ là lớp báo sớm, không phải lớp
 * bảo vệ.
 *
 * KHÔNG khoá khi CHÍNH LỜI GỌI đọc số dư hỏng (mất mạng, quyền vừa bị thu
 * hồi...): người dùng vẫn có thể có quỹ, chỉ là FE không đọc được — khoá nút
 * Lưu trong tình huống đó biến một sự cố mạng tạm thời thành "không nộp đơn
 * được", tệ hơn nhiều so với việc để backend trả 409 muộn.
 */
export function SoDuQuyGioBanner({
  employeeId,
  onHetQuy,
}: {
  employeeId?: string;
  onHetQuy?: (hetQuy: boolean) => void;
}) {
  const [soDu, setSoDu] = useState<SoDuQuyGio | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState(false);

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi(false);

    const nap = employeeId
      ? overtimeBalanceService.soDuCuaNhanVien(employeeId)
      : overtimeBalanceService.soDuCuaToi();

    nap
      .then((kq) => {
        if (huy) return;
        setSoDu(kq);
        onHetQuy?.(kq.soGioConLai <= 0);
      })
      .catch(() => {
        if (huy) return;
        setLoi(true);
        // Không khoá nút Lưu khi CHÍNH LỜI GỌI hỏng — xem docblock trên.
        onHetQuy?.(false);
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });

    return () => {
      huy = true;
    };
  }, [employeeId, onHetQuy]);

  if (dangTai) return <Spin size="small" />;

  if (loi) {
    return (
      <Alert
        type="warning"
        showIcon
        title="Chưa đọc được số dư quỹ giờ. Bạn vẫn nộp được đơn, hệ thống sẽ kiểm lại khi lưu."
      />
    );
  }

  if (!soDu || soDu.soGioConLai <= 0) {
    return (
      <Alert
        type="error"
        showIcon
        title="Bạn chưa có giờ làm thêm nào để nghỉ bù."
        description="Giờ nghỉ bù đến từ các đơn làm thêm đã được duyệt."
      />
    );
  }

  // theoKy do backend trả đã sắp theo kỳ tích tăng dần, mà kỳ cũ hơn thì hạn
  // dùng sớm hơn, nên theoKy[0] là cái sắp hết hạn nhất. Nếu công ty đổi
  // soThangHanDung giữa chừng thì thứ tự này có thể lệch — chấp nhận được
  // cho một dòng thông báo, phanBoFifo() vẫn sắp lại theo hanDung khi trừ
  // thật.
  const sapHetHan = soDu.theoKy[0];

  return (
    <Alert
      type="info"
      showIcon
      title={`Bạn còn ${soDu.soGioConLai} giờ nghỉ bù.`}
      description={
        sapHetHan
          ? `Sớm nhất hết hạn ngày ${sapHetHan.hanDung} (${sapHetHan.soGioConLai} giờ của kỳ ${sapHetHan.kyTich}).`
          : undefined
      }
    />
  );
}
