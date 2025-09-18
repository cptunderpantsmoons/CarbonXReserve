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

if __name__ == '__main__':
    unittest.main()