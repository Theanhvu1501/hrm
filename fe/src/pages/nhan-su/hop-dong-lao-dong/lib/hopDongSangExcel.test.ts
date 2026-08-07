// @vitest-environment jsdom
// Cần DOM thật: hàm dùng DOMParser để đọc HTML đã render thay vì bóc thẻ
// bằng regex — cùng lý do BE bỏ regex sang sanitize-html.
import { describe, it, expect } from 'vitest';
import { hopDongSangLuoi } from './hopDongSangExcel';

describe('hopDongSangLuoi', () => {
  it('mỗi đoạn văn thành một dòng ở cột A', () => {
    const luoi = hopDongSangLuoi(
      '<p>HỢP ĐỒNG LAO ĐỘNG</p><p>Hôm nay, ngày 05/08/2026</p>',
    );

    expect(luoi).toEqual([['HỢP ĐỒNG LAO ĐỘNG'], ['Hôm nay, ngày 05/08/2026']]);
  });

  it('bảng trong mẫu giữ nguyên thành lưới ô', () => {
    // Đây là lý do tồn tại của cả hàm này: mẫu nào cần Excel thật sự thì
    // soạn bằng <table>, và mỗi <td> phải rơi vào đúng một ô riêng chứ không
    // bị nối thành một chuỗi dài.
    const luoi = hopDongSangLuoi(
      '<table><tr><th>Khoản</th><th>Số tiền</th></tr>' +
        '<tr><td>Lương</td><td>15.000.000</td></tr></table>',
    );

    expect(luoi).toEqual([
      ['Khoản', 'Số tiền'],
      ['Lương', '15.000.000'],
    ]);
  });

  it('trộn văn xuôi và bảng thì giữ đúng thứ tự xuất hiện', () => {
    const luoi = hopDongSangLuoi(
      '<p>Điều 3. Lương</p><table><tr><td>Cơ bản</td><td>10</td></tr></table><p>Điều 4.</p>',
    );

    expect(luoi).toEqual([['Điều 3. Lương'], ['Cơ bản', '10'], ['Điều 4.']]);
  });

  it('bỏ dòng trống — thẻ rỗng trong mẫu không đẻ ra dòng trắng giữa văn bản', () => {
    const luoi = hopDongSangLuoi('<p>A</p><p></p><p>   </p><div></div><p>B</p>');

    expect(luoi).toEqual([['A'], ['B']]);
  });

  it('giải mã thực thể HTML — người đọc file Excel không phải nhìn &amp;', () => {
    const luoi = hopDongSangLuoi('<p>B&#x1EA3;o hi&#7875;m &amp; ph&uacute;c l&#7907;i</p>');

    expect(luoi).toEqual([['Bảo hiểm & phúc lợi']]);
  });

  it('gộp khoảng trắng thừa và xuống dòng trong nguồn HTML', () => {
    const luoi = hopDongSangLuoi('<p>Bên   A\n   và bên B</p>');

    expect(luoi).toEqual([['Bên A và bên B']]);
  });

  it('HTML rỗng → lưới rỗng, không ném', () => {
    expect(hopDongSangLuoi('')).toEqual([]);
    expect(hopDongSangLuoi('   ')).toEqual([]);
  });

  it('bỏ hẳn nội dung <script>/<style> lọt vào (không đổ mã nguồn vào ô Excel)', () => {
    const luoi = hopDongSangLuoi(
      '<style>p{color:red}</style><p>Nội dung</p><script>alert(1)</script>',
    );

    expect(luoi).toEqual([['Nội dung']]);
  });
});
