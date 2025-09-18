import re
import json
import logging
from typing import Dict, Union, Optional
from PyPDF2 import PdfReader
import pdfplumber

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_anreu_pdf(pdf_path: str) -> Dict[str, Union[str, int, None]]:
    """
    Parse ANREU transfer receipt PDF and extract ACCU data.

    Args:
        pdf_path (str): Path to the PDF file

    Returns:
        Dict containing extracted data or error message
    """
    text = ""
    try:
        # Extract text using pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        # Fallback with PyPDF2 if no text extracted
        if not text.strip():
            reader = PdfReader(pdf_path)
            for page in reader.pages:
                text += page.extract_text() + "\n"

    except Exception as e:
        logger.error(f"Error extracting text from PDF {pdf_path}: {e}")
        return {"error": "Failed to extract text from PDF"}

    # Extract serial range
    serial_match = re.search(r"ACCU(\d+)\s*to\s*ACCU(\d+)", text, re.IGNORECASE)
    serial_start = int(serial_match.group(1)) if serial_match else None
    serial_end = int(serial_match.group(2)) if serial_match else None

    # Extract vintage
    vintage_match = re.search(r"Vintage[:\s]*(\d{4})", text, re.IGNORECASE)
    vintage = int(vintage_match.group(1)) if vintage_match else None

    # Extract project ID
    project_match = re.search(r"([A-Z]{3}-\d{4}-\d{3})", text)
    project_id = project_match.group(1) if project_match else None

    # Extract facility
    facility_match = re.search(r"Facility[:\s]*(.+?)(?:\n|$)", text, re.IGNORECASE)
    facility = facility_match.group(1).strip() if facility_match else None

    # Extract from account
    from_match = re.search(r"From Account[:\s]*(.+?)(?:\n|$)", text, re.IGNORECASE)
    from_account = from_match.group(1).strip() if from_match else None

    # Extract to account
    to_match = re.search(r"To Account[:\s]*(.+?)(?:\n|$)", text, re.IGNORECASE)
    to_account = to_match.group(1).strip() if to_match else None

    # Calculate confidence
    fields = [serial_start, serial_end, vintage, project_id, facility, from_account, to_account]
    found = sum(field is not None for field in fields)
    confidence = (found / len(fields)) * 100

    result = {
        "serial_start": serial_start,
        "serial_end": serial_end,
        "vintage": vintage,
        "project_id": project_id,
        "facility": facility,
        "from_account": from_account,
        "to_account": to_account
    }

    if confidence < 90:
        logger.warning(".2f")
        return {"error": "Low confidence — manual review required"}

    logger.info(".2f")
    # Log result for ELK integration (assuming logging is configured)
    logger.info(json.dumps(result))

    return result