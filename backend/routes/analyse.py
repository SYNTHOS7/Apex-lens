from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import io

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from services.file_parser import FileParser
from services.clustering import ClusteringService
from db.supabase_client import db_save_analysis_run, supabase
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/analyse", tags=["analysis"])

class TextRequest(BaseModel):
    text: str

    @field_validator('text')
    def validate_text_limit(cls, v):
        words = v.split()
        if len(words) > 5000:
            raise ValueError("Text exceeds the maximum word limit of 5000 words.")
        if len(v.strip()) == 0:
            raise ValueError("Input text cannot be empty.")
        return v

class AnalyzeRequest(BaseModel):
    text: str
    label: str
    source_type: str  # 'text', 'csv', 'pdf', 'docx'

    @field_validator('text')
    def validate_text(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Text content to analyze cannot be empty.")
        return v

@router.post("/parse-text")
def parse_text(payload: TextRequest):
    word_count = len(payload.text.split())
    return {
        "text": payload.text,
        "word_count": word_count,
        "source_type": "text"
    }

@router.post("/upload-csv-metadata")
async def upload_csv_metadata(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")
    try:
        contents = await file.read()
        columns = FileParser.get_csv_columns(contents)
        return {
            "columns": columns,
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV header: {str(e)}")

@router.post("/parse-file")
async def parse_file(
    file: UploadFile = File(...),
    column_name: Optional[str] = Form(None)
):
    filename = file.filename.lower()
    contents = await file.read()
    
    try:
        if filename.endswith('.pdf'):
            text = FileParser.parse_pdf(contents)
            word_count = len(text.split())
            if word_count > 5000:
                raise HTTPException(status_code=400, detail=f"PDF file content exceeds 5000-word limit ({word_count} words).")
            return {
                "text": text,
                "word_count": word_count,
                "source_type": "pdf"
            }
            
        elif filename.endswith('.docx') or filename.endswith('.doc'):
            text = FileParser.parse_docx(contents)
            word_count = len(text.split())
            if word_count > 5000:
                raise HTTPException(status_code=400, detail=f"DOCX file content exceeds 5000-word limit ({word_count} words).")
            return {
                "text": text,
                "word_count": word_count,
                "source_type": "docx"
            }
            
        elif filename.endswith('.csv'):
            if not column_name:
                raise HTTPException(status_code=400, detail="column_name is required for CSV parsing.")
            rows = FileParser.parse_csv(contents, column_name)
            combined_text = "\n---\n".join(rows)
            word_count = len(combined_text.split())
            if word_count > 5000:
                raise HTTPException(status_code=400, detail=f"CSV file content exceeds 5000-word limit ({word_count} words).")
            return {
                "text": combined_text,
                "rows": rows,
                "word_count": word_count,
                "source_type": "csv"
            }
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF, CSV, or DOCX/DOC file.")
            
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File parsing error: {str(e)}")

@router.post("/run-analysis")
async def run_analysis(payload: AnalyzeRequest, current_user: dict = Depends(get_current_user)):
    """
    Runs the feedback text through the AI analysis engine (optionally executing embedding-based 
    clustering if multiple lines/items are detected), then saves the run to Supabase.
    """
    try:
        # Determine items for clustering
        if "\n---\n" in payload.text:
            items = [item.strip() for item in payload.text.split("\n---\n") if item.strip()]
        elif "\n\n" in payload.text:
            items = [item.strip() for item in payload.text.split("\n\n") if item.strip()]
        else:
            items = [item.strip() for item in payload.text.split("\n") if item.strip()]

        if len(items) <= 1:
            items = [payload.text]

        # 1. Trigger the analysis (uses embeddings/KMeans for 20+ items, falls back to pure LLM if less)
        analysis_result = ClusteringService.cluster_feedback(items)

        # 2. Save the batch and analysis result to Supabase
        saved_batch = db_save_analysis_run(
            label=payload.label,
            raw_text=payload.text,
            source_type=payload.source_type,
            analysis_result=analysis_result
        )

        return {
            "status": "success",
            "batch_id": saved_batch.get("batch_id"),
            "analysis": analysis_result
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/export-pdf/{batch_id}")
def export_pdf(batch_id: str, current_user: dict = Depends(get_current_user)):
    """
    Generates a beautifully styled PDF report of the analysis results and streams it to the user.
    """
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase client is not configured.")

    try:
        # Fetch batch details along with nested analysis and themes
        batch_response = supabase.table("feedback_batches") \
            .select("*, analysis_results(*), themes(*)") \
            .eq("id", batch_id) \
            .eq("user_id", current_user["id"]) \
            .execute()

        if not batch_response.data:
            raise HTTPException(status_code=404, detail="Analysis report batch not found.")

        batch = batch_response.data[0]
        analysis_list = batch.get("analysis_results", [])
        if not analysis_list:
            raise HTTPException(status_code=404, detail="Analysis results not generated for this batch.")

        analysis = analysis_list[0]
        themes = batch.get("themes", [])

        # Setup PDF in-memory buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter,
            rightMargin=45,
            leftMargin=45,
            topMargin=45,
            bottomMargin=45
        )
        story = []

        styles = getSampleStyleSheet()

        # Premium Styles setup
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#1E1B4B'), # deep indigo
            spaceAfter=4
        )

        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#64748B'), # slate-500
            spaceAfter=15
        )

        section_title_style = ParagraphStyle(
            'ReportSection',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=17,
            textColor=colors.HexColor('#4F46E5'), # Indigo-600
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True
        )

        body_text_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor('#334155') # slate-700
        )

        bold_text_style = ParagraphStyle(
            'ReportBoldBody',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor('#1E293B') # slate-800
        )

        # PDF Document Header
        story.append(Paragraph("Apex Lens — Customer Feedback Analysis", title_style))
        story.append(Paragraph(
            f"Batch Label: {batch['label']}  |  Date: {batch['created_at'][:10]}  |  Source: {batch['source_type'].upper()}",
            subtitle_style
        ))
        story.append(Spacer(1, 8))

        # 1. Executive Summary
        story.append(Paragraph("Executive Summary", section_title_style))
        story.append(Paragraph(analysis.get("summary_text", "No summary available."), body_text_style))
        story.append(Spacer(1, 12))

        # 2. Sentiment Breakdown Table
        story.append(Paragraph("Overall Sentiment Distribution", section_title_style))
        sents = analysis.get("sentiment_json", {})
        sentiment_table_data = [
            [Paragraph("Sentiment", bold_text_style), Paragraph("Percentage Distribution", bold_text_style)],
            [Paragraph("Positive", body_text_style), Paragraph(f"{sents.get('positive', 0)}%", body_text_style)],
            [Paragraph("Neutral", body_text_style), Paragraph(f"{sents.get('neutral', 0)}%", body_text_style)],
            [Paragraph("Negative", body_text_style), Paragraph(f"{sents.get('negative', 0)}%", body_text_style)]
        ]

        t1 = Table(sentiment_table_data, colWidths=[180, 120])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t1)
        story.append(Spacer(1, 12))

        # 3. Theme Breakdown Table
        story.append(Paragraph("Key Theme Breakdown", section_title_style))
        theme_table_data = [
            [Paragraph("Theme Topic / Label", bold_text_style), Paragraph("Feedback Count", bold_text_style), Paragraph("Theme Sentiment", bold_text_style)]
        ]
        for t in themes:
            theme_table_data.append([
                Paragraph(t.get("label", "N/A"), body_text_style),
                Paragraph(str(t.get("count", 0)), body_text_style),
                Paragraph(t.get("sentiment", "neutral").upper(), body_text_style)
            ])

        if themes:
            t2 = Table(theme_table_data, colWidths=[240, 100, 110])
            t2.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ]))
            story.append(t2)
        else:
            story.append(Paragraph("No individual themes categorized.", body_text_style))
        story.append(Spacer(1, 12))

        # 4. Top Complaints & Requests (extracted from JSON payload)
        themes_json = analysis.get("themes_json", {})
        top_complaints = []
        feature_requests = []
        if isinstance(themes_json, dict):
            top_complaints = themes_json.get("top_complaints", [])
            feature_requests = themes_json.get("feature_requests", [])

        story.append(Paragraph("Top Recurring Complaints", section_title_style))
        if top_complaints:
            for idx, complaint in enumerate(top_complaints):
                story.append(Paragraph(f"• {complaint}", body_text_style))
                story.append(Spacer(1, 2))
        else:
            story.append(Paragraph("No recurring complaints found.", body_text_style))
        story.append(Spacer(1, 10))

        story.append(Paragraph("Extracted Feature Requests", section_title_style))
        if feature_requests:
            for idx, request in enumerate(feature_requests):
                story.append(Paragraph(f"• {request}", body_text_style))
                story.append(Spacer(1, 2))
        else:
            story.append(Paragraph("No feature requests found.", body_text_style))

        # Generate Document
        doc.build(story)
        buffer.seek(0)

        filename = f"Apex_Lens_Report_{batch_id[:8]}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF report generation failed: {str(e)}")
