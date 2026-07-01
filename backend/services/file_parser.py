import io
import pandas as pd
from PyPDF2 import PdfReader
from docx import Document

class FileParser:
    @staticmethod
    def parse_pdf(file_bytes: bytes) -> str:
        """
        Extracts raw text from a PDF file.
        """
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        text_content = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_content.append(text)
        return "\n".join(text_content).strip()

    @staticmethod
    def parse_docx(file_bytes: bytes) -> str:
        """
        Extracts raw text from a DOCX file.
        """
        docx_file = io.BytesIO(file_bytes)
        doc = Document(docx_file)
        text_content = [para.text for para in doc.paragraphs if para.text]
        return "\n".join(text_content).strip()

    @staticmethod
    def parse_csv(file_bytes: bytes, column_name: str) -> list[str]:
        """
        Extracts rows from a specific column of a CSV file.
        """
        csv_file = io.BytesIO(file_bytes)
        df = pd.read_csv(csv_file)
        if column_name not in df.columns:
            raise ValueError(f"Column '{column_name}' not found. Available columns: {list(df.columns)}")
        return df[column_name].dropna().astype(str).tolist()

    @staticmethod
    def get_csv_columns(file_bytes: bytes) -> list[str]:
        """
        Reads only the headers of a CSV file.
        """
        csv_file = io.BytesIO(file_bytes)
        df = pd.read_csv(csv_file, nrows=0)
        return list(df.columns)
