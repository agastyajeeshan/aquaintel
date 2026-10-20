from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
from ..core.cv_analyzer import shrimp_cv_analyzer

router = APIRouter(prefix="/cv", tags=["Computer Vision"])

@router.post("/analyze")
async def analyze_visual(
    file: Optional[UploadFile] = File(None),
    sample_type: str = Form("tray_check")
):
    image_bytes = b""
    filename = "sample_tray.jpg"
    
    if file:
        image_bytes = await file.read()
        filename = file.filename
    else:
        # Generate representative sample image bytes (synthetic minimal JPEG or dummy bytes)
        image_bytes = b"aquaintel_sample_shrimp_frame"

    analysis = shrimp_cv_analyzer.analyze_image_bytes(image_bytes, filename=filename)
    analysis["sample_type"] = sample_type
    return analysis

@router.get("/samples")
def get_sample_cases():
    return [
        {
            "id": "sample-1",
            "title": "Pond 03 - Check Tray Morning Feed Inspection",
            "type": "tray_inspection",
            "thumbnail_label": "High Activity / Clean Tray",
            "description": "DOC 50 feeding tray hauled after 2 hours. Active ingestion, 95% feed cleared.",
            "metrics": {
                "shrimp_count": 38,
                "uneaten_pellets": 3,
                "tray_consumption": "96%",
                "activity": "VIGOROUS",
                "dead_count": 0
            }
        },
        {
            "id": "sample-2",
            "title": "Pond 08 - Uneaten Feed & Lethargy Alert",
            "type": "tray_inspection",
            "thumbnail_label": "Residual Feed / Warning",
            "description": "DOC 65 check tray showing sluggish shrimp and excessive residual pellets.",
            "metrics": {
                "shrimp_count": 18,
                "uneaten_pellets": 26,
                "tray_consumption": "55%",
                "activity": "LETHARGIC",
                "dead_count": 1
            }
        },
        {
            "id": "sample-3",
            "title": "Pond 01 - Underwater Bio-Optical Probe Frame",
            "type": "water_column",
            "thumbnail_label": "Water Column Swimming",
            "description": "Night-time infrared camera monitoring vertical migration and pleopod motion.",
            "metrics": {
                "shrimp_count": 52,
                "uneaten_pellets": 0,
                "tray_consumption": "100%",
                "activity": "NORMAL",
                "dead_count": 0
            }
        }
    ]
