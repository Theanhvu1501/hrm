import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Segmented, Space, Tabs, message } from "antd";
import { FileExcelOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { apiErrorMessage } from "@/config/api";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import {
  bangLuongService,
  type DongBaoHiem,
  type DongCongDoan,
  type DongThueTheoKy,
} from "@/services/bangLuongService";

const tien = (v?: number) => (v ?? 0).toLocaleString("vi-VN");

/** Kỳ nhanh: tháng / quý / năm / tự chọn (yêu cầu d34). */
type LoaiKy = "thang" | "quy" | "nam" | "tu_chon";

function khoangCuaKy(loai: LoaiKy, moc: dayjs.Dayjs): [string, string] {
  if (loai === "quy") {
    const quy = Math.floor(moc.month() / 3);
    return [
      moc.month(quy * 3).format("YYYY-MM"),
      moc.month(quy * 3 + 2).format("YYYY-MM"),
    ];
  }
  if (loai === "nam") {
    return [moc.format("YYYY") + "-01", moc.format("YYYY") + "-12"];
  }
  return [moc.format("YYYY-MM"), moc.format("YYYY-MM")];
}

function xuatExcel(ten: string, luoi: Record<string, unknown>[]) {
  if (luoi.length === 0) {
    message.info("Không có dòng nào để xuất.");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(luoi);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, ten.slice(0, 28));
  XLSX.writeFile(wb, `${ten}.xlsx`);
}

/**
 * Ba bảng tổng hợp đọc từ bảng lương đã tổng hợp của kỳ:
 * BHXH (d33), Công đoàn (d35), Thuế TNCN theo kỳ tự chọn (d34).
 *
 * Gộp một màn ba tab thay vì ba màn: cùng một bộ lọc kỳ, cùng một nguồn dữ
 * liệu, và dùng chung quyền `/luong/bang-luong` nên không phải cấp quyền mới
 * lúc deploy.
 */
export function BaoCaoLuongPage() {
  const [loaiKy, setLoaiKy] = useState<LoaiKy>("thang");
  const [moc, setMoc] = useState(dayjs());
  const [tuThang, setTuThang] = useState(dayjs().format("YYYY-MM"));
  const [denThang, setDenThang] = useState(dayjs().format("YYYY-MM"));

  const [baoHiem, setBaoHiem] = useState<DongBaoHiem[]>([]);
  const [congDoan, setCongDoan] = useState<DongCongDoan[]>([]);
  const [thue, setThue] = useState<DongThueTheoKy[]>([]);
  const [dangTai, setDangTai] = useState(false);

  useEffect(() => {
    if (loaiKy === "tu_chon") return;
    const [tu, den] = khoangCuaKy(loaiKy, moc);
    setTuThang(tu);
    setDenThang(den);
  }, [loaiKy, moc]);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      const [bh, cd, th] = await Promise.all([
        // BHXH khai theo TỪNG THÁNG — lấy tháng cuối của kỳ đang xem, vì đó
        // là tháng người ta đang chuẩn bị nộp.
        bangLuongService.bangBaoHiem(denThang),
        bangLuongService.bangCongDoan(tuThang, denThang),
        bangLuongService.bangThueTheoKy(tuThang, denThang),
      ]);
      setBaoHiem(bh);
      setCongDoan(cd);
      setThue(th);
    } catch (err) {
      message.error(apiErrorMessage(err, "Không tải được số liệu"));
    } finally {
      setDangTai(false);
    }
  }, [tuThang, denThang]);

  useEffect(() => {
    void nap();
  }, [nap]);

  const cotBaoHiem: ColumnsType<DongBaoHiem> = [
    { title: "TT", dataIndex: "stt", key: "stt", width: 55 },
    { title: "Mã NV", dataIndex: "maNhanVien", key: "maNhanVien", width: 100 },
    { title: "Họ và tên", dataIndex: "hoTen", key: "hoTen" },
    {
      title: "Mức đóng",
      dataIndex: "mucDong",
      key: "mucDong",
      align: "right",
      render: tien,
    },
    { title: "Ốm đau – TS 3%", dataIndex: "omDauThaiSan", key: "od", align: "right", render: tien },
    { title: "Hưu trí – TT 22%", dataIndex: "huuTriTuTuat", key: "ht", align: "right", render: tien },
    { title: "BHYT 4,5%", dataIndex: "bhyt", key: "bhyt", align: "right", render: tien },
    { title: "BHTN 2%", dataIndex: "bhtn", key: "bhtn", align: "right", render: tien },
    { title: "TNLĐ-BNN 0,5%", dataIndex: "tnldBnn", key: "tnld", align: "right", render: tien },
    { title: "Cộng", dataIndex: "cong", key: "cong", align: "right", render: tien },
    { title: "NLĐ", dataIndex: "nld", key: "nld", align: "right", render: tien },
    { title: "Doanh nghiệp", dataIndex: "dn", key: "dn", align: "right", render: tien },
  ];

  const cotCongDoan: ColumnsType<DongCongDoan> = [
    { title: "TT", dataIndex: "stt", key: "stt", width: 55 },
    { title: "Mã NV", dataIndex: "maNhanVien", key: "maNhanVien", width: 100 },
    { title: "Họ và tên", dataIndex: "hoTen", key: "hoTen" },
    { title: "Căn cứ tính", dataIndex: "mucDong", key: "mucDong", align: "right", render: tien },
    {
      title: "Tỷ lệ",
      dataIndex: "tyLe",
      key: "tyLe",
      width: 90,
      align: "right",
      render: (v: number) => `${(v * 100).toFixed(2)}%`,
    },
    { title: "Phí công đoàn", dataIndex: "soTien", key: "soTien", align: "right", render: tien },
  ];

  const cotThue: ColumnsType<DongThueTheoKy> = [
    { title: "TT", dataIndex: "stt", key: "stt", width: 55 },
    { title: "Mã NV", dataIndex: "maNhanVien", key: "maNhanVien", width: 100 },
    { title: "Họ và tên", dataIndex: "hoTen", key: "hoTen" },
    { title: "Số kỳ", dataIndex: "soKy", key: "soKy", width: 70, align: "center" },
    { title: "Tổng thu nhập", dataIndex: "tongThuNhap", key: "ttn", align: "right", render: tien },
    { title: "BHXH", dataIndex: "bhxh", key: "bhxh", align: "right", render: tien },
    { title: "Miễn thuế", dataIndex: "mienThue", key: "mt", align: "right", render: tien },
    { title: "Giảm trừ gia cảnh", dataIndex: "giamTruGiaCanh", key: "gtgc", align: "right", render: tien },
    { title: "TN tính thuế", dataIndex: "thuNhapTinhThue", key: "tntt", align: "right", render: tien },
    { title: "Thuế phải nộp", dataIndex: "thue", key: "thue", align: "right", render: tien },
  ];

  return (
    <Card>
      <Space wrap className="mb-3">
        <Segmented
          value={loaiKy}
          onChange={(v) => setLoaiKy(v as LoaiKy)}
          options={[
            { label: "Tháng", value: "thang" },
            { label: "Quý", value: "quy" },
            { label: "Năm", value: "nam" },
            { label: "Tự chọn", value: "tu_chon" },
          ]}
        />
        {loaiKy === "tu_chon" ? (
          <>
            <DatePicker
              picker="month"
              format="MM/YYYY"
              allowClear={false}
              value={dayjs(tuThang, "YYYY-MM")}
              onChange={(d) => d && setTuThang(d.format("YYYY-MM"))}
            />
            <span>→</span>
            <DatePicker
              picker="month"
              format="MM/YYYY"
              allowClear={false}
              value={dayjs(denThang, "YYYY-MM")}
              onChange={(d) => d && setDenThang(d.format("YYYY-MM"))}
            />
          </>
        ) : (
          <DatePicker
            picker={loaiKy === "nam" ? "year" : loaiKy === "quy" ? "quarter" : "month"}
            allowClear={false}
            value={moc}
            onChange={(d) => d && setMoc(d)}
          />
        )}
        <span className="text-[11px] text-[hsl(var(--ink-2))]">
          Kỳ: {tuThang} → {denThang}
        </span>
        <Button icon={<ReloadOutlined />} onClick={nap} loading={dangTai}>
          Tải lại
        </Button>
      </Space>

      <Tabs
        items={[
          {
            key: "bhxh",
            label: "BHXH",
            children: (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-[hsl(var(--ink-2))]">
                    Trích nộp của tháng {denThang} — số liệu lấy từ bảng lương
                    đã tổng hợp của tháng đó.
                  </span>
                  <Button
                    size="small"
                    icon={<FileExcelOutlined />}
                    onClick={() =>
                      xuatExcel(
                        `BHXH-${denThang}`,
                        baoHiem.map((d) => ({
                          TT: d.stt,
                          "Mã NV": d.maNhanVien,
                          "Họ và tên": d.hoTen,
                          "Mức đóng": d.mucDong,
                          "Ốm đau - thai sản": d.omDauThaiSan,
                          "Hưu trí - tử tuất": d.huuTriTuTuat,
                          BHYT: d.bhyt,
                          BHTN: d.bhtn,
                          "TNLĐ-BNN": d.tnldBnn,
                          Cộng: d.cong,
                          "NLĐ đóng": d.nld,
                          "DN đóng": d.dn,
                        })),
                      )
                    }
                  >
                    Xuất Excel
                  </Button>
                </div>
                <BangDuLieu<DongBaoHiem>
                  columns={cotBaoHiem}
                  dataSource={baoHiem}
                  rowKey="employeeId"
                  loading={dangTai}
                  pagination={false}
                  scroll={{ x: 1200 }}
                />
              </>
            ),
          },
          {
            key: "cong-doan",
            label: "Công đoàn",
            children: (
              <>
                <div className="mb-2 flex justify-end">
                  <Button
                    size="small"
                    icon={<FileExcelOutlined />}
                    onClick={() =>
                      xuatExcel(
                        `Cong-doan-${tuThang}_${denThang}`,
                        congDoan.map((d) => ({
                          TT: d.stt,
                          "Mã NV": d.maNhanVien,
                          "Họ và tên": d.hoTen,
                          "Căn cứ tính": d.mucDong,
                          "Tỷ lệ": d.tyLe,
                          "Phí công đoàn": d.soTien,
                        })),
                      )
                    }
                  >
                    Xuất Excel
                  </Button>
                </div>
                <BangDuLieu<DongCongDoan>
                  columns={cotCongDoan}
                  dataSource={congDoan}
                  rowKey="employeeId"
                  loading={dangTai}
                  pagination={false}
                />
              </>
            ),
          },
          {
            key: "thue",
            label: "Thuế TNCN",
            children: (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-[hsl(var(--ink-2))]">
                    Cộng số thuế đã tính của từng tháng trong kỳ — KHÔNG tính
                    lại trên tổng kỳ (thuế của người làm công khấu trừ theo
                    tháng). Quyết toán năm xem ở màn Quyết toán TNCN.
                  </span>
                  <Button
                    size="small"
                    icon={<FileExcelOutlined />}
                    onClick={() =>
                      xuatExcel(
                        `Thue-TNCN-${tuThang}_${denThang}`,
                        thue.map((d) => ({
                          TT: d.stt,
                          "Mã NV": d.maNhanVien,
                          "Họ và tên": d.hoTen,
                          "Số kỳ": d.soKy,
                          "Tổng thu nhập": d.tongThuNhap,
                          BHXH: d.bhxh,
                          "Miễn thuế": d.mienThue,
                          "Giảm trừ gia cảnh": d.giamTruGiaCanh,
                          "TN tính thuế": d.thuNhapTinhThue,
                          "Thuế phải nộp": d.thue,
                        })),
                      )
                    }
                  >
                    Xuất Excel
                  </Button>
                </div>
                <BangDuLieu<DongThueTheoKy>
                  columns={cotThue}
                  dataSource={thue}
                  rowKey="employeeId"
                  loading={dangTai}
                  pagination={false}
                  scroll={{ x: 1100 }}
                />
              </>
            ),
          },
        ]}
      />
    </Card>
  );
}

export default BaoCaoLuongPage;
