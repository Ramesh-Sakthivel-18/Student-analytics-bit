import os
import pandas as pd
import numpy as np
import joblib

# ==========================================
# 1. Configuration & Paths
# ==========================================
TEST_FILE = r"D:\ramesh\student analysis\dataset\test\CD\V\CD-CONS-WO.xlsx"
MODEL_DIR = r"D:\ramesh\student analysis\training\model\new"
output_dir = r"D:\ramesh\student analysis\testing"

MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_probability_model.joblib")
FEATURES_PATH = os.path.join(MODEL_DIR, "prob_features.joblib")

# Output file path in the exact same folder as the test file
#OUTPUT_FOLDER = os.path.dirname(output_dir)
OUTPUT_EXCEL = os.path.join(output_dir, "CD-CONS-WO_Risk_Predictions.xlsx")

# ==========================================
# 2. Helper Functions
# ==========================================
def get_subject_total(max_score):
    """Assigns official exam total based on the highest score in the column."""
    if max_score > 50:
        return 60.0
    elif max_score >= 40:
        return 50.0
    else:
        return 40.0

def predict_test_file():
    print(f"--- Loading Trained Model from: {MODEL_PATH} ---")
    if not os.path.exists(MODEL_PATH) or not os.path.exists(FEATURES_PATH):
        print("[!] Error: Model or feature list file not found. Ensure train_new.py has run.")
        return

    model = joblib.load(MODEL_PATH)
    feature_cols = joblib.load(FEATURES_PATH)
    print(f"[+] Loaded Model Features: {feature_cols}")

    print(f"\n--- Processing Test Excel File: {TEST_FILE} ---")
    try:
        df_raw = pd.read_excel(TEST_FILE, header=None)
    except Exception as e:
        print(f"[!] Error reading file: {e}")
        return

    # 1. Locate the 'IM' sub-header
    sub_header_idx = -1
    im_cols = []
    for i in range(min(10, len(df_raw))):
        row_str = df_raw.iloc[i].astype(str).str.strip().str.upper().values
        if 'IM' in row_str:
            sub_header_idx = i
            im_cols = [j for j, val in enumerate(row_str) if val == 'IM']
            break

    if sub_header_idx == -1 or not im_cols:
        print("[!] Error: Could not locate 'IM' columns in the test file.")
        return

    print(f"[*] Found {len(im_cols)} IM columns at Row Index {sub_header_idx}")

    # 2. Determine Max Marks for each IM Column
    col_max_scores = {}
    for col in im_cols:
        highest_score = 0.0
        for i in range(sub_header_idx + 1, len(df_raw)):
            val = str(df_raw.iloc[i, col]).strip().upper()
            if val.replace('.', '', 1).isdigit():
                score = float(val)
                if score > highest_score:
                    highest_score = score
        col_max_scores[col] = highest_score

    col_totals = {col: get_subject_total(score) for col, score in col_max_scores.items()}

    print("[*] Column Totals Auto-Detected:")
    for col, total in col_totals.items():
        print(f"    - Column {col}: Max Score = {col_max_scores[col]} -> Benchmark Total = {total}")

    # 3. Extract Student Data & Normalize
    output_rows = []
    features_list = []

    for i in range(sub_header_idx + 1, len(df_raw)):
        row = df_raw.iloc[i]
        reg_no = str(row[0]).strip()
        student_name = str(row[1]).strip() if pd.notna(row[1]) else "N/A"

        if pd.isna(row[0]) or reg_no == '' or reg_no.lower() == 'nan':
            continue

        normalized_pcts = []
        
        for col in im_cols:
            val = str(row[col]).strip().upper()
            
            # Ignore hyphens and empty cells completely
            if val in ['-', '', 'NAN', 'N/A']:
                continue
                
            subject_total = col_totals[col]
            
            if val.replace('.', '', 1).isdigit():
                raw_score = min(float(val), subject_total)
                pct = (raw_score / subject_total) * 100.0
                normalized_pcts.append(pct)
            elif val in ['AB', 'U', 'W', 'FAIL', 'NC']:
                normalized_pcts.append(0.0)

        if not normalized_pcts:
            continue

        # Extract features
        avg_im_pct = np.mean(normalized_pcts)
        min_im_pct = np.min(normalized_pcts)
        low_count = sum(1 for x in normalized_pcts if x < 50.0)

        features_list.append({
            'Avg_Internal_Pct': avg_im_pct,
            'Min_Internal_Pct': min_im_pct,
            'Low_Internal_Count': low_count
        })

        output_rows.append({
            'Register_No': reg_no,
            'Student_Name': student_name,
            'Total_Subjects_Evaluated': len(normalized_pcts),
            'Avg_Internal_Pct': round(avg_im_pct, 2),
            'Min_Internal_Pct': round(min_im_pct, 2),
            'Low_Internal_Count': low_count
        })

    if not output_rows:
        print("[!] No student records extracted for prediction.")
        return

    # 4. Run Model Prediction
    df_features = pd.DataFrame(features_list)[feature_cols]
    
    # Get probability of failure (Class 1)
    fail_probabilities = model.predict_proba(df_features)[:, 1] * 100.0
    predictions = model.predict(df_features)

    # 5. Populate Final Results Table
    for idx, row_dict in enumerate(output_rows):
        fail_prob = fail_probabilities[idx]
        pred_class = predictions[idx]

        row_dict['Failure_Probability_%'] = round(fail_prob, 2)
        
        # Risk Categorization
        if fail_prob >= 50.0:
            row_dict['Risk_Status'] = 'HIGH RISK (FAIL)'
        elif fail_prob >= 25.0:
            row_dict['Risk_Status'] = 'MEDIUM RISK (WARNING)'
        else:
            row_dict['Risk_Status'] = 'SAFE (PASS)'

    df_result = pd.DataFrame(output_rows)

    # 6. Save Predictions to Excel in the same directory
    df_result.to_excel(OUTPUT_EXCEL, index=False)
    
    print("\n==========================================")
    print(f"[SUCCESS] Predictions successfully generated!")
    print(f"Output File Saved To: {OUTPUT_EXCEL}")
    print("==========================================")
    print("\nSummary of Predictions:")
    print(df_result['Risk_Status'].value_counts())
    print("\nTop 5 High-Risk Students Flagged:")
    high_risk_df = df_result[df_result['Risk_Status'] == 'HIGH RISK (FAIL)']
    if not high_risk_df.empty:
        print(high_risk_df[['Register_No', 'Student_Name', 'Avg_Internal_Pct', 'Low_Internal_Count', 'Failure_Probability_%']].head())
    else:
        print("No high-risk students flagged in this file.")

if __name__ == "__main__":
    predict_test_file()