import os
import io
import pandas as pd
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_probability_model.joblib")
FEATURES_PATH = os.path.join(MODEL_DIR, "prob_features.joblib")

_model = None
_feature_names = ['Avg_Internal', 'Min_Internal', 'Low_Internal_Count']


def load_model_if_needed():
    global _model, _feature_names
    if _model is None:
        if os.path.exists(MODEL_PATH):
            _model = joblib.load(MODEL_PATH)
            try:
                _model.set_params(device='cpu')
            except Exception:
                pass
        else:
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
            
        if os.path.exists(FEATURES_PATH):
            _feature_names = joblib.load(FEATURES_PATH)
    return _model, _feature_names


def verify_model_loaded():
    try:
        model, features = load_model_if_needed()
        return {
            "status": "ok",
            "model_loaded": model is not None,
            "features": list(features),
            "model_path": MODEL_PATH
        }
    except Exception as e:
        return {
            "status": "error",
            "model_loaded": False,
            "error": str(e)
        }


def classify_risk(fail_probability: float) -> str:
    """
    Fail Probability >= 50%  --> "HIGH RISK (FAIL)"
    Fail Probability >= 25% and < 50% --> "MEDIUM RISK"
    Fail Probability < 25% --> "SAFE (PASS)"
    """
    if fail_probability >= 50.0:
        return "HIGH RISK (FAIL)"
    elif fail_probability >= 25.0:
        return "MEDIUM RISK"
    else:
        return "SAFE (PASS)"


def compute_features(marks: list[float]) -> dict:
    valid_marks = []
    for m in marks:
        try:
            val = float(m)
            if not np.isnan(val):
                valid_marks.append(val)
        except (ValueError, TypeError):
            continue

    if not valid_marks:
        avg_internal = 0.0
        min_internal = 0.0
        low_internal_count = 0
    else:
        avg_internal = float(np.mean(valid_marks))
        min_internal = float(np.min(valid_marks))
        low_internal_count = int(sum(1 for x in valid_marks if x < 25.0))

    return {
        "avg_internal": round(avg_internal, 2),
        "min_internal": round(min_internal, 2),
        "low_internal_count": low_internal_count,
        "valid_marks_count": len(valid_marks)
    }


def predict_single(student_id: str, student_name: str, internal_marks: list[float]) -> dict:
    model, features = load_model_if_needed()
    feat_dict = compute_features(internal_marks)
    
    # Construct input dataframe matching feature names
    df_features = pd.DataFrame([{
        'Avg_Internal': feat_dict["avg_internal"],
        'Min_Internal': feat_dict["min_internal"],
        'Low_Internal_Count': feat_dict["low_internal_count"]
    }], columns=features)

    probs = model.predict_proba(df_features)[0]
    pass_prob = round(float(probs[0]) * 100, 2)
    fail_prob = round(float(probs[1]) * 100, 2)
    risk_status = classify_risk(fail_prob)

    return {
        "student_id": student_id,
        "student_name": student_name,
        "avg_internal": feat_dict["avg_internal"],
        "min_internal": feat_dict["min_internal"],
        "low_internal_count": feat_dict["low_internal_count"],
        "pass_probability": pass_prob,
        "fail_probability": fail_prob,
        "risk_status": risk_status
    }


def parse_and_predict_excel(file_bytes: bytes) -> dict:
    """
    Parses dynamic college Excel sheets or simple mark tables,
    extracts internal marks per student, and computes batch predictions.
    """
    model, features = load_model_if_needed()
    
    df_raw = pd.read_excel(io.BytesIO(file_bytes), header=None)
    
    header_idx = -1
    sub_header_idx = -1
    
    # Check if this is a complex college result sheet with "IM" / "GPA"
    for i, row in df_raw.iterrows():
        row_str = row.astype(str).str.strip().str.upper().values
        if "GPA" in row_str or "REGISTER NUMBER" in row_str or "REGISTER NO" in row_str or "REG NO" in row_str:
            if header_idx == -1:
                header_idx = i
        if "IM" in row_str and "EM" in row_str:
            sub_header_idx = i
            break

    student_records = []
    
    if sub_header_idx != -1:
        # Complex College Result Sheet format
        header_row = df_raw.iloc[header_idx] if header_idx != -1 else df_raw.iloc[sub_header_idx - 1]
        sub_row = df_raw.iloc[sub_header_idx]

        # Locate columns
        im_cols = [j for j, val in enumerate(sub_row) if str(val).strip().upper() == 'IM']
        
        reg_col = None
        name_col = None
        for j, val in enumerate(df_raw.iloc[header_idx if header_idx != -1 else sub_header_idx - 1]):
            val_s = str(val).strip().upper()
            if "REGISTER" in val_s or "REG" in val_s or "ROLL" in val_s:
                reg_col = j
            elif "NAME" in val_s:
                name_col = j
                
        start_row = sub_header_idx + 1
        for i in range(start_row, len(df_raw)):
            row = df_raw.iloc[i]
            
            reg_val = str(row[reg_col]).strip() if reg_col is not None else f"STU{i - start_row + 1:03d}"
            name_val = str(row[name_col]).strip() if name_col is not None else f"Student {i - start_row + 1}"
            
            if not reg_val or reg_val.upper() in ["NAN", "NONE", ""]:
                continue
                
            im_values = []
            for col in im_cols:
                val = str(row[col]).strip().upper()
                if val.replace('.', '', 1).isdigit():
                    im_values.append(float(val))
                elif val in ['AB', 'U', '-', 'W', 'NAN', '']:
                    im_values.append(0.0)

            if im_values:
                student_records.append({
                    "id": reg_val,
                    "name": name_val if name_val.upper() != "NAN" else f"Student {reg_val}",
                    "marks": im_values
                })
    else:
        # Simple Excel file with table headers in row 0 or 1
        h_idx = 0
        for i in range(min(5, len(df_raw))):
            row_vals = [str(x).strip().upper() for x in df_raw.iloc[i]]
            if any("NAME" in x or "REGISTER" in x or "REG" in x or "MARK" in x for x in row_vals):
                h_idx = i
                break
                
        df_simple = pd.read_excel(io.BytesIO(file_bytes), header=h_idx)
        df_simple = df_simple.dropna(how="all")
        
        reg_col_name = None
        name_col_name = None
        mark_cols = []
        
        for col in df_simple.columns:
            c_str = str(col).strip().upper()
            if "REG" in c_str or "ROLL" in c_str or "ID" in c_str:
                reg_col_name = col
            elif "NAME" in c_str:
                name_col_name = col
            else:
                mark_cols.append(col)
                
        for idx, row in df_simple.iterrows():
            reg_val = str(row[reg_col_name]).strip() if reg_col_name and pd.notna(row[reg_col_name]) else f"STU{idx + 1:03d}"
            name_val = str(row[name_col_name]).strip() if name_col_name and pd.notna(row[name_col_name]) else f"Student {idx + 1}"
            
            if not reg_val or reg_val.upper() in ["NAN", "NONE", ""]:
                continue
                
            im_values = []
            for col in mark_cols:
                try:
                    val = row[col]
                    if pd.notna(val):
                        v_str = str(val).strip()
                        if v_str.replace('.', '', 1).isdigit():
                            im_values.append(float(v_str))
                except Exception:
                    continue
                    
            if im_values:
                student_records.append({
                    "id": reg_val,
                    "name": name_val if name_val.upper() != "NAN" else f"Student {reg_val}",
                    "marks": im_values
                })

    if not student_records:
        return {
            "summary": {
                "total_students": 0,
                "total_safe": 0,
                "total_medium_risk": 0,
                "total_high_risk": 0,
                "class_pass_rate": 0.0
            },
            "students": []
        }

    # Batch Feature Extraction & Prediction
    feature_rows = []
    student_meta = []
    
    for s in student_records:
        feat = compute_features(s["marks"])
        feature_rows.append({
            'Avg_Internal': feat["avg_internal"],
            'Min_Internal': feat["min_internal"],
            'Low_Internal_Count': feat["low_internal_count"]
        })
        student_meta.append((s["id"], s["name"]))

    df_batch = pd.DataFrame(feature_rows, columns=features)
    batch_probs = model.predict_proba(df_batch)

    students_out = []
    safe_count = 0
    med_count = 0
    high_count = 0

    for i, probs in enumerate(batch_probs):
        pass_prob = round(float(probs[0]) * 100, 2)
        fail_prob = round(float(probs[1]) * 100, 2)
        status = classify_risk(fail_prob)

        if status == "SAFE (PASS)":
            safe_count += 1
        elif status == "MEDIUM RISK":
            med_count += 1
        else:
            high_count += 1

        students_out.append({
            "student_id": student_meta[i][0],
            "student_name": student_meta[i][1],
            "avg_internal": feature_rows[i]["Avg_Internal"],
            "min_internal": feature_rows[i]["Min_Internal"],
            "low_internal_count": feature_rows[i]["Low_Internal_Count"],
            "pass_probability": pass_prob,
            "fail_probability": fail_prob,
            "risk_status": status
        })

    total_students = len(students_out)
    class_pass_rate = round((safe_count / total_students) * 100, 2) if total_students > 0 else 0.0

    return {
        "summary": {
            "total_students": total_students,
            "total_safe": safe_count,
            "total_medium_risk": med_count,
            "total_high_risk": high_count,
            "class_pass_rate": class_pass_rate
        },
        "students": students_out
    }
