#!/usr/bin/env python3
"""
AquaIntel Technical Verification Report v2 Generator
Generates: reports/AquaIntel_Technical_Verification_Report_v2.pdf
Incorporates strict second-pass audit language, detailed financial recalculations,
AI/ML synthetic metrics, and hardware simulation distinctions.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# Palette
PRIMARY = colors.HexColor("#0f5132")      # Forest Green
SECONDARY = colors.HexColor("#0d9488")    # Aquatic Teal
DARK_TEXT = colors.HexColor("#1e293b")    # Slate 800
LIGHT_BG = colors.HexColor("#f8fafc")     # Slate 50
ACCENT_BG = colors.HexColor("#ecfdf5")    # Emerald 50
BORDER_COLOR = colors.HexColor("#cbd5e1") # Slate 300
MUTED_TEXT = colors.HexColor("#64748b")   # Slate 500
DANGER_COLOR = colors.HexColor("#be123c") # Rose 700
WARNING_COLOR = colors.HexColor("#b45309")# Amber 700

class NumberedCanvasV2(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip cover

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(MUTED_TEXT)

        # Running Header
        self.drawString(45, 11 * inch - 36, "AQUAINTEL — SOFTWARE AUDIT & TECHNICAL VERIFICATION REPORT (v2)")
        self.drawRightString(8.5 * inch - 45, 11 * inch - 36, "SOFTWARE DEMO READY • FIELD PILOT REQUIRED")
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(45, 11 * inch - 42, 8.5 * inch - 45, 11 * inch - 42)

        # Running Footer
        self.line(45, 45, 8.5 * inch - 45, 45)
        self.drawString(45, 32, "AquaIntel Smart Prawn Farm Automation • Machine Evidence: reports/audit_evidence/")
        self.drawRightString(8.5 * inch - 45, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def build_pdf_report_v2(output_filename):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=PRIMARY,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceAfter=15
    )

    doc_type_style = ParagraphStyle(
        'CoverDocType',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=19,
        textColor=DARK_TEXT,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=DARK_TEXT,
        spaceAfter=6
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.5,
        textColor=DARK_TEXT
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=DARK_TEXT
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=DARK_TEXT
    )

    story = []

    # -------------------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 35))
    story.append(Paragraph("AQUAINTEL", title_style))
    story.append(Paragraph("AI-Powered Autonomous Prawn Farming and Disease Risk Management System", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2.5, color=SECONDARY, spaceBefore=4, spaceAfter=14))
    story.append(Paragraph("SOFTWARE IMPLEMENTATION AUDIT & TECHNICAL VERIFICATION REPORT (v2)", doc_type_style))

    summary_box_data = [
        [
            Paragraph("<b>Audit Scope:</b>", table_cell_bold),
            Paragraph("Rigorous second-pass implementation audit across Frontend, Backend, Database, AI/ML, IoT, and Financial Models.", table_cell_style)
        ],
        [
            Paragraph("<b>Repository Location:</b>", table_cell_bold),
            Paragraph("/Users/jeeshan/Documents/projects/aquaintel (Strictly isolated from peer directories)", table_cell_style)
        ],
        [
            Paragraph("<b>Git Branch & Head:</b>", table_cell_bold),
            Paragraph("main / commit 05a6f63 (Working tree verified clean)", table_cell_style)
        ],
        [
            Paragraph("<b>Audit Date & Platform:</b>", table_cell_bold),
            Paragraph("October 31, 2026 • macOS Darwin (arm64), Python 3.15.1, Node.js v24.22.1, SQLite 3", table_cell_style)
        ],
        [
            Paragraph("<b>Software Readiness:</b>", table_cell_bold),
            Paragraph("<font color='#0f5132'><b>READY FOR CONTROLLED SOFTWARE DEMONSTRATION</b></font> (32/32 tests passed, 0 build errors)", table_cell_style)
        ],
        [
            Paragraph("<b>Physical Readiness:</b>", table_cell_bold),
            Paragraph("<font color='#be123c'><b>PHYSICAL DEPLOYMENT NOT VALIDATED — FIELD PILOT REQUIRED</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Supporting Evidence:</b>", table_cell_bold),
            Paragraph("Machine-readable evidence files archived in <code>reports/audit_evidence/</code>", table_cell_style)
        ],
    ]

    summary_table = Table(summary_box_data, colWidths=[1.8 * inch, 5.2 * inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)

    story.append(Spacer(1, 25))
    notice_text = (
        "<b>AUDITOR STATEMENT & SCOPE NOTICE:</b> This second-pass technical report reflects verified code artifacts and machine test results. "
        "It does not imply third-party certification or regulatory accreditation. Simulated subsystems are explicitly labeled as such, "
        "and financial models are presented as illustrative techno-economic projections rather than empirical farm receipts."
    )
    story.append(Paragraph(notice_text, callout_style))
    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # CHAPTER 1: EXECUTIVE SUMMARY
    # -------------------------------------------------------------------------
    story.append(Paragraph("Chapter 1 — Executive Summary & Audit Baseline", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=6))
    
    p1 = (
        "AquaIntel is a modular full-stack platform designed around the biological operations of commercial "
        "<i>Litopenaeus vannamei</i> farming in Nellore, Andhra Pradesh. This revised audit verifies that the codebase "
        "executes reliably as a software system while identifying critical prerequisites before physical farm deployment."
    )
    story.append(Paragraph(p1, body_style))

    story.append(Paragraph("Subsystem Audit Status Matrix", h2_style))
    subsystem_data = [
        [Paragraph("<b>Subsystem</b>", table_header_style), Paragraph("<b>Claimed Feature</b>", table_header_style), Paragraph("<b>Verified Evidence & Finding</b>", table_header_style), Paragraph("<b>Audit Classification</b>", table_header_style)],
        [
            Paragraph("Backend API", table_cell_bold),
            Paragraph("17 REST Routers, JWT Auth, WebSockets", table_cell_style),
            Paragraph("32/32 tests passed in 2.99s. All routes resolved under /api/v1.", table_cell_style),
            Paragraph("<font color='#0f5132'><b>VERIFIED WORKING</b></font>", table_cell_style)
        ],
        [
            Paragraph("Frontend SPA", table_cell_bold),
            Paragraph("17 pages, Recharts telemetry, event injection", table_cell_style),
            Paragraph("tsc -b & vite build passed (0 errors). oxlint passed (0 errors, 153 warnings).", table_cell_style),
            Paragraph("<font color='#0f5132'><b>VERIFIED WORKING</b></font>", table_cell_style)
        ],
        [
            Paragraph("Database", table_cell_bold),
            Paragraph("10 ponds, 70 sensors, 40 aerators, seed data", table_cell_style),
            Paragraph("Verified 10 ponds, 105 sensors, 45 aerators, 1,720 readings in aquaintel.db.", table_cell_style),
            Paragraph("<font color='#0f5132'><b>VERIFIED WORKING</b></font>", table_cell_style)
        ],
        [
            Paragraph("AI Disease ML", table_cell_bold),
            Paragraph("Multi-pathogen Random Forest classifier", table_cell_style),
            Paragraph("Trained on 1,200 synthetic rows; 55% acc; fails on EHP (0.0 F1) and EMS (0.056).", table_cell_style),
            Paragraph("<font color='#b45309'><b>SIMULATED (SYNTHETIC)</b></font>", table_cell_style)
        ],
        [
            Paragraph("Computer Vision", table_cell_bold),
            Paragraph("Check-tray feed and shrimp vigor detection", table_cell_style),
            Paragraph("OpenCV contour detection with synthetic bounding box HUD overlay.", table_cell_style),
            Paragraph("<font color='#b45309'><b>PARTIALLY IMPLEMENTED</b></font>", table_cell_style)
        ],
        [
            Paragraph("IoT Edge Safety", table_cell_bold),
            Paragraph("Autonomous local hysteresis & feeder cutoff", table_cell_style),
            Paragraph("State machine operates locally without internet in automated pytest.", table_cell_style),
            Paragraph("<font color='#0f5132'><b>VERIFIED (SIMULATED)</b></font>", table_cell_style)
        ],
        [
            Paragraph("Physical Hardware", table_cell_bold),
            Paragraph("ESP32 buoys, LoRa SX1276 radios, RS485 probes", table_cell_style),
            Paragraph("C++ firmware sketch present. Physical hardware not connected or tested.", table_cell_style),
            Paragraph("<font color='#be123c'><b>NOT VALIDATED (NO HW)</b></font>", table_cell_style)
        ],
        [
            Paragraph("Financial Returns", table_cell_bold),
            Paragraph("₹22L CAPEX, ₹1.56 Cr benefit, 1.7-mo payback", table_cell_style),
            Paragraph("Mathematical model based on unverified disease & FCR assumptions.", table_cell_style),
            Paragraph("<font color='#b45309'><b>ILLUSTRATIVE MODEL</b></font>", table_cell_style)
        ],
    ]
    t_sub = Table(subsystem_data, colWidths=[1.1 * inch, 1.7 * inch, 2.7 * inch, 1.5 * inch])
    t_sub.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ]))
    story.append(t_sub)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # CHAPTER 2: FRONTEND & BACKEND AUDIT
    # -------------------------------------------------------------------------
    story.append(Paragraph("Chapter 2 — Frontend & Backend Verification", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=6))
    
    p_fe_be = (
        "<b>Frontend Results:</b> The React 19 application compiles cleanly (<code>npm run build</code>: 0 errors in 402ms). "
        "All 17 pages resolve via <code>AppContext</code>. Oxlint reports 0 errors and 153 minor non-blocking warnings "
        "(archived in <code>reports/audit_evidence/frontend_audit.txt</code>).<br/>"
        "<b>Backend Results:</b> FastAPI service was verified through automated pytest execution (32 total / 32 passed / 0 failed in 2.99s). "
        "Dual health endpoints (<code>/health</code> and <code>/api/health</code>) return <code>HEALTHY</code> status. "
        "Test logs are archived in <code>reports/audit_evidence/test_results.txt</code>."
    )
    story.append(Paragraph(p_fe_be, body_style))

    story.append(Paragraph("Automated Test Suite Evidence Breakdown", h2_style))
    test_breakdown = [
        [Paragraph("<b>Pytest Module File</b>", table_header_style), Paragraph("<b>Scope Verified</b>", table_header_style), Paragraph("<b>Count</b>", table_header_style), Paragraph("<b>Result</b>", table_header_style)],
        [Paragraph("test_ai_dataset_pipeline.py", table_cell_bold), Paragraph("ZIP discovery, CSV schemas, synthetic provenance, ML train/inference", table_cell_style), Paragraph("10", table_cell_style), Paragraph("<font color='#0f5132'><b>10 PASSED</b></font>", table_cell_style)],
        [Paragraph("test_control_and_ai.py", table_cell_bold), Paragraph("Hypoxic emergency aeration, feeding cutoff, anomaly detector, offline state machine", table_cell_style), Paragraph("6", table_cell_style), Paragraph("<font color='#0f5132'><b>6 PASSED</b></font>", table_cell_style)],
        [Paragraph("test_foundation.py", table_cell_bold), Paragraph("SQLite database connectivity, tables seed, health endpoints, farm overview", table_cell_style), Paragraph("7", table_cell_style), Paragraph("<font color='#0f5132'><b>7 PASSED</b></font>", table_cell_style)],
        [Paragraph("test_phase2_core.py", table_cell_bold), Paragraph("API v1 routes, JWT login/me, telemetry ingestion, command lifecycle, pond CRUD", table_cell_style), Paragraph("9", table_cell_style), Paragraph("<font color='#0f5132'><b>9 PASSED</b></font>", table_cell_style)],
        [Paragraph("<b>TOTAL</b>", table_cell_bold), Paragraph("<b>Automated Unit & Integration Coverage</b>", table_cell_bold), Paragraph("<b>32</b>", table_cell_bold), Paragraph("<font color='#0f5132'><b>32 PASSED (100%)</b></font>", table_cell_bold)],
    ]
    t_test = Table(test_breakdown, colWidths=[2.0 * inch, 3.4 * inch, 0.6 * inch, 1.0 * inch])
    t_test.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, LIGHT_BG]),
        ('BACKGROUND', (0, -1), (-1, -1), ACCENT_BG),
    ]))
    story.append(t_test)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # CHAPTER 3: DATABASE VERIFICATION
    # -------------------------------------------------------------------------
    story.append(Paragraph("Chapter 3 — Database Schema & Record Verification", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=6))
    
    p_db = (
        "Direct SQL examination of <code>aquaintel.db</code> verified 19 tables synced to Alembic migration "
        "revision <code>930fec5b847c</code>. The database exceeds initial baseline claims: 10 ponds, 105 sensors "
        "(vs 70 baseline), 45 aerators (vs 40 baseline), 15 feeders, 14 users, and 1,720 sensor readings. "
        "Full record inventory is archived in <code>reports/audit_evidence/database_audit.json</code>."
    )
    story.append(Paragraph(p_db, body_style))
    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # CHAPTER 4: AI/ML CRITICAL VERIFICATION
    # -------------------------------------------------------------------------
    story.append(Paragraph("Chapter 4 — AI/ML & Disease Dataset Critical Review", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=6))

    p_ai_crit = (
        "<b>DATASET PROVENANCE AUDIT:</b> File <code>synthetic_demo_data_NOT_FOR_VALIDATED_TRAINING.csv</code> (1,200 rows × 28 cols) "
        "was examined. <b>100% of rows are synthetic</b> (<code>data_source: SYNTHETIC</code>, <code>label_status: SYNTHETIC_LABEL</code>). "
        "There are <b>0 real laboratory PCR confirmed records</b> (<code>lab_test_type</code>, <code>lab_test_date</code>, "
        "<code>lab_test_result</code> are 100% null). "
        "Full audit evidence is archived in <code>reports/audit_evidence/dataset_audit.json</code>.<br/>"
        "<b>ML MODEL EVALUATION:</b> The Balanced Random Forest classifier (<code>disease_risk_pipeline.joblib</code>) was evaluated on a "
        "20% holdout split (240 synthetic rows). Overall accuracy is <b>55.0%</b> (macro F1: <b>0.2314</b>). "
        "Model metrics are archived in <code>reports/audit_evidence/ml_metrics.json</code>."
    )
    story.append(Paragraph(p_ai_crit, body_style))

    story.append(Paragraph("Detailed Class-by-Class Metric Audit", h2_style))
    ml_table_data = [
        [Paragraph("<b>Target Pathogen Class</b>", table_header_style), Paragraph("<b>Dataset Count</b>", table_header_style), Paragraph("<b>Precision</b>", table_header_style), Paragraph("<b>Recall</b>", table_header_style), Paragraph("<b>F1-Score</b>", table_header_style), Paragraph("<b>Audit Assessment</b>", table_header_style)],
        [Paragraph("HEALTHY", table_cell_bold), Paragraph("613 (51.1%)", table_cell_style), Paragraph("0.700", table_cell_style), Paragraph("0.911", table_cell_style), Paragraph("<b>0.792</b>", table_cell_style), Paragraph("Moderate true-negative detection.", table_cell_style)],
        [Paragraph("WSSV (White Spot)", table_cell_bold), Paragraph("177 (14.8%)", table_cell_style), Paragraph("0.324", table_cell_style), Paragraph("0.314", table_cell_style), Paragraph("<b>0.319</b>", table_cell_style), Paragraph("High false-positive rate (~68%).", table_cell_style)],
        [Paragraph("VIBRIOSIS", table_cell_bold), Paragraph("122 (10.2%)", table_cell_style), Paragraph("0.200", table_cell_style), Paragraph("0.208", table_cell_style), Paragraph("<b>0.204</b>", table_cell_style), Paragraph("Low precision (80% false alarms).", table_cell_style)],
        [Paragraph("BLACK_GILL", table_cell_bold), Paragraph("74 (6.2%)", table_cell_style), Paragraph("0.333", table_cell_style), Paragraph("0.200", table_cell_style), Paragraph("<b>0.250</b>", table_cell_style), Paragraph("Poor sensitivity (20% recall).", table_cell_style)],
        [Paragraph("AHPND_EMS", table_cell_bold), Paragraph("121 (10.1%)", table_cell_style), Paragraph("0.083", table_cell_style), Paragraph("0.042", table_cell_style), Paragraph("<b>0.056</b>", table_cell_style), Paragraph("<font color='#be123c'><b>Severely Deficient:</b> Only 1/24 caught.</font>", table_cell_style)],
        [Paragraph("MIXED_OR_UNRESOLVED", table_cell_bold), Paragraph("50 (4.2%)", table_cell_style), Paragraph("0.000", table_cell_style), Paragraph("0.000", table_cell_style), Paragraph("<b>0.000</b>", table_cell_style), Paragraph("<font color='#be123c'><b>Complete Failure:</b> 0% detected.</font>", table_cell_style)],
        [Paragraph("EHP Microsporidian", table_cell_bold), Paragraph("43 (3.6%)", table_cell_style), Paragraph("0.000", table_cell_style), Paragraph("0.000", table_cell_style), Paragraph("<b>0.000</b>", table_cell_style), Paragraph("<font color='#be123c'><b>Complete Failure:</b> 0% detected.</font>", table_cell_style)],
        [Paragraph("<b>MACRO AVERAGE</b>", table_cell_bold), Paragraph("<b>1,200 Rows</b>", table_cell_bold), Paragraph("<b>0.234</b>", table_cell_bold), Paragraph("<b>0.239</b>", table_cell_bold), Paragraph("<b>0.231</b>", table_cell_bold), Paragraph("<b>Unsuitable for autonomous clinical diagnosis.</b>", table_cell_bold)],
    ]
    t_ml_v2 = Table(ml_table_data, colWidths=[1.6 * inch, 0.9 * inch, 0.7 * inch, 0.7 * inch, 0.7 * inch, 2.4 * inch])
    t_ml_v2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, LIGHT_BG]),
        ('BACKGROUND', (0, -1), (-1, -1), ACCENT_BG),
    ]))
    story.append(t_ml_v2)
    story.append(Spacer(1, 6))

    ai_crit_box = (
        "<b>CLINICAL INTEGRITY NOTICE:</b> Synthetic classification accuracy does not demonstrate real-world disease prediction. "
        "Water quality parameters indicate physiological stress vulnerability, not pathogen presence. "
        "Veterinary pathology and RT-qPCR molecular laboratory tests are mandatory before making farm intervention decisions."
    )
    story.append(Paragraph(ai_crit_box, callout_style))
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # CHAPTER 5: IoT & HARDWARE SEPARATION
    # -------------------------------------------------------------------------
    story.append(Paragraph("Chapter 5 — IoT & Hardware Verification Breakdown", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=6))

    p_iot_crit = (
        "To maintain strict engineering rigor, this audit separates source code inspection and software simulation "
        "from physical microcontroller and field deployment testing:"
    )
    story.append(Paragraph(p_iot_crit, body_style))

    iot_sep_data = [
        [Paragraph("<b>Verification Tier</b>", table_header_style), Paragraph("<b>Target Component</b>", table_header_style), Paragraph("<b>Audit Method</b>", table_header_style), Paragraph("<b>Verified Finding & Status</b>", table_header_style)],
        [
            Paragraph("Source Code Inspection", table_cell_bold),
            Paragraph("ESP32 Firmware (esp32_pond_master.ino)", table_cell_style),
            Paragraph("Static code analysis", table_cell_style),
            Paragraph("<font color='#0f5132'><b>VERIFIED:</b></font> 117 lines of C++ with RS485 Modbus, SX1276 LoRa, 10-min anti-cycle timer.", table_cell_style)
        ],
        [
            Paragraph("Automated Simulation", table_cell_bold),
            Paragraph("Edge Controller (edge_controller.py)", table_cell_style),
            Paragraph("Pytest unit testing", table_cell_style),
            Paragraph("<font color='#0f5132'><b>VERIFIED:</b></font> State machine cuts feeding and forces aeration during DO < 3.0 in simulation.", table_cell_style)
        ],
        [
            Paragraph("Gateway Simulation", table_cell_bold),
            Paragraph("Central LoRa Gateway (lora_gateway.py)", table_cell_style),
            Paragraph("Python module inspection", table_cell_style),
            Paragraph("<font color='#0f5132'><b>VERIFIED:</b></font> IN865 band packet framing and offline queue store-and-forward tested.", table_cell_style)
        ],
        [
            Paragraph("Physical Microcontrollers", table_cell_bold),
            Paragraph("ESP32-WROOM-32D & SX1276 Hardware", table_cell_style),
            Paragraph("Bench hardware test", table_cell_style),
            Paragraph("<font color='#be123c'><b>NOT VALIDATED:</b></font> Physical microcontrollers were not connected during software audit.", table_cell_style)
        ],
        [
            Paragraph("Real Farm Deployment", table_cell_bold),
            Paragraph("Commercial 10-Ha Ponds (Nellore)", table_cell_style),
            Paragraph("Field pilot trial", table_cell_style),
            Paragraph("<font color='#be123c'><b>NOT VALIDATED:</b></font> System has not been deployed on physical shrimp ponds.", table_cell_style)
        ],
    ]
    t_iot_sep = Table(iot_sep_data, colWidths=[1.5 * inch, 1.8 * inch, 1.3 * inch, 2.4 * inch])
    t_iot_sep.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ]))
    story.append(t_iot_sep)
    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # CHAPTER 6: FINANCIAL RE-CALCULATION & AUDIT
    # -------------------------------------------------------------------------
    story.append(Paragraph("Chapter 6 — Review of Financial & Techno-Economic Calculations", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=6))

    p_fin = (
        "The repository documents a 10-hectare commercial model claiming an initial CAPEX of ₹22 Lakhs, an annual net benefit "
        "of ₹1.56 Crores, and a payback of 1.69 months (~1.7 months). This audit re-calculated the mathematical formulas "
        "and reviewed their underlying assumptions. Audit evidence is archived in <code>reports/audit_evidence/financial_model.json</code>."
    )
    story.append(Paragraph(p_fin, body_style))

    story.append(Paragraph("Step-by-Step Mathematical Formula Verification", h2_style))
    fin_steps_data = [
        [Paragraph("<b>Financial Metric</b>", table_header_style), Paragraph("<b>Calculation Formula & Underlying Inputs</b>", table_header_style), Paragraph("<b>Modeled Result</b>", table_header_style), Paragraph("<b>Audit Classification</b>", table_header_style)],
        [
            Paragraph("<b>Initial CAPEX</b>", table_cell_bold),
            Paragraph("10 DO/Temp probes (₹4.5L) + 10 pH (₹1.2L) + 10 Salinity (₹1.8L) + 10 RTUs (₹1.4L) + LoRa GW (₹65K) + 10 Feeders (₹5.2L) + 10 VFD Starters (₹4.8L) + Server (₹1.45L) + Installation (₹1.0L)", table_cell_style),
            Paragraph("₹22,00,000<br/>(₹2.2L / Ha)", table_cell_style),
            Paragraph("<font color='#b45309'>Illustrative Estimate</font><br/>(Equipment Quotes)", table_cell_style)
        ],
        [
            Paragraph("<b>Annual OPEX</b>", table_cell_bold),
            Paragraph("Sensor caps/reagents (₹75K) + 4G SIMs (₹24K) + Mechanical servicing (₹85K) + Spares (₹36K) = 10% of CAPEX", table_cell_style),
            Paragraph("₹2,20,000 / yr", table_cell_style),
            Paragraph("<font color='#b45309'>Illustrative Estimate</font>", table_cell_style)
        ],
        [
            Paragraph("<b>Feed Savings</b>", table_cell_bold),
            Paragraph("Production (187,500 kg) × FCR diff (1.50 - 1.25 = 0.25) × Feed price (₹88/kg)", table_cell_style),
            Paragraph("₹41,25,000 / yr", table_cell_style),
            Paragraph("<font color='#b45309'>Unverified Assumption</font><br/>(Requires field trial)", table_cell_style)
        ],
        [
            Paragraph("<b>Energy Savings</b>", table_cell_bold),
            Paragraph("Baseline (180,000 kWh) × 24% smart aeration reduction × ₹7.50/kWh tariff", table_cell_style),
            Paragraph("₹3,24,000 / yr", table_cell_style),
            Paragraph("<font color='#b45309'>Modeled Estimate</font><br/>(Diurnal DO curves)", table_cell_style)
        ],
        [
            Paragraph("<b>Labor Savings</b>", table_cell_bold),
            Paragraph("12 baseline laborers @ ₹18K/mo (₹25.92L/yr) × 30% automation reduction", table_cell_style),
            Paragraph("₹7,77,600 / yr", table_cell_style),
            Paragraph("<font color='#b45309'>Illustrative Estimate</font>", table_cell_style)
        ],
        [
            Paragraph("<b>Disease Protection</b>", table_cell_bold),
            Paragraph("Gross revenue (₹7.875 Cr) × 13.5% assumed mortality reduction (18% down to 4.5%)", table_cell_style),
            Paragraph("<b>₹1,06,31,250 / yr</b><br/>(67.9% of benefit)", table_cell_style),
            Paragraph("<font color='#be123c'><b>UNVERIFIED ASSUMPTION</b></font><br/>(No clinical trial)", table_cell_style)
        ],
        [
            Paragraph("<b>Net Annual Benefit</b>", table_cell_bold),
            Paragraph("Gross benefit (₹1,58,57,850) - Annual OPEX (₹2,20,000)", table_cell_style),
            Paragraph("<b>₹1,56,37,850 / yr</b>", table_cell_style),
            Paragraph("<font color='#b45309'><b>Illustrative Projection</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Payback Period</b>", table_cell_bold),
            Paragraph("CAPEX (₹22,00,000) ÷ (Net Benefit ₹1,56,37,850 ÷ 12 months)", table_cell_style),
            Paragraph("<b>1.688 Months<br/>(~1.7 Months)</b>", table_cell_style),
            Paragraph("<font color='#b45309'><b>Modeled Projection</b></font>", table_cell_style)
        ],
    ]
    t_fin_v2 = Table(fin_steps_data, colWidths=[1.3 * inch, 3.2 * inch, 1.2 * inch, 1.3 * inch])
    t_fin_v2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ]))
    story.append(t_fin_v2)
    story.append(Spacer(1, 6))

    fin_audit_verdict = (
        "<b>CRITICAL FINANCIAL AUDIT VERDICT:</b> Notice that <b>67.9% of the projected financial return (₹1.06 Crores out of ₹1.56 Crores) "
        "hinges entirely on the assumption of a 13.5% reduction in catastrophic disease loss</b>. "
        "Because the disease ML model has not been validated on real clinical field data, this savings figure cannot be verified. "
        "These calculations represent an exploratory techno-economic model and must not be cited as guaranteed or verified earnings."
    )
    story.append(Paragraph(fin_audit_verdict, callout_style))
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # CHAPTER 7: ISSUES & ROADMAP
    # -------------------------------------------------------------------------
    story.append(Paragraph("Chapter 7 — Issues, Engineering Recommendations & Roadmap", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceBefore=2, spaceAfter=6))

    issues_v2_data = [
        [Paragraph("<b>Finding & Evidence</b>", table_header_style), Paragraph("<b>Severity</b>", table_header_style), Paragraph("<b>Engineering Impact</b>", table_header_style), Paragraph("<b>Required Action & Roadmap</b>", table_header_style)],
        [
            Paragraph("<b>Synthetic Disease Dataset:</b> 100% of 1,200 rows synthetic; 0 real PCR lab tests.", table_cell_bold),
            Paragraph("<font color='#be123c'><b>HIGH</b></font>", table_cell_style),
            Paragraph("Classifier yields 55% acc; fails on EHP (0.0 F1) and AHPND (0.056 F1).", table_cell_style),
            Paragraph("Partner with regional aquaculture research stations to collect RT-qPCR samples using <code>real_farm_data_template.csv</code>.", table_cell_style)
        ],
        [
            Paragraph("<b>Unverified Financial Claims:</b> ₹1.56 Cr benefit assumes unvalidated disease protection.", table_cell_bold),
            Paragraph("<font color='#b45309'><b>MEDIUM</b></font>", table_cell_style),
            Paragraph("Risk of overpromising commercial returns to farm operators or investors.", table_cell_style),
            Paragraph("Clearly classify financial models as exploratory projections; measure empirical FCR/energy deltas in field pilots.", table_cell_style)
        ],
        [
            Paragraph("<b>Unrestricted CORS & Rate Limiting:</b> allow_origins=['*'] and no rate limiter in FastAPI.", table_cell_bold),
            Paragraph("<font color='#b45309'><b>MEDIUM</b></font>", table_cell_style),
            Paragraph("Potential vulnerability to cross-site scripting and API request flooding.", table_cell_style),
            Paragraph("Restrict CORS to production domain and configure <code>slowapi</code> rate limiting.", table_cell_style)
        ],
        [
            Paragraph("<b>SQLAlchemy utcnow() Warning:</b> 38 Pytest warnings regarding deprecated datetime calls.", table_cell_bold),
            Paragraph("<font color='#64748b'><b>LOW</b></font>", table_cell_style),
            Paragraph("Deprecation warnings in Python 3.12+; future breaking change.", table_cell_style),
            Paragraph("Migrate model default timestamps to <code>lambda: datetime.now(timezone.utc)</code>.", table_cell_style)
        ],
    ]
    t_issues_v2 = Table(issues_v2_data, colWidths=[1.8 * inch, 0.8 * inch, 2.0 * inch, 2.4 * inch])
    t_issues_v2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ]))
    story.append(t_issues_v2)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Final Audit Conclusion", h2_style))
    conclusion_text_v2 = (
        "<b>CONCLUSION:</b> AquaIntel demonstrates high technical competency in its software architecture, "
        "achieving clean TypeScript builds, passing 100% of its automated test suite (32/32), and enforcing defensive "
        "edge controller hysteresis loops.<br/>"
        "• <b>Software Demonstration Readiness:</b> <font color='#0f5132'><b>READY FOR CONTROLLED SOFTWARE DEMONSTRATION</b></font> "
        "(Academic review, project evaluation, hackathons).<br/>"
        "• <b>Physical Deployment Readiness:</b> <font color='#be123c'><b>PHYSICAL DEPLOYMENT NOT VALIDATED</b></font>. "
        "Physical microcontroller testing, sensor bench calibrations, and clinical RT-qPCR data collection remain mandatory prerequisites."
    )
    story.append(Paragraph(conclusion_text_v2, body_style))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvasV2)
    print(f"Successfully generated PDF v2: {output_filename}")


if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else "reports/AquaIntel_Technical_Verification_Report_v2.pdf"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    build_pdf_report_v2(out_path)
