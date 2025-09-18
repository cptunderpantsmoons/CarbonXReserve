// src/anreu/ocr.ts
import * as pdf from 'pdf-parse';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

export interface ParsedANREUReceipt {
  serialRange: string;
  quantity: number;
  vintage: number;
  projectId: string;
  facilityId: string;
  transferDate: string;
  fileName: string;
  md5Hash: string;
}

export async function parseANREUReceipt(fileBuffer: Buffer, fileName: string): Promise<{
  data: ParsedANREUReceipt | null;
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let text = '';

  if (fileName.endsWith('.pdf')) {
    const pdfData = await pdf(fileBuffer);
    text = pdfData.text;
  } else if (fileName.endsWith('.csv')) {
    const rows: any[] = [];
    const stream = Readable.from(fileBuffer);
    await new Promise((resolve, reject) => {
      stream.pipe(csv()).on('data', (row) => rows.push(row)).on('end', resolve).on('error', reject);
    });
    text = JSON.stringify(rows);
  } else {
    errors.push('Unsupported file type');
    return { data: null, isValid: false, errors };
  }

  // Extract with regex
  const serialMatch = text.match(/(ACCU\d{7})-(ACCU\d{7})/);
  if (!serialMatch) {
    errors.push('Serial range not found');
  }

  const vintageMatch = text.match(/Vintage[:\s]*(\d{4})/);
  const vintage = vintageMatch ? parseInt(vintageMatch[1]) : 0;

  // Validate
  const isValid = serialMatch !== null && vintage >= 2000 && vintage <= 2030 && errors.length === 0;

  return {
    data: isValid ? {
      serialRange: serialMatch ? `${serialMatch[1]}-${serialMatch[2]}` : '',
      quantity: serialMatch ? parseInt(serialMatch[2].slice(4)) - parseInt(serialMatch[1].slice(4)) + 1 : 0,
      vintage,
      projectId: 'ACCU-MOCK-001',
      facilityId: 'FAC-MOCK-001',
      transferDate: new Date().toISOString(),
      fileName,
      md5Hash: require('crypto').createHash('md5').update(fileBuffer).digest('hex')
    } : null,
    isValid,
    errors
  };
}
