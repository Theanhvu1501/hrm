import { useEffect, useState } from "react";
import {
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Alert,
  Button,
  Switch,
  TimePicker,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useCauHinhLuongState } from "../CauHinhLuongHandlerContext";
import {
  cauHinhLuongService,
  HE_SO_TICH_SAN,
  LAM_THEM_MAC_DINH,
  NHAN_LOAI_NGAY,
  type CauHinhLamThem,
  type CauHinhLuong,
} from "@/services/cauHinhLuongService";
import "../CauHinhLuongPage.state";

/**
 * Khai `soGioMoiNgay` + `lamThem` — tức BẬT quỹ giờ làm thêm cho công ty.
 *
 * (review nhánh, IMPORTANT 6) `ops/README.md` bước 3 vẫn bảo vận hành "vào màn
 * Cấu hình lương điền và lưu tay", nhưng màn đó CHƯA HỀ có hai trường này —
 * `grep -rn "lamThem\|soGioMoiNgay" fe/src` không ra gì. Và
 * `bang-luong.service.ts.layCauHinh()` chỉ tự tạo cấu hình có sẵn `lamThem`
 * khi CHƯA có bản ghi nào; công ty đã từng chạy bảng lương thì bản ghi cũ
 * không bao giờ được bồi thêm. Hệ quả: mọi tenant đã dùng lương trước P4.2a
 * KHÔNG có đường nào bật được tính năng — `layCauHinh()` trả `null`, không
 * đơn OT nào tích quỹ, và runbook mô tả một thao tác không tồn tại.
 *
 * CỐ Ý chọn màn hình thay vì backfill kiểu `bhCongTy`: backfill sẽ BẬT NGẦM
 * tính năng cho mọi tenant ngay lúc deploy, mà bật nó = đơn nghỉ bù của TOÀN
 * CÔNG TY bị chặn cho tới khi có đơn OT đầu tiên được duyệt (xem cảnh báo HR
 * ở bước 4 của runbook). Đó là quyết định của công ty, không phải hệ quả phụ
 * của một lần deploy.
 */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block mb-1 text-sm font-medium">{children}</label>;
}


/** Mã loại ngày: chữ thường / số / gạch dưới — cùng quy ước với `ngay_thuong`. */
const RE_MA_LOAI = /^[a-z][a-z0-9_]*$/;

export function LamThemEditor({ canEdit }: { canEdit: boolean }) {
  const [cauHinh, setCauHinh] = useCauHinhLuongState(
    "cauHinh",
    null as CauHinhLuong | null
  );
  const [maLoaiMoi, setMaLoaiMoi] = useState("");
  const [demDon, setDemDon] = useState<Record<string, number>>({});

  // Số đơn đang tham chiếu từng loại — chỉ để CHẶN xoá, nên hỏng thì im lặng
  // bỏ qua: không đáng làm chết cả màn Cấu hình lương vì một con số phụ trợ.
  // Hệ quả khi hỏng là nút xoá vẫn bật; xoá nhầm chỉ mất cột trên biểu mẫu
  // 03-LĐTL chứ không sai tiền (hệ số đã snapshot trong `phanBoOt`).
  useEffect(() => {
    let huy = false;
    cauHinhLuongService
      .demDonTheoLoaiOt()
      .then((d) => {
        if (!huy) setDemDon(d ?? {});
      })
      .catch(() => {});
    return () => {
      huy = true;
    };
  }, []);

  if (!cauHinh) return null;

  const lamThem = cauHinh.lamThem;

  const capNhat = (patch: Partial<CauHinhLuong>) =>
    setCauHinh({ ...cauHinh, ...patch });

  const capNhatLamThem = (patch: Partial<CauHinhLamThem>) =>
    capNhat({ lamThem: { ...(lamThem as CauHinhLamThem), ...patch } });

  /** Đảo chỗ hai dòng trong `uuTienLoai` — thứ tự mảng CHÍNH LÀ thứ tự ưu tiên. */
  const doiCho = (i: number, j: number) => {
    const ds = [...(lamThem as CauHinhLamThem).uuTienLoai];
    if (j < 0 || j >= ds.length) return;
    [ds[i], ds[j]] = [ds[j], ds[i]];
    capNhatLamThem({ uuTienLoai: ds });
  };

  const themLoai = () => {
    const lt = lamThem as CauHinhLamThem;
    const ma = maLoaiMoi.trim();
    if (!RE_MA_LOAI.test(ma) || lt.uuTienLoai.includes(ma)) return;
    capNhatLamThem({
      uuTienLoai: [...lt.uuTienLoai, ma],
      // Hệ số phải khai NGAY: DTO backend từ chối cả form nếu `uuTienLoai` có
      // khoá mà bảng hệ số không có (thiếu khoá → NaN trong bảng lương).
      heSoTra: { ...lt.heSoTra, [ma]: 1.5 },
      heSoTichQuy: { ...lt.heSoTichQuy, [ma]: 1.5 },
    });
    setMaLoaiMoi("");
  };

  const xoaLoai = (ma: string) => {
    const lt = lamThem as CauHinhLamThem;
    const { [ma]: _bo1, ...heSoTra } = lt.heSoTra;
    const { [ma]: _bo2, ...heSoTichQuy } = lt.heSoTichQuy;
    capNhatLamThem({
      uuTienLoai: lt.uuTienLoai.filter((x) => x !== ma),
      heSoTra,
      heSoTichQuy,
      // Bỏ luôn khỏi `mienThueChenh`: DTO từ chối khoá nằm ngoài `uuTienLoai`.
      mienThueChenh: lt.mienThueChenh.filter((x) => x !== ma),
    });
  };

  if (!lamThem) {
    return (
      <div className="space-y-3">
        <Alert
          type="warning"
          showIcon
          title="Công ty chưa bật quỹ giờ làm thêm."
          description="Chưa bật thì đơn làm thêm được duyệt KHÔNG tích giờ vào quỹ nào, và đơn nghỉ bù vẫn nộp tự do như trước."
        />
        <Alert
          type="error"
          showIcon
          title="Báo HR TRƯỚC khi bật."
          description="Từ lúc bật, đơn nghỉ bù trừ vào quỹ giờ và bị chặn ngay lúc nộp nếu không đủ số dư. Cố ý KHÔNG có backfill: mọi nhân viên bắt đầu ở 0 giờ, nên cả công ty không nộp được nghỉ bù cho tới khi có đơn làm thêm đầu tiên được duyệt. Nên bật cùng lúc với đợt duyệt làm thêm đầu tiên."
        />
        {canEdit && (
          <Button
            type="primary"
            onClick={() =>
              capNhat({
                soGioMoiNgay: cauHinh.soGioMoiNgay ?? 8,
                lamThem: {
                  ...LAM_THEM_MAC_DINH,
                  heSoTichQuy: { ...LAM_THEM_MAC_DINH.heSoTichQuy },
                },
              })
            }
          >
            Bật quỹ giờ làm thêm
          </Button>
        )}
        {canEdit && (
          <p className="text-sm text-muted-foreground">
            Bấm nút trên chỉ điền sẵn giá trị mặc định vào form — vẫn phải bấm
            “Lưu cấu hình” mới có hiệu lực.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        title="Quỹ giờ làm thêm đang bật."
        description="Đơn làm thêm được duyệt sẽ tích giờ (đã nhân hệ số) vào quỹ; đơn nghỉ bù trừ vào quỹ này theo thứ tự sắp hết hạn trước."
      />

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <FieldLabel>Số giờ của một ngày công</FieldLabel>
          <InputNumber
            className="w-full"
            min={0.5}
            step={0.5}
            addonAfter="giờ"
            value={cauHinh.soGioMoiNgay ?? 8}
            disabled={!canEdit}
            onChange={(v) => capNhat({ soGioMoiNgay: v ?? 8 })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Dùng quy đổi khi nhân viên xin nghỉ bù trọn ngày / nửa buổi.
          </p>
        </Col>

        <Col span={8}>
          <FieldLabel>Chế độ bù</FieldLabel>
          <Select
            className="w-full"
            value={lamThem.cheDoBu}
            disabled={!canEdit}
            // Ba chế độ còn lại (chi_tien / nhan_vien_chon / nghi_bu_va_chenh)
            // bị DTO backend từ chối là "chưa được hỗ trợ" — không bày ra một
            // lựa chọn chắc chắn 400.
            options={[{ value: "chi_nghi_bu", label: "Chỉ nghỉ bù" }]}
            onChange={(cheDoBu) => capNhatLamThem({ cheDoBu })}
          />
        </Col>

        <Col span={8}>
          <FieldLabel>Khi quỹ hết hạn</FieldLabel>
          <Select
            className="w-full"
            value={lamThem.khiHetHan}
            disabled={!canEdit}
            options={[
              { value: "quy_ra_tien", label: "Quy ra tiền (trả kỳ lương sau)" },
              { value: "huy_bo", label: "Huỷ bỏ (giờ mất hẳn)" },
            ]}
            onChange={(khiHetHan) => capNhatLamThem({ khiHetHan })}
          />
        </Col>

        <Col span={24}>
          <FieldLabel>Hệ số theo loại ngày</FieldLabel>
          <p className="mb-2 text-xs text-muted-foreground">
            Thứ tự từ trên xuống là thứ tự ưu tiên: một giờ thuộc nhiều loại
            thì loại ở trên thắng. Mặc định lễ &gt; nghỉ &gt; đêm &gt; thường,
            nên làm đêm ngày lễ vẫn ăn hệ số ngày lễ.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-1">Loại ngày</th>
                <th className="py-1">Hệ số trả tiền</th>
                <th className="py-1">Hệ số tích quỹ</th>
                <th className="py-1">Miễn thuế phần chênh</th>
                <th className="py-1">Thứ tự / Xoá</th>
              </tr>
            </thead>
            <tbody>
              {lamThem.uuTienLoai.map((khoa, i) => (
                <tr key={khoa}>
                  {/* Loại công ty tự thêm chưa có nhãn tiếng Việt thì hiện
                      chính khoá — thà xấu còn hơn ẩn mất một dòng hệ số đang
                      có hiệu lực. */}
                  <td className="py-1 pr-2">{NHAN_LOAI_NGAY[khoa] ?? khoa}</td>
                  <td className="py-1 pr-2">
                    <InputNumber
                      className="w-full"
                      min={0.1}
                      step={0.5}
                      value={lamThem.heSoTra[khoa]}
                      disabled={!canEdit}
                      onChange={(v) =>
                        capNhatLamThem({
                          heSoTra: { ...lamThem.heSoTra, [khoa]: v ?? 1 },
                        })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <InputNumber
                      className="w-full"
                      min={HE_SO_TICH_SAN[khoa] ?? 0.1}
                      step={0.5}
                      value={lamThem.heSoTichQuy[khoa]}
                      disabled={!canEdit}
                      onChange={(v) =>
                        capNhatLamThem({
                          heSoTichQuy: {
                            ...lamThem.heSoTichQuy,
                            [khoa]: v ?? HE_SO_TICH_SAN[khoa] ?? 1,
                          },
                        })
                      }
                    />
                  </td>
                  <td className="py-1">
                    <Switch
                      checked={lamThem.mienThueChenh.includes(khoa)}
                      disabled={!canEdit}
                      onChange={(bat) =>
                        capNhatLamThem({
                          mienThueChenh: bat
                            ? [...lamThem.mienThueChenh, khoa]
                            : lamThem.mienThueChenh.filter((x) => x !== khoa),
                        })
                      }
                    />
                  </td>
                  <td className="py-1 whitespace-nowrap">
                    <Button
                      size="small"
                      aria-label={`Lên ${khoa}`}
                      disabled={!canEdit || i === 0}
                      onClick={() => doiCho(i, i - 1)}
                    >
                      ↑
                    </Button>{" "}
                    <Button
                      size="small"
                      aria-label={`Xuống ${khoa}`}
                      disabled={!canEdit || i === lamThem.uuTienLoai.length - 1}
                      onClick={() => doiCho(i, i + 1)}
                    >
                      ↓
                    </Button>{" "}
                    <Tooltip
                      title={
                        demDon[khoa]
                          ? `Đang có ${demDon[khoa]} đơn làm thêm dùng loại này. Xoá đi thì biểu mẫu 03-LĐTL mất cột và hệ số âm thầm rơi về ngày thường.`
                          : undefined
                      }
                    >
                      {/* `span` bọc ngoài: antd Tooltip không hiện trên nút
                          disabled vì nút không phát sự kiện chuột. */}
                      <span>
                        <Button
                          size="small"
                          danger
                          aria-label={`Xoá ${khoa}`}
                          disabled={!canEdit || !!demDon[khoa]}
                          onClick={() => xoaLoai(khoa)}
                        >
                          Xoá
                        </Button>
                      </span>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {canEdit && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                size="small"
                className="max-w-56"
                placeholder="Mã loại mới, vd ngay_bao"
                aria-label="Mã loại ngày mới"
                value={maLoaiMoi}
                onChange={(e) => setMaLoaiMoi(e.target.value)}
                onPressEnter={themLoai}
              />
              <Button
                size="small"
                disabled={
                  !RE_MA_LOAI.test(maLoaiMoi.trim()) ||
                  lamThem.uuTienLoai.includes(maLoaiMoi.trim())
                }
                onClick={themLoai}
              >
                Thêm loại ngày
              </Button>
              <span className="text-xs text-muted-foreground">
                Chữ thường, số và gạch dưới. Loại mới vào cuối danh sách ưu
                tiên, hệ số mặc định 1,5 — sửa lại rồi bấm Lưu.
              </span>
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Hệ số tích quỹ tối thiểu 1,5 / 2,0 / 3,0 cho ngày thường / ngày
            nghỉ / ngày lễ (sàn BLLĐ 2019 Đ98.1) khi chế độ là “chỉ nghỉ bù”.
          </p>
        </Col>

        <Col span={8} className="flex items-end gap-2">
          <Switch
            checked={lamThem.khungGioDem !== null}
            disabled={!canEdit}
            onChange={(bat) =>
              capNhatLamThem({
                khungGioDem: bat ? { tu: "22:00", den: "06:00" } : null,
              })
            }
          />
          <span className="text-sm">Công ty có ca đêm</span>
        </Col>

        {lamThem.khungGioDem && (
          <Col span={16}>
            <FieldLabel>Khung giờ ban đêm</FieldLabel>
            <div className="flex items-center gap-2">
              <TimePicker
                format="HH:mm"
                minuteStep={15}
                allowClear={false}
                value={dayjs(lamThem.khungGioDem.tu, "HH:mm")}
                disabled={!canEdit}
                onChange={(v) =>
                  capNhatLamThem({
                    khungGioDem: {
                      ...lamThem.khungGioDem!,
                      tu: v?.format("HH:mm") ?? "22:00",
                    },
                  })
                }
              />
              <span>→</span>
              <TimePicker
                format="HH:mm"
                minuteStep={15}
                allowClear={false}
                value={dayjs(lamThem.khungGioDem.den, "HH:mm")}
                disabled={!canEdit}
                onChange={(v) =>
                  capNhatLamThem({
                    khungGioDem: {
                      ...lamThem.khungGioDem!,
                      den: v?.format("HH:mm") ?? "06:00",
                    },
                  })
                }
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              BLLĐ 2019 Đ106 định nghĩa ban đêm là 22:00–06:00. Giờ làm thêm
              rơi vào khung này được tách riêng khi tính lương.
            </p>
          </Col>
        )}

        <Col span={8} className="flex items-end gap-2">
          <Switch
            checked={lamThem.soThangHanDung !== null}
            disabled={!canEdit}
            onChange={(bat) =>
              capNhatLamThem({ soThangHanDung: bat ? 6 : null })
            }
          />
          <span className="text-sm">Quỹ có hạn dùng</span>
        </Col>

        {lamThem.soThangHanDung !== null && (
          <Col span={8}>
            <FieldLabel>Số tháng còn hiệu lực</FieldLabel>
            <InputNumber
              className="w-full"
              min={1}
              precision={0}
              addonAfter="tháng"
              value={lamThem.soThangHanDung}
              disabled={!canEdit}
              onChange={(v) => capNhatLamThem({ soThangHanDung: v ?? 1 })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tính từ cuối tháng tích. Quỹ quá hạn phải được HR đóng tay ở màn
              Quỹ giờ làm thêm — không có tác vụ tự chạy.
            </p>
          </Col>
        )}
      </Row>
    </div>
  );
}
