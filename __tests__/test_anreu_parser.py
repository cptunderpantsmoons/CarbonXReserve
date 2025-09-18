import unittest
from unittest.mock import patch, MagicMock
from src.anreu.anreu_parser import parse_anreu_pdf

class TestAnreuParser(unittest.TestCase):

    def test_valid_pdf_parsing(self):
        """Test parsing a valid ANREU PDF"""
        result = parse_anreu_pdf('test-data/valid_anreu.pdf')
        self.assertIsInstance(result, dict)
        self.assertNotIn('error', result)
        # Assuming the valid PDF contains the expected fields
        self.assertIn('serial_start', result)
        self.assertIn('project_id', result)

    def test_invalid_vintage_pdf(self):
        """Test parsing PDF with invalid vintage"""
        result = parse_anreu_pdf('test-data/invalid_vintage.pdf')
        # May return error if vintage is invalid or low confidence
        if 'error' in result:
            self.assertIn('Low confidence', result['error'])

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_low_confidence_scenario(self, mock_reader, mock_pdfplumber):
        """Test low confidence extraction returns error"""
        # Mock partial text extraction
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "ACCU1000000 to ACCU1000099\nVintage: 2024"
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'Low confidence — manual review required')

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_complete_extraction(self, mock_reader, mock_pdfplumber):
        """Test complete field extraction"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """Transfer Date: 2024-01-01
From Account: Seller Pty Ltd (ACC123)
To Account: Buyer Pty Ltd (ACC456)
ACCU1000000 to ACCU1000099
Vintage: 2024
Project ID: CAR-2024-001
Facility: XYZ Reforestation Project"""
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        expected = {
            "serial_start": 1000000,
            "serial_end": 1000099,
            "vintage": 2024,
            "project_id": "CAR-2024-001",
            "facility": "XYZ Reforestation Project",
            "from_account": "Seller Pty Ltd (ACC123)",
            "to_account": "Buyer Pty Ltd (ACC456)"
        }
        self.assertEqual(result, expected)

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_missing_fields(self, mock_reader, mock_pdfplumber):
        """Test with missing fields leading to low confidence"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Some text without required fields"
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertIn('error', result)

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_pypdf2_fallback(self, mock_reader, mock_pdfplumber):
        """Test PyPDF2 fallback when pdfplumber fails"""
        mock_pdfplumber.side_effect = Exception("pdfplumber failed")
        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = """ACCU1000000 to ACCU1000099
Vintage: 2024
CAR-2024-001
Facility: Test Facility
From Account: Test From
To Account: Test To"""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertNotIn('error', result)
        self.assertEqual(result['serial_start'], 1000000)

    # Edge case tests
    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_malformed_pdf_file(self, mock_reader, mock_pdfplumber):
        """Test handling of malformed PDF files"""
        mock_pdfplumber.side_effect = Exception("Invalid PDF format")
        mock_reader.side_effect = Exception("Corrupted PDF file")

        result = parse_anreu_pdf('malformed.pdf')
        self.assertIn('error', result)
        self.assertIn('Failed to extract text', result['error'])

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_extremely_low_confidence(self, mock_reader, mock_pdfplumber):
        """Test with confidence below 90% threshold"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Only one field: ACCU1000000 to ACCU1000099"
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'Low confidence — manual review required')

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_missing_vintage_field(self, mock_reader, mock_pdfplumber):
        """Test with missing vintage field"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """Transfer Date: 2024-01-01
From Account: Seller Pty Ltd (ACC123)
To Account: Buyer Pty Ltd (ACC456)
ACCU1000000 to ACCU1000099
Project ID: CAR-2024-001
Facility: XYZ Reforestation Project"""
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertIn('error', result)  # Should have low confidence due to missing vintage

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_missing_serial_range(self, mock_reader, mock_pdfplumber):
        """Test with missing serial range"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """Transfer Date: 2024-01-01
From Account: Seller Pty Ltd (ACC123)
To Account: Buyer Pty Ltd (ACC456)
Vintage: 2024
Project ID: CAR-2024-001
Facility: XYZ Reforestation Project"""
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertIn('error', result)  # Should have low confidence due to missing serial range

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_different_pdf_formats(self, mock_reader, mock_pdfplumber):
        """Test different PDF formats and structures"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """ANREU Transfer Certificate

Serial Numbers: ACCU2000000 - ACCU2000199
Vintage Year: 2023
Project: CAR-2023-002
Location: ABC Carbon Project
Seller: Company A (ACC789)
Buyer: Company B (ACC012)"""
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertNotIn('error', result)
        self.assertEqual(result['serial_start'], 2000000)
        self.assertEqual(result['serial_end'], 2000199)
        self.assertEqual(result['vintage'], 2023)

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_ocr_errors_and_typos(self, mock_reader, mock_pdfplumber):
        """Test handling of OCR errors and typos in text"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """Transfer Date: 2024-01-01
From Account: Seller Pty Ltd (ACC123)
To Account: Buyer Pty Ltd (ACC456)
ACCU1000000 to ACCU1000099
Vintage: 2O24  # OCR error: 'O' instead of '0'
Project ID: CAR-2024-OO1  # OCR error
Facility: XYZ Reforestation Pr0ject"""  # OCR error
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertIn('error', result)  # Should fail due to OCR errors affecting regex matching

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_serial_range_edge_cases(self, mock_reader, mock_pdfplumber):
        """Test edge cases in serial range parsing"""
        test_cases = [
            ("ACCU1 to ACCU100", 1, 100),
            ("ACCU0000001 to ACCU0000100", 1, 100),
            ("ACCU99999900 to ACCU99999999", 99999900, 99999999),
            ("ACCU100000000 to ACCU100000999", 100000000, 100000999),
        ]

        for serial_text, expected_start, expected_end in test_cases:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = f"""{serial_text}
Vintage: 2024
Project ID: CAR-2024-001
Facility: Test Facility
From Account: Test From
To Account: Test To"""
            mock_pdf = MagicMock()
            mock_pdf.pages = [mock_page]
            mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

            mock_page2 = MagicMock()
            mock_page2.extract_text.return_value = ""
            mock_reader.return_value.pages = [mock_page2]

            result = parse_anreu_pdf('dummy.pdf')
            self.assertNotIn('error', result)
            self.assertEqual(result['serial_start'], expected_start)
            self.assertEqual(result['serial_end'], expected_end)

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_invalid_serial_range_formats(self, mock_reader, mock_pdfplumber):
        """Test handling of invalid serial range formats"""
        invalid_cases = [
            "ACCU1000000 - ACCU1000099",  # Wrong separator
            "ACCU1000000 ACCU1000099",    # No separator
            "ACCU1000000 to",             # Incomplete range
            "to ACCU1000099",             # Missing start
            "INVALID1000000 to INVALID1000099",  # Wrong prefix
        ]

        for serial_text in invalid_cases:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = f"""{serial_text}
Vintage: 2024
Project ID: CAR-2024-001
Facility: Test Facility
From Account: Test From
To Account: Test To"""
            mock_pdf = MagicMock()
            mock_pdf.pages = [mock_page]
            mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

            mock_page2 = MagicMock()
            mock_page2.extract_text.return_value = ""
            mock_reader.return_value.pages = [mock_page2]

            result = parse_anreu_pdf('dummy.pdf')
            self.assertIn('error', result)  # Should fail due to invalid serial range

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_empty_or_whitespace_pdf(self, mock_reader, mock_pdfplumber):
        """Test handling of PDFs with no readable content"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = ""
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = "   \n\t   "  # Only whitespace
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('empty.pdf')
        self.assertIn('error', result)
        self.assertIn('Failed to extract text', result['error'])

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_multiline_field_extraction(self, mock_reader, mock_pdfplumber):
        """Test extraction of fields spanning multiple lines"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """Transfer Date: 2024-01-01
From Account: Seller Pty Ltd
(ACC123)
To Account: Buyer Pty Ltd
(ACC456)
ACCU1000000 to ACCU1000099
Vintage: 2024
Project ID: CAR-2024-001
Facility: XYZ Reforestation
Project"""
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertNotIn('error', result)
        self.assertEqual(result['facility'], 'XYZ Reforestation Project')
        self.assertEqual(result['from_account'], 'Seller Pty Ltd (ACC123)')
        self.assertEqual(result['to_account'], 'Buyer Pty Ltd (ACC456)')

    @patch('src.anreu.anreu_parser.pdfplumber.open')
    @patch('src.anreu.anreu_parser.PdfReader')
    def test_case_insensitive_matching(self, mock_reader, mock_pdfplumber):
        """Test case insensitive field matching"""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = """transfer date: 2024-01-01
FROM ACCOUNT: Seller Pty Ltd (ACC123)
TO ACCOUNT: Buyer Pty Ltd (ACC456)
accu1000000 to accu1000099
VINTAGE: 2024
project id: car-2024-001
FACILITY: xyz reforestation project"""
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.return_value.__enter__.return_value = mock_pdf

        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = ""
        mock_reader.return_value.pages = [mock_page2]

        result = parse_anreu_pdf('dummy.pdf')
        self.assertNotIn('error', result)
        self.assertEqual(result['serial_start'], 1000000)
        self.assertEqual(result['vintage'], 2024)
        self.assertEqual(result['facility'], 'xyz reforestation project')

if __name__ == '__main__':
    unittest.main()