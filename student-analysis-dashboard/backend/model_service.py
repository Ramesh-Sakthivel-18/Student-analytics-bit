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
    
    valid_marks = []
    for m in internal_marks:
        try:
            val = float(m)
            if not np.isnan(val):
                valid_marks.append(val)
        except (ValueError, TypeError):
            continue
            
    if valid_marks and max(valid_marks) <= 25.0:
        valid_marks = [m * 2.0 for m in valid_marks]
        
    feat_dict = compute_features(valid_marks)
    
    # Construct input dataframe matching exact feature names
    df_features = pd.DataFrame([{
        'Avg_Internal': feat_dict["avg_internal"],
        'Min_Internal': feat_dict["min_internal"],
        'Low_Internal_Count': feat_dict["low_internal_count"]
    }], columns=['Avg_Internal', 'Min_Internal', 'Low_Internal_Count'])

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
    extracts internal marks per student, scales if necessary,
    and computes batch predictions aligned with XGBoost features.
    """
    model, features = load_model_if_needed()
    
    df_raw = pd.read_excel(io.BytesIO(file_bytes), header=None)
    
    im_cols = []
    reg_col = None
    name_col = None
    start_row = -1
    
    # Fix 1: Dynamic Multi-Row Header Search
    for i, row in df_raw.iterrows():
        row_str = row.astype(str).str.strip().str.upper().values
        if 'IM' in row_str or 'EM' in row_str or 'TOTAL' in row_str:
            im_cols = [j for j, val in enumerate(row_str) if val == 'IM']
            
            if im_cols:
                start_row = i + 1
                
                # Check for REG / NAME in the current row and the row above
                search_rows = [(i, row_str)]
                if i > 0:
                    search_rows.insert(0, (i - 1, df_raw.iloc[i-1].astype(str).str.strip().str.upper().values))
                
                for r_idx, r_vals in search_rows:
                    for j, val in enumerate(r_vals):
                        v_str = str(val).strip().upper()
                        if ("REGISTER" in v_str or "REG" in v_str or "ROLL" in v_str) and reg_col is None:
                            reg_col = j
                        if ("NAME" in v_str) and name_col is None:
                            name_col = j
                break

    student_records = []
    
    # Fix 2: Robust Row & Mark Extraction
    if im_cols:
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
        # Fallback for simple table format without 'IM' markers
        h_idx = 0
        for i in range(min(5, len(df_raw))):
            row_vals = [str(x).strip().upper() for x in df_raw.iloc[i]]
            if any("NAME" in x or "REGISTER" in x or "REG" in x or "MARK" in x for x in row_vals):
                h_idx = i
                break
                
        df_simple = pd.read_excel(io.BytesIO(file_bytes), header=h_idx).dropna(how="all")
        
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
                        v_str = str(val).strip().upper()
                        if v_str.replace('.', '', 1).isdigit():
                            im_values.append(float(v_str))
                        elif v_str in ['AB', 'U', '-', 'W', 'NAN', '']:
                            im_values.append(0.0)
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

    # Fix 3: Dynamic Scale Detection & Normalization
    all_marks = [m for s in student_records for m in s["marks"]]
    max_mark = max(all_marks) if all_marks else 0
    scale_factor = 2.0 if (0 < max_mark <= 25.0) else 1.0

    # Batch Feature Extraction & Prediction
    feature_rows = []
    student_meta = []
    
    for s in student_records:
        scaled_marks = [m * scale_factor for m in s["marks"]]
        feat = compute_features(scaled_marks)
        feature_rows.append({
            'Avg_Internal': feat["avg_internal"],
            'Min_Internal': feat_dict["min_internal"] if 'feat_dict' in locals() else feat["min_internal"],
            'Low_Internal_Count': feat["low_internal_count"]
        })
        student_meta.append((s["id"], s["name"]))

    # Fix 4: Feature Order Alignment for predict_proba
    df_batch = pd.DataFrame(feature_rows, columns=['Avg_Internal', 'Min_Internal', 'Low_Internal_Count'])
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
