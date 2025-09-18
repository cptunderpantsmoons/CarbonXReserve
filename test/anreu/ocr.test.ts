import { parseANREUReceipt } from '../../src/anreu/ocr';
import * as fs from 'fs';
import * as path from 'path';

describe('ANREU Adapter', () => {
  it('parses valid PDF and extracts serials', async () => {
    const filePath = path.join(__dirname, '../../../test-data/valid_anreu.pdf');
    const file = fs.readFileSync(filePath);
    const result = await parseANREUReceipt(file, 'valid_anreu.pdf');
    expect(result.isValid).toBe(true);
    expect(result.data?.serialRange).toBe('ACCU1000000-ACCU1000999');
  });

  it('rejects invalid vintage', async () => {
    // Create a mock PDF with invalid vintage for this test
    const filePath = path.join(__dirname, '../../../test-data/invalid_vintage.pdf');
    const file = fs.readFileSync(filePath);
    const result = await parseANREUReceipt(file, 'invalid_vintage.pdf');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Vintage out of range');
  });
});
