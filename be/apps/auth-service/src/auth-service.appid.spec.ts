import { readFileSync } from 'fs';
import { join } from 'path';

describe('auth-service appId', () => {
  it('uses nhan-su appId, not ke-toan', () => {
    const src = readFileSync(join(__dirname, 'auth-service.service.ts'), 'utf8');
    expect(src).toContain("'nhan-su'");
    expect(src).not.toContain("'ke-toan'");
  });
});
