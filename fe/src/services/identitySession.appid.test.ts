import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

describe('FE appId', () => {
  it('uses nhan-su, not ke-toan', () => {
    const src = readFileSync(join(__dirname, 'identitySession.ts'), 'utf8');
    expect(src).toContain("APP_ID = 'nhan-su'");
    expect(src).not.toContain("APP_ID = 'ke-toan'");
  });
});
