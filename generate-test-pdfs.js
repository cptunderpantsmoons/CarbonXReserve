const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const testDataDir = path.join(__dirname, 'test-data');

// Create test-data directory if it doesn't exist
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir);
}

// --- Create valid_anreu.pdf ---
const docValid = new PDFDocument();
const validPdfPath = path.join(testDataDir, 'valid_anreu.pdf');
docValid.pipe(fs.createWriteStream(validPdfPath));

docValid.fontSize(12).text('Australian National Registry of Emissions Units', { align: 'center' });
docValid.moveDown();
docValid.fontSize(10).text('Transfer Confirmation', { align: 'center' });
docValid.moveDown(2);
docValid.text('Serial Range: ACCU1000000-ACCU1000999');
docValid.text('Quantity: 1000');
docValid.text('Vintage: 2024');
docValid.text('Project ID: ACCU-MYPROJ-001');
docValid.text('Facility ID: FAC-NSW-0045');
docValid.text('Date: 2024-05-27');
docValid.end();

console.log(`Generated ${validPdfPath}`);


// --- Create invalid_vintage.pdf ---
const docInvalid = new PDFDocument();
const invalidPdfPath = path.join(testDataDir, 'invalid_vintage.pdf');
docInvalid.pipe(fs.createWriteStream(invalidPdfPath));

docInvalid.fontSize(12).text('Australian National Registry of Emissions Units', { align: 'center' });
docInvalid.moveDown();
docInvalid.fontSize(10).text('Transfer Confirmation', { align: 'center' });
docInvalid.moveDown(2);
docInvalid.text('Serial Range: ACCU2000000-ACCU2000999');
docInvalid.text('Quantity: 1000');
docInvalid.text('Vintage: 1999'); // Invalid vintage
docInvalid.text('Project ID: ACCU-MYPROJ-002');
docInvalid.text('Facility ID: FAC-NSW-0046');
docInvalid.text('Date: 2024-05-28');
docInvalid.end();

console.log(`Generated ${invalidPdfPath}`);
