import pandas as pd
import os
import glob

DATASET_PATH = r"D:\ramesh\student analysis\dataset\CSE NOV 2025"
SEMESTERS = ["I", "III", "V", "VII"]

def load_data():
    all_students = []
    
    for sem in SEMESTERS:
        sem_dir = os.path.join(DATASET_PATH, sem)
        excel_files = glob.glob(os.path.join(sem_dir, "*.xlsx"))
        for file_path in excel_files:
            try:
                df = pd.read_excel(file_path, header=None)
                
                # Extract headers (Row 2 and Row 3)
                row2 = df.iloc[2].ffill().astype(str)
                row3 = df.iloc[3].fillna("").astype(str)
                
                # Create combined column names
                col_names = []
                for r2, r3 in zip(row2, row3):
                    if r2 == "nan": r2 = ""
                    if r3 == "nan" or not r3.strip(): 
                        col_names.append(r2.strip())
                    else:
                        col_names.append(f"{r2.strip()}_{r3.strip()}")
                
                # Apply columns and drop header rows
                df.columns = col_names
                df = df.iloc[4:].dropna(subset=["Register Number"])
                
                # Parse student records
                for _, row in df.iterrows():
                    reg_num = str(row.get("Register Number", "")).strip()
                    if not reg_num or reg_num == "nan":
                        continue
                    
                    name = str(row.get("Name", "")).strip()
                    result = str(row.get("Result", "")).strip()
                    gpa = row.get("GPA", 0)
                    try:
                        gpa = float(gpa)
                    except:
                        gpa = 0.0
                    
                    # Extract subjects
                    subjects = []
                    subject_codes = set([c.split('_')[0] for c in col_names if '_' in c and len(c.split('_')) == 2])
                    for sub in subject_codes:
                        if not sub or sub == 'nan': continue
                        im = row.get(f"{sub}_IM", 0)
                        em = row.get(f"{sub}_EM", 0)
                        tot = row.get(f"{sub}_TOT", 0)
                        grd = row.get(f"{sub}_GRD", "")
                        
                        try: im = float(im) if pd.notna(im) else 0
                        except: im = 0
                        try: em = float(em) if pd.notna(em) else 0
                        except: em = 0
                        try: tot = float(tot) if pd.notna(tot) else 0
                        except: tot = 0.0
                        
                        if pd.notna(grd) and str(grd).strip() != "":
                            subjects.append({
                                "code": sub,
                                "im": im,
                                "em": em,
                                "tot": tot,
                                "grd": str(grd).strip()
                            })

                    # Count failed subjects
                    fail_subjects = [s for s in subjects if s["grd"] in ["U", "F", "RA"]]
                    
                    student = {
                        "registerNumber": reg_num,
                        "name": name,
                        "semester": sem,
                        "result": result,
                        "gpa": gpa,
                        "subjects": subjects,
                        "failCount": len(fail_subjects)
                    }
                    all_students.append(student)
                    
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
                
    return all_students


def _filter_semester(data, semester):
    if semester and semester != "All":
        return [s for s in data if s["semester"] == semester]
    return data


def get_dashboard_summary(data, semester=None):
    data = _filter_semester(data, semester)
    if not data:
        return {"totalStudents": 0, "averageGpa": 0, "highestGpa": 0, "lowestGpa": 0, "passCount": 0, "failCount": 0, "passPercentage": 0}
        
    gpas = [s["gpa"] for s in data if s["gpa"] > 0]
    pass_count = len([s for s in data if s["result"].upper() in ["P", "PASS"]])
    fail_count = len(data) - pass_count
    
    return {
        "totalStudents": len(data),
        "averageGpa": round(sum(gpas) / len(gpas), 2) if gpas else 0,
        "highestGpa": max(gpas) if gpas else 0,
        "lowestGpa": min(gpas) if gpas else 0,
        "passCount": pass_count,
        "failCount": fail_count,
        "passPercentage": round((pass_count / len(data)) * 100, 2) if data else 0
    }


def get_subject_analytics(data, semester=None):
    data = _filter_semester(data, semester)
    subject_stats = {}
    for s in data:
        for sub in s["subjects"]:
            code = sub["code"]
            if code not in subject_stats:
                subject_stats[code] = {"total_marks": [], "grades": [], "passes": 0, "fails": 0}
            
            subject_stats[code]["total_marks"].append(sub["tot"])
            subject_stats[code]["grades"].append(sub["grd"])
            if sub["grd"] in ["U", "F", "RA"]:
                subject_stats[code]["fails"] += 1
            else:
                subject_stats[code]["passes"] += 1
                
    result = []
    for code, stats in subject_stats.items():
        marks = stats["total_marks"]
        if not marks: continue
        result.append({
            "subject": code,
            "average": round(sum(marks) / len(marks), 2),
            "highest": max(marks),
            "lowest": min(marks),
            "passCount": stats["passes"],
            "failCount": stats["fails"]
        })
    return result


def get_top_performers(data, semester=None, limit=5):
    """Get top N students by GPA for the selected semester."""
    data = _filter_semester(data, semester)
    sorted_students = sorted(data, key=lambda x: x["gpa"], reverse=True)
    top = []
    for i, s in enumerate(sorted_students[:limit]):
        top.append({
            "rank": i + 1,
            "registerNumber": s["registerNumber"],
            "name": s["name"],
            "semester": s["semester"],
            "gpa": s["gpa"]
        })
    return top


def get_class_division(data, semester=None):
    """Categorize students into academic divisions based on GPA."""
    data = _filter_semester(data, semester)
    divisions = {
        "distinction": 0,   # GPA >= 8.0
        "firstClass": 0,    # GPA 6.5 - 7.99
        "secondClass": 0,   # GPA 5.0 - 6.49
        "fail": 0            # GPA < 5.0 or result is fail
    }
    for s in data:
        if s["result"].upper() not in ["P", "PASS"] or s["gpa"] < 5.0:
            divisions["fail"] += 1
        elif s["gpa"] >= 8.0:
            divisions["distinction"] += 1
        elif s["gpa"] >= 6.5:
            divisions["firstClass"] += 1
        else:
            divisions["secondClass"] += 1
    
    total = len(data) if data else 1
    return [
        {"name": "Distinction (8.0+)", "value": divisions["distinction"], "percentage": round(divisions["distinction"] / total * 100, 1)},
        {"name": "First Class (6.5-7.99)", "value": divisions["firstClass"], "percentage": round(divisions["firstClass"] / total * 100, 1)},
        {"name": "Second Class (5.0-6.49)", "value": divisions["secondClass"], "percentage": round(divisions["secondClass"] / total * 100, 1)},
        {"name": "Reappear / Fail", "value": divisions["fail"], "percentage": round(divisions["fail"] / total * 100, 1)},
    ]


def get_grade_distribution(data, semester=None):
    """Get grade distribution across all subjects for stacked bar chart."""
    data = _filter_semester(data, semester)
    grade_order = ["S", "A+", "A", "B+", "B", "C", "U"]
    grade_counts = {g: 0 for g in grade_order}
    total = 0
    
    for s in data:
        for sub in s["subjects"]:
            g = sub["grd"]
            if g in grade_counts:
                grade_counts[g] += 1
            total += 1
    
    result = []
    for g in grade_order:
        result.append({
            "grade": g,
            "count": grade_counts[g],
            "percentage": round(grade_counts[g] / total * 100, 1) if total > 0 else 0
        })
    return result


def get_batch_comparison(data):
    """Grade distribution per semester for stacked bar comparison."""
    grade_order = ["S", "A+", "A", "B+", "B", "C", "U"]
    result = []
    for sem in SEMESTERS:
        sem_data = [s for s in data if s["semester"] == sem]
        grade_counts = {g: 0 for g in grade_order}
        total = 0
        for s in sem_data:
            for sub in s["subjects"]:
                g = sub["grd"]
                if g in grade_counts:
                    grade_counts[g] += 1
                total += 1
        
        entry = {"semester": f"Sem {sem}"}
        for g in grade_order:
            entry[g] = round(grade_counts[g] / total * 100, 1) if total > 0 else 0
        result.append(entry)
    return result


def get_at_risk_students(data, semester=None):
    """Categorize students into risk levels based on pure data rules."""
    data = _filter_semester(data, semester)
    
    high_risk = []
    moderate_risk = []
    
    for s in data:
        is_fail = s["result"].upper() not in ["P", "PASS"]
        gpa = s["gpa"]
        fail_count = s["failCount"]
        
        risk_level = None
        reason = ""
        
        if is_fail or gpa < 5.0 or fail_count >= 2:
            risk_level = "critical"
            reasons = []
            if is_fail: reasons.append("Failed overall")
            if gpa < 5.0: reasons.append(f"Low GPA ({gpa})")
            if fail_count >= 2: reasons.append(f"{fail_count} arrears")
            reason = " | ".join(reasons)
            high_risk.append({
                "registerNumber": s["registerNumber"],
                "name": s["name"],
                "semester": s["semester"],
                "gpa": gpa,
                "failCount": fail_count,
                "riskLevel": "critical",
                "reason": reason
            })
        elif gpa < 6.0 or fail_count == 1:
            risk_level = "warning"
            reasons = []
            if gpa < 6.0: reasons.append(f"Borderline GPA ({gpa})")
            if fail_count == 1: reasons.append("1 arrear")
            reason = " | ".join(reasons)
            moderate_risk.append({
                "registerNumber": s["registerNumber"],
                "name": s["name"],
                "semester": s["semester"],
                "gpa": gpa,
                "failCount": fail_count,
                "riskLevel": "warning",
                "reason": reason
            })
    
    return {
        "highRiskCount": len(high_risk),
        "moderateRiskCount": len(moderate_risk),
        "totalAtRisk": len(high_risk) + len(moderate_risk),
        "highRisk": high_risk,
        "moderateRisk": moderate_risk
    }
