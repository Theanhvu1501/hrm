import { BadRequestException } from '@nestjs/common';
import { FieldRulesValidationService } from './field-rules-validation.service';
import { ServiceClient } from '@app/service-client';

describe('FieldRulesValidationService', () => {
  const makeService = (accounts: unknown, success = true) => {
    const serviceClient = {
      get: jest.fn().mockResolvedValue({ success, data: accounts }),
    } as unknown as ServiceClient;
    return { service: new FieldRulesValidationService(serviceClient), serviceClient };
  };

  const accounts = [
    { ma: '112', fieldRules: { duAn: 'BAT_BUOC', doi: 'CANH_BAO', doiTuong: 'BAT_BUOC' } },
    { ma: '131', fieldRules: { duAn: 'CANH_BAO' } },
    { ma: '511' },
    { ma: '1121', fieldRules: { soTaiKhoanNganHang: 'BAT_BUOC' } },
  ];

  it('thiếu trường BAT_BUOC → BadRequestException', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '112' }, taiKhoanCo: { ma: '511' } } }] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('đủ trường BAT_BUOC → pass (CANH_BAO không chặn)', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '112' },
              taiKhoanCo: { ma: '511' },
              doiTuong: { ma: 'VCB01' },
              duAn: { ma: 'DA01' },
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).resolves.toBeUndefined();
  });

  it('rule doiTuong bên Có kiểm doiTuong2', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '511' },
              taiKhoanCo: { ma: '112' },
              duAn: { ma: 'DA01' },
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(/Đối tượng/);
  });

  it('rule soTaiKhoanNganHang: đối tượng thiếu số TK → BadRequestException', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '1121' },
              taiKhoanCo: { ma: '511' },
              doiTuong: { ma: 'VCB01' }, // có đối tượng nhưng không có soTaiKhoan
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(/Số tài khoản ngân hàng/);
  });

  it('rule soTaiKhoanNganHang: đối tượng có số TK → pass', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '1121' },
              taiKhoanCo: { ma: '511' },
              doiTuong: { ma: 'VCB01', soTaiKhoan: '0123456789' },
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).resolves.toBeUndefined();
  });

  it('rule soTaiKhoanNganHang: 1121 bên Có kiểm doiTuong2', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '511' },
              taiKhoanCo: { ma: '1121' },
              doiTuong2: { ma: 'VCB01', soTaiKhoan: '  ' }, // chỉ khoảng trắng → coi như trống
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(/Số tài khoản ngân hàng/);
  });

  it('master-data không phản hồi → bỏ qua, không chặn', async () => {
    const { service } = makeService(null, false);
    await expect(
      service.validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '112' }, taiKhoanCo: { ma: '511' } } }] as never,
      ),
    ).resolves.toBeUndefined();
  });

  it('item không có danhMuc → bỏ qua item đó', async () => {
    const { service } = makeService(accounts);
    await expect(service.validateItems([{}] as never, 'Bearer x')).resolves.toBeUndefined();
  });
});
