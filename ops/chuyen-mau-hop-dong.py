#!/usr/bin/env python3
"""Chuyển các file mẫu hợp đồng trong docs/Mau_hop_dong sang mẫu in có token.

Vì sao có script này thay vì gõ tay HTML: sáu văn bản này là hợp đồng NGƯỜI TA
KÝ THẬT — câu chữ không được sửa. Gõ lại bằng tay là chắc chắn có chỗ sai chính
tả hoặc rơi một khoản; chạy lại script thì mỗi lần bên pháp chế sửa file .docx
ta chỉ việc sinh lại.

Việc của script:
  1. Đọc .docx (zip + word/document.xml) hoặc .doc (qua `textutil` của macOS).
  2. Thay các chỗ trống "……" / "......" / MERGEFIELD bằng token {{...}} theo
     bảng QUY_TAC — khớp theo NHÃN đứng trước chỗ trống, không khớp theo thứ
     tự xuất hiện (thứ tự đổi khi văn bản được sửa).
  3. Sinh HTML dùng đúng bộ class `.hd` mà `renderHopDongHtml` đã có CSS in.
  4. Ghi ra be/apps/config-service/src/hop-dong/lib/mauInMacDinh.ts

Chạy:
    python3 ops/chuyen-mau-hop-dong.py
"""

from __future__ import annotations

import html as html_mod
import json
import os
import re
import subprocess
import sys
import zipfile

GOC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THU_MUC_MAU = os.path.join(GOC, "docs", "Mau_hop_dong")
DAU_RA = os.path.join(
    GOC, "be", "apps", "config-service", "src", "hop-dong", "lib", "mauInMacDinh.ts"
)

# Chuỗi chỗ trống trong văn bản gốc: dấu chấm lửng dài, dấu chấm lặp, gạch dưới,
# hoặc mergefield «...» của Word.
CHO_TRONG = r"(?:…[…\. ]*|\.{3,}|_{3,}|«[^»]*»|\[_+\])"

# Chỗ trống dạng NGÀY: "…./…./……." — ba cụm chấm ngăn bởi dấu gạch chéo.
NGAY_TRONG = r"[…\.]{1,}\s*/\s*[…\.]{1,}\s*/\s*[…\.]{1,}"

# Mergefield của Word (file .doc cũ) — tên trường nói thẳng nó là dữ liệu gì.
MERGEFIELD = {
    "TÊN_CTY": "{{tenCongTy}}",
    "Người_đại_diện": "{{nguoiDaiDien}}",
    "Chức_vụ": "{{chucVuNguoiDaiDien}}",
    "HỌ_VÀ_TÊN": "{{hoTenNLD}}",
    "NGÀY_THÁNG_NĂM_SINH": "{{ngaySinh}}",
    "HỘ_KHẨU_THƯỜNG_TRÚ": "{{diaChiNLD}}",
    "SỐ_CMND": "{{soCCCD}}",
    "NGÀY_CẤP": "{{ngayCapCccd}}",
    "NƠI_CẤP": "{{noiCapCccd}}",
    "ĐẾN_NGÀY": "{{ngayKetThuc}}",
    "TỔNG": "{{mucLuongSo}}",
}

# Thông tin công ty ĐANG NẰM CỨNG trong văn bản gốc. Không thay là mọi tenant
# in ra hợp đồng mang tên MASTER CEO.
LITERAL_CONG_TY: list[tuple[str, str]] = [
    (r"CÔNG TY CỔ PHẦN GIẢI PHÁP VẬN HÀNH VÀ CÔNG NGHỆ MASTER CEO", "{{tenCongTy}}"),
    (r"Công ty cổ phần giải pháp vận hành và công nghệ MASTER CEO", "{{tenCongTy}}"),
    (r"CÔNG TY CỔ PHẦN MASTER CEO", "{{tenCongTy}}"),
    (r"Công ty (?:Cổ phần )?MASTER CEO", "{{tenCongTy}}"),
    (r"MASTER CEO", "{{tenCongTy}}"),
    (r"Số nhà A12TT17 khu đô thị Văn Quán, Phường Hà Đông,? (?:Thành [Pp]hố|TP) Hà Nội\.?(?:, Việt Nam)?", "{{diaChiCongTy}}"),
    (r"0110595215", "{{maSoThueCongTy}}"),
    (r"Bà NGUYỄN THỊ MAI PHƯƠNG", "{{nguoiDaiDien}}"),
]

# Quy tắc chung: (regex khớp NHÃN + chỗ trống, chuỗi thay thế).
QUY_TAC: list[tuple[str, str]] = [
    (r"\(Số:\s*" + CHO_TRONG + r"[^)]*\)", "(Số: {{soHopDong}}{{maHopDongMau}})"),
    (r"Số:\s*" + CHO_TRONG + r"\s*/\s*\d{2,4}[…\.]*\s*/\s*\S+", "Số: {{soHopDong}}{{maHopDongMau}}"),
    # "ngày … tháng … năm …" — chỗ trống BẮT BUỘC ở cả ba chỗ. Để tuỳ chọn là
    # "năm 2026" bị nuốt mất "20" và in ra "năm 26".
    (
        r"ngày\s*" + CHO_TRONG + r"\s*tháng\s*" + CHO_TRONG
        + r"\s*năm\s*(?:20\d{2}|(?:20)?\s*" + CHO_TRONG + r")",
        "ngày {{ngayLapNgay}} tháng {{ngayLapThang}} năm {{ngayLapNam}}",
    ),
    (r"^(?:TP\.? ?)?Hà Nội,\s*ngày", "{{thanhPhoKy}}, ngày"),
    # Người lao động
    (r"(NGƯỜI LAO ĐỘNG|HỌ VÀ TÊN|Họ và tên)\s*:\s*" + CHO_TRONG, r"\1: {{hoTenNLD}}"),
    (r"(Sinh ngày|Ngày sinh)\s*:?\s*(?:" + NGAY_TRONG + r"|" + CHO_TRONG + r")", r"\1: {{ngaySinh}}"),
    (r"Giới tính\s*:?\s*" + CHO_TRONG, "Giới tính: {{gioiTinh}}"),
    (r"(Số CMND\s*/?\s*CCCD|Số CCCD|Số CMND)\s*:?\s*" + CHO_TRONG, r"\1: {{soCCCD}}"),
    (r"(Ngày cấp|Cấp ngày)\s*:?\s*(?:" + NGAY_TRONG + r"|" + CHO_TRONG + r")", r"\1: {{ngayCapCccd}}"),
    (r"(Nơi cấp|Tại)\s*:\s*" + CHO_TRONG, r"\1: {{noiCapCccd}}"),
    # Công việc, thời hạn, lương
    (r"(Chức vụ tuyển dụng|Chức danh chuyên môn|Chức danh|Vị trí)\s*:?\s*" + CHO_TRONG, r"\1: {{chucDanh}}"),
    # File mẫu điền sẵn chức danh của NV cũ ("chức vụ: Giám đốc vận hành") —
    # thay cả giá trị, không chỉ chỗ trống.
    (r"(Chức danh chuyên môn\s*/?\s*chức vụ)\s*:\s*[^<]+", r"\1: {{chucDanh}}"),
    (r"[Tt]ừ ngày\s*" + CHO_TRONG + r"\s*đến (?:hết )?ngày\s*" + CHO_TRONG, "từ ngày {{ngayBatDau}} đến ngày {{ngayKetThuc}}"),
    (r"đến hết ngày\s*" + CHO_TRONG, "đến hết ngày {{ngayKetThuc}}"),
    (r"kể từ ngày\s*" + CHO_TRONG, "kể từ ngày {{ngayBatDau}}"),
    (
        r"(Lương thời gian|Mức lương|Lương cơ bản|Phí dịch vụ|Mức phí dịch vụ)\s*(?:là)?\s*:?\s*" + CHO_TRONG,
        r"\1: {{mucLuongSo}}",
    ),
    (r"(Lương hiệu suất|Phụ cấp)\s*(?:là)?\s*:?\s*" + CHO_TRONG, r"\1: {{phuCapSo}}"),
]

# Nhãn có nghĩa KHÁC NHAU tuỳ đang ở khối bên nào — địa chỉ của công ty và địa
# chỉ của người lao động là hai thứ, mà văn bản viết cùng một chữ "Địa chỉ".
QUY_TAC_THEO_KHOI: dict[str, list[tuple[str, str]]] = {
    "cty": [
        (r"(Địa chỉ(?: trụ sở)?)\s*:?\s*" + CHO_TRONG, r"\1: {{diaChiCongTy}}"),
        (r"(Mã số thuế|MST)\s*:?\s*" + CHO_TRONG, r"\1: {{maSoThueCongTy}}"),
        (r"(Đại diện|Người đại diện)\s*:?\s*" + CHO_TRONG, r"\1: {{nguoiDaiDien}}"),
        (r"Chức vụ\s*:\s*" + CHO_TRONG, "Chức vụ: {{chucVuNguoiDaiDien}}"),
        # File mẫu điền sẵn chức vụ người đại diện — thay luôn, không chỉ chỗ trống.
        (r"Chức vụ\s*:\s*Giám đốc", "Chức vụ: {{chucVuNguoiDaiDien}}"),
    ],
    # Khối NLĐ dùng NHAN_NLD (thay cả giá trị đã điền sẵn) — xem `thay_theo_nhan`.
    "nld": [],
    "khac": [],
}

# Nhãn trong khối NGƯỜI LAO ĐỘNG. Ở đây phải thay CẢ GIÁ TRỊ ĐÃ ĐIỀN, không
# chỉ chỗ trống: file mẫu bên pháp chế gửi sang là bản đã ký của một người
# thật (BM-07 còn nguyên họ tên, ngày sinh, số điện thoại, email của NV cũ).
# Giữ nguyên là mọi hợp đồng in ra đều mang thông tin người đó.
NHAN_NLD: list[tuple[str, str]] = [
    (r"NGƯỜI LAO ĐỘNG|Bên cung cấp dịch vụ \(Bên B\)|Họ và tên|HỌ VÀ TÊN", "{{hoTenNLD}}"),
    (r"Sinh ngày|Ngày sinh|NGÀY SINH", "{{ngaySinh}}"),
    (r"Giới tính", "{{gioiTinh}}"),
    (r"Số CMND\s*/?\s*CCCD|Số CCCD|Số CMND|Số CCCD/CMND", "{{soCCCD}}"),
    (r"Ngày cấp|Cấp ngày", "{{ngayCapCccd}}"),
    (r"Nơi cấp|Tại", "{{noiCapCccd}}"),
    (r"Địa chỉ thường trú|Hộ khẩu thường trú|Nơi ở hiện tại|Địa chỉ", "{{diaChiNLD}}"),
    (r"Số điện thoại(?: liên hệ)?|Điện thoại|SĐT", "{{soDienThoaiNLD}}"),
    (r"Email|E-mail", "{{emailNLD}}"),
    (r"Mã số thuế cá nhân|Mã số thuế|MST", "{{mstNLD}}"),
    (r"Chức vụ|Chức danh|Vị trí", "{{chucDanh}}"),
    # Không có token tương ứng trong hệ thống, nhưng cũng KHÔNG được để
    # nguyên: file mẫu còn số tài khoản thật của nhân viên cũ. Thay bằng chỗ
    # trống để người ký điền tay.
    (r"Số tài khoản|Tài khoản ngân hàng|STK", "…………………………"),
    (r"Quốc tịch", None),  # giữ nguyên "Việt Nam"
]


def thay_theo_nhan(dong: str) -> str:
    """Thay giá trị sau từng nhãn trong một dòng thông tin cá nhân.

    Một dòng có thể chứa NHIỀU nhãn ("Số CCCD: … Ngày cấp: … Nơi cấp: …"), nên
    phải cắt theo vị trí nhãn kế tiếp chứ không thể regex từng nhãn độc lập —
    làm vậy thì giá trị của nhãn này nuốt luôn nhãn sau.
    """
    moi_nhan = "|".join(m for m, _ in NHAN_NLD)
    vi_tri = [
        (m.start(), m.end(), m.group(0))
        for m in re.finditer(rf"(?:^|\s)({moi_nhan})\s*:", dong)
    ]
    if not vi_tri:
        return dong

    ra = dong[: vi_tri[0][0]]
    for i, (bat_dau, ket_thuc, nhan) in enumerate(vi_tri):
        ten_nhan = nhan.strip().rstrip(":").strip()
        token = None
        for mau, tk in NHAN_NLD:
            if re.fullmatch(mau, ten_nhan):
                token = tk
                break
        het = vi_tri[i + 1][0] if i + 1 < len(vi_tri) else len(dong)
        if token is None:
            ra += dong[bat_dau:het]
        else:
            ra += f"{dong[bat_dau:ket_thuc]} {token}"
    return ra.strip()


# Dòng mở đầu một khối bên ký. Bên nào là CÔNG TY MÌNH thì quyết theo nội dung:
# hợp đồng dịch vụ B2B có Bên A là đối tác, Bên B mới là công ty đang dùng phần mềm.
MO_KHOI_CTY = r"^(NGƯỜI SỬ DỤNG LAO ĐỘNG|Bên thuê dịch vụ|BÊN THUÊ|CÔNG TY\b|\{\{tenCongTy\}\})"
MO_KHOI_NLD = r"^(NGƯỜI LAO ĐỘNG|Bên cung cấp dịch vụ|THỰC TẬP SINH|NHÂN VIÊN|Họ và tên|HỌ VÀ TÊN)"
MO_KHOI_BEN = r"^(BÊN [AB])\s*:"


def khoi_cua_dong(dong: str, hien_tai: str) -> str:
    """Trả về khối mới nếu dòng này mở một khối bên ký, không thì giữ nguyên."""
    if re.match(MO_KHOI_CTY, dong):
        return "cty"
    if re.match(MO_KHOI_NLD, dong):
        # "Bên cung cấp dịch vụ" trong HĐ thuê cộng tác viên là CÁ NHÂN.
        return "nld"
    if re.match(MO_KHOI_BEN, dong):
        # Bên nào mang tên công ty mình thì là khối công ty; bên còn lại là đối
        # tác, KHÔNG gắn token (in ra tên công ty mình ở cả hai bên là hỏng hẳn).
        return "cty" if "MASTER CEO" in dong or "{{tenCongTy}}" in dong else "khac"
    return hien_tai


FILE_MAU: list[tuple[str, str]] = [
    ("MC.NS.BM-06 Hợp đồng thử việc.docx", "Hợp đồng thử việc"),
    ("MC.NS.BM-07 Hợp đồng lao động.docx", "Hợp đồng lao động"),
    ("MC.NS.BM-08 Hợp đồng thực tập.docx", "Hợp đồng thực tập sinh"),
    ("MC.NS.BM-05. Bảo mật thông tin.docx", "Cam kết bảo mật thông tin"),
    (
        "MC.NS.BM-09 HĐ dịch vụ thuê chuyên gia, cộng tác viên, bếp, vệ sinh.doc",
        "Hợp đồng dịch vụ (cộng tác viên, bếp, vệ sinh)",
    ),
    (
        "5. Hợp đồng dịch vụ quản lý và phát triển hệ thống vận hành.docx",
        "Hợp đồng dịch vụ quản lý & phát triển hệ thống",
    ),
]


def doan_tu_docx(duong_dan: str) -> list[str]:
    """Trả về danh sách đoạn văn (đã bỏ thẻ XML, giữ thứ tự)."""
    with zipfile.ZipFile(duong_dan) as z:
        xml = z.read("word/document.xml").decode("utf8")
    xml = re.sub(r"<w:tab[^>]*/>", "\t", xml)
    xml = re.sub(r"<w:br[^>]*/>", "\n", xml)
    xml = re.sub(r"</w:p>", "\n\x00PARA\x00", xml)
    text = re.sub(r"<[^>]+>", "", xml)
    text = html_mod.unescape(text)
    doan = [d.strip() for d in text.split("\x00PARA\x00")]
    return [lam_sach(d) for d in doan if lam_sach(d)]


def doan_tu_doc(duong_dan: str) -> list[str]:
    ra = subprocess.run(
        ["textutil", "-convert", "txt", "-stdout", duong_dan],
        capture_output=True,
        check=True,
    )
    text = ra.stdout.decode("utf8")
    # textutil in mergefield thành: MERGEFIELD "TÊN" «TÊN» — bỏ phần MERGEFIELD,
    # giữ «TÊN» để QUY_TAC nhận ra là chỗ trống.
    text = re.sub(r'MERGEFIELD\s+"[^"]*"\s*', "", text)
    return [lam_sach(d) for d in text.split("\n") if lam_sach(d)]


def lam_sach(s: str) -> str:
    # Word nhúng số toạ độ của khung ảnh vào text (vd "22828252140782282825214078")
    # — chuỗi số dài vô nghĩa, bỏ đi.
    s = re.sub(r"\d{12,}", "", s)
    # Word nhúng toạ độ khung ảnh DÍNH LIỀN chữ ("814070-508000HỢP ĐỒNG…").
    s = re.sub(r"^-?\d{4,}(?:-\d{4,})*(?=[A-ZĐÀ-Ỹ])", "", s)
    s = s.replace("\t", " ")
    s = re.sub(r"[  ]{2,}", " ", s)
    s = re.sub(r"^=+$", "", s)
    return s.strip()


def gan_token(s: str, khoi: str) -> str:
    for ten, token in MERGEFIELD.items():
        s = s.replace(f"«{ten}»", token)
    for mau, thay in LITERAL_CONG_TY:
        s = re.sub(mau, thay, s)
    if khoi == "nld":
        s = thay_theo_nhan(s)
    for mau, thay in QUY_TAC_THEO_KHOI.get(khoi, []):
        s = re.sub(mau, thay, s)
    for mau, thay in QUY_TAC:
        s = re.sub(mau, thay, s)
    # Gắn xong có thể sinh "{{tenCongTy}} {{tenCongTy}}" khi văn bản gốc lặp
    # tên công ty hai lần liền nhau — gộp lại.
    s = re.sub(r"(\{\{tenCongTy\}\})(\s*\1)+", r"\1", s)
    return s


def la_tieu_de_dieu(s: str) -> bool:
    return bool(re.match(r"^(Điều|ĐIỀU)\s+\d+", s))


def la_ten_hop_dong(s: str) -> bool:
    return bool(re.match(r"^(HỢP ĐỒNG|CAM KẾT|BẢN CAM KẾT)", s)) and len(s) < 120


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    )


RAC = [
    r"^-?\d{5,}$",                    # số toạ độ khung ảnh Word rơi vào text
    r"^PAGE\s*\\\*\s*MERGEFORMAT",     # mã trường đánh số trang
    r"^=+$",
    r"^(CỘNG H[OÒ][AÀ] XÃ HỘI|Độc lập)",   # đã dựng ở khối quốc hiệu bên trên
    r"^(CÔNG TY CỔ PHẦN( MASTER CEO)?|MASTER CEO)\s*$",
]

# Dòng mở đầu khối chữ ký ở CUỐI văn bản.
MO_CHU_KY = r"^(NGƯỜI SỬ DỤNG LAO ĐỘNG|ĐẠI DIỆN BÊN A|BÊN A|ĐẠI DIỆN|Người cam kết|CÔNG TY)\s*$"
TEN_BEN_KY = r"^(NGƯỜI SỬ DỤNG LAO ĐỘNG|NGƯỜI LAO ĐỘNG|ĐẠI DIỆN BÊN [AB]|BÊN [AB]|Người cam kết|THỰC TẬP SINH|NHÂN VIÊN|CÔNG TY)\s*$"


def la_rac(s: str) -> bool:
    return any(re.search(m, s) for m in RAC)


def tach_khoi_ky(doan: list[str]) -> tuple[list[str], list[str]]:
    """Tách phần thân và khối chữ ký ở cuối.

    Văn bản gốc ĐÃ có sẵn dòng ký ("NGƯỜI SỬ DỤNG LAO ĐỘNG", "(Ký, ghi rõ họ
    tên)"). Cứ nối thêm một khối ký mặc định là bản in có hai khối ký chồng lên
    nhau — phải nhận ra khối sẵn có và dựng lại nó thành hai cột.
    """
    for i in range(len(doan) - 1, max(-1, len(doan) - 12), -1):
        if re.match(MO_CHU_KY, doan[i]):
            # Chỉ coi là khối ký nếu phía sau có dòng "(Ký…)" — không thì đây
            # là một mục nội dung trùng tên.
            if any(re.search(r"^\(Ký", d) for d in doan[i:]):
                return doan[:i], doan[i:]
    return doan, []


def dung_khoi_ky(duoi: list[str]) -> str:
    """Dựng hai cột chữ ký từ các dòng cuối của văn bản gốc."""
    if not duoi:
        return (
            '<div class="signs">'
            '<div><p class="bold">NGƯỜI SỬ DỤNG LAO ĐỘNG</p>'
            '<p class="note">(Ký, ghi rõ họ tên, đóng dấu)</p></div>'
            '<div><p class="bold">NGƯỜI LAO ĐỘNG</p>'
            '<p class="note">(Ký, ghi rõ họ tên)</p></div>'
            "</div>"
        )

    cot: list[list[str]] = []
    for d in duoi:
        if re.match(TEN_BEN_KY, d) or not cot:
            cot.append([])
        cot[-1].append(d)

    phan = []
    for c in cot:
        ben = []
        for i, d in enumerate(c):
            lop = "bold" if i == 0 else "note"
            ben.append(f'<p class="{lop}">{esc(d)}</p>')
        phan.append("<div>" + "".join(ben) + "</div>")
    return '<div class="signs">' + "".join(phan) + "</div>"


def dung_html(doan: list[str], ten_mau: str) -> str:
    """Ghép các đoạn thành HTML dùng class `.hd` (CSS in đã có sẵn ở BE)."""
    than, duoi = tach_khoi_ky(doan)

    ra: list[str] = ['<div class="hd">']
    ra.append('<div class="top">')
    ra.append('  <div class="cty">{{tenCongTy}}</div>')
    ra.append('  <div class="quochieu">')
    ra.append('    <div class="ten">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>')
    ra.append('    <div class="tieungu">Độc lập – Tự do – Hạnh phúc</div>')
    ra.append("  </div>")
    ra.append("</div>")
    ra.append(
        '<div class="ngaylap">{{thanhPhoKy}}, ngày {{ngayLapNgay}} tháng '
        "{{ngayLapThang}} năm {{ngayLapNam}}</div>"
    )

    da_co_ten = False
    khoi = "khac"
    for d in than:
        # Cập nhật khối TRƯỚC khi bỏ dòng rác: dòng tên công ty ở đầu khối bên
        # ký vừa là dòng bị bỏ (đã in ở khối quốc hiệu) vừa là dòng MỞ khối —
        # bỏ trước thì các dòng "Đại diện/Chức vụ" phía sau mất ngữ cảnh.
        khoi = khoi_cua_dong(gan_token(d, "khac"), khoi)
        if la_rac(d):
            continue
        # Dòng "ngày … tháng … năm …" đứng ĐẦU văn bản đã có ở khối .ngaylap.
        if not da_co_ten and re.match(r"^(?:(?:TP\.? ?)?Hà Nội,?\s*)?ngày .{0,25} tháng", d):
            continue

        khoi = khoi_cua_dong(d, khoi)
        d = gan_token(d, khoi)
        # Gắn token xong mới quyết lại khối được: dòng "BÊN B: CÔNG TY … MASTER
        # CEO" lúc này đã thành "{{tenCongTy}}".
        khoi = khoi_cua_dong(d, khoi)

        if la_ten_hop_dong(d) and not da_co_ten:
            ra.append(f"<h1>{esc(d)}</h1>")
            da_co_ten = True
            continue
        if re.match(r"^\(?Số:", d):
            ra.append(f'<div class="so">{esc(d)}</div>')
            continue
        if la_tieu_de_dieu(d):
            ra.append(f"<h2>{esc(d)}</h2>")
            continue
        if re.match(
            r"^(NGƯỜI SỬ DỤNG LAO ĐỘNG|NGƯỜI LAO ĐỘNG|BÊN [AB]|Bên thuê dịch vụ|Bên cung cấp dịch vụ)",
            d,
        ):
            ra.append(f'<p class="bold">{esc(d)}</p>')
            continue
        ra.append(f"<p>{esc(d)}</p>")

    ra.append(dung_khoi_ky([gan_token(d, "khac") for d in duoi if not la_rac(d)]))
    ra.append("</div>")
    return "\n".join(ra)


def main() -> None:
    mau: list[dict[str, str]] = []
    for ten_file, ten_mau in FILE_MAU:
        dd = os.path.join(THU_MUC_MAU, ten_file)
        if not os.path.exists(dd):
            print(f"  BỎ QUA (không có file): {ten_file}", file=sys.stderr)
            continue
        doan = doan_tu_docx(dd) if ten_file.endswith(".docx") else doan_tu_doc(dd)
        html = dung_html(doan, ten_mau)
        con_trong = len(re.findall(CHO_TRONG, html))
        print(f"  {ten_mau}: {len(doan)} đoạn, {len(html)} ký tự, {con_trong} chỗ điền tay")
        mau.append({"ten": ten_mau, "html": html})

    with open(DAU_RA, "w", encoding="utf8") as f:
        f.write(
            "/* eslint-disable */\n"
            "// TỆP SINH TỰ ĐỘNG — đừng sửa tay.\n"
            "// Nguồn: docs/Mau_hop_dong/*.doc(x); sinh lại bằng:\n"
            "//     python3 ops/chuyen-mau-hop-dong.py\n"
            "//\n"
            "// Đây là văn bản hợp đồng người ta KÝ THẬT: câu chữ giữ nguyên bản gốc,\n"
            "// chỉ các chỗ trống \"……\" được thay bằng token {{...}}. Chỗ trống nào\n"
            "// KHÔNG suy được từ dữ liệu (nội dung công việc, địa điểm, số giờ/buổi)\n"
            "// thì cố ý giữ nguyên dấu chấm lửng để người ký điền tay.\n"
            "\n"
            "export interface MauInMacDinh {\n"
            "  ten: string;\n"
            "  html: string;\n"
            "}\n\n"
            "export const MAU_IN_MAC_DINH: MauInMacDinh[] = "
        )
        f.write(json.dumps(mau, ensure_ascii=False, indent=2))
        f.write(";\n")
    print(f"→ {DAU_RA}")


if __name__ == "__main__":
    main()
