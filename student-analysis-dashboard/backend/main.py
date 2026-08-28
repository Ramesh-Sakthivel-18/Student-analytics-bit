from fastapi import FastAPI, Query, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional

from data_service import (
    load_data, get_dashboard_summary, get_subject_analytics,
    get_top_performers, get_class_division, get_grade_distribution,
    get_batch_comparison, get_at_risk_students
)

from model_service import (
    verify_model_loaded, predict_single, parse_and_predict_excel
)

app = FastAPI(title="Academic Intelligence Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load existing student data into memory at startup
print("Loading data from Excel files...")
STUDENT_DATA = load_data()
print(f"Loaded {len(STUDENT_DATA)} student records.")


class SubjectMark(BaseModel):
    name: str
    mark: float
    max_score: float = 50.0

class SinglePredictionRequest(BaseModel):
    student_id: str = Field(..., example="7376221CS101")
    student_name: str = Field(..., example="John Doe")
    subjects: List[SubjectMark] = Field(..., example=[{"name": "Data Structures", "mark": 35.0, "max_score": 50.0}])

# ==========================================
# Prediction Engine Endpoints
# ==========================================

@app.get("/api/health")
def health_check():
    """Verifies API health and model file availability."""
    model_status = verify_model_loaded()
    return {
        "status": "ok",
        "model_status": model_status
    }


@app.post("/api/predict/single")
def predict_single_student(payload: SinglePredictionRequest):
    """Predicts pass/fail probabilities and risk status for a single student."""
    try:
        subjects_list = []
        if payload.subjects:
            subjects_list = [s.dict() for s in payload.subjects] if hasattr(payload.subjects[0], 'dict') else [dict(s) for s in payload.subjects]
        res = predict_single(
            student_id=payload.student_id,
            student_name=payload.student_name,
            subjects=subjects_list
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/api/predict/bulk")
async def predict_bulk_excel(file: UploadFile = File(...)):
    """Accepts multipart file upload (.xlsx / .xls) and runs batch predictions."""
    if not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file (.xlsx or .xls).")
    
    try:
        content = await file.read()
        res = parse_and_predict_excel(content)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process Excel file: {str(e)}")


# ==========================================
# Existing Dashboard Endpoints
# ==========================================

@app.get("/api/departments")
def get_departments():
    departments = sorted(list(set([s.get("department") for s in STUDENT_DATA if s.get("department")])))
    return {"departments": departments}

@app.get("/api/dashboard/summary")
def dashboard_summary(department: str = Query("All"), semester: str = Query("All")):
    return get_dashboard_summary(STUDENT_DATA, department, semester)


@app.get("/api/students")
def list_students(department: str = Query("All"), semester: str = Query("All"), search: str = Query("")):
    data = STUDENT_DATA
    if department and department != "All":
        data = [s for s in data if s.get("department") == department]
    if semester and semester != "All":
        data = [s for s in data if s["semester"] == semester]
        
    if search:
        search = search.lower()
        data = [s for s in data if search in s["registerNumber"].lower() or search in s["name"].lower()]
        
    return [{
        "registerNumber": s["registerNumber"],
        "name": s["name"],
        "semester": s["semester"],
        "gpa": s["gpa"],
        "result": s["result"],
        "failCount": s["failCount"]
    } for s in data]


@app.get("/api/students/{register_number}")
def student_details(register_number: str):
    records = [s for s in STUDENT_DATA if s["registerNumber"] == register_number]
    if not records:
        return {"error": "Student not found"}
    return {
        "registerNumber": records[0]["registerNumber"],
        "name": records[0]["name"],
        "records": records
    }


@app.get("/api/dashboard/subject-analytics")
def subject_analytics(department: str = Query("All"), semester: str = Query("All")):
    return get_subject_analytics(STUDENT_DATA, department, semester)


@app.get("/api/dashboard/semester-trends")
def semester_trends(department: str = Query("All")):
    from data_service import get_semester_trends
    return get_semester_trends(STUDENT_DATA, department)


@app.get("/api/dashboard/top-performers")
def top_performers(department: str = Query("All"), semester: str = Query("All"), limit: int = Query(5)):
    return get_top_performers(STUDENT_DATA, department, semester, limit)


@app.get("/api/dashboard/class-division")
def class_division(department: str = Query("All"), semester: str = Query("All")):
    return get_class_division(STUDENT_DATA, department, semester)


@app.get("/api/dashboard/grade-distribution")
def grade_distribution(department: str = Query("All"), semester: str = Query("All")):
    return get_grade_distribution(STUDENT_DATA, department, semester)


@app.get("/api/dashboard/batch-comparison")
def batch_comparison(department: str = Query("All")):
    return get_batch_comparison(STUDENT_DATA, department)


@app.get("/api/dashboard/at-risk")
def at_risk_students(department: str = Query("All"), semester: str = Query("All")):
    return get_at_risk_students(STUDENT_DATA, department, semester)
