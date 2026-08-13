import os
import pandas as pd
import numpy as np
import joblib

# ==========================================
# 1. Configuration & Paths
# ==========================================
TEST_FILE = r"D:\ramesh\student analysis\dataset\UG\IT\V\IT-CONS-WO.xlsx"
OUTPUT_DIR = r"D:\ramesh\student analysis\testing"
MODEL_PATH = r"D:\ramesh\student analysis\training\model\xgboost_probability_model.joblib"
FEATURES_PATH = r"D:\ramesh\student analysis\training\model\prob_features.joblib"

def run_test():
    print("--- Starting Standalone Model Test ---")
    
    # 1. Load Model & Features
    try:
        model = joblib.load(MODEL_PATH)
        feature_cols = joblib.load(FEATURES_PATH)
        print(f"[*] Successfully loaded model and features: {feature_cols}")
    except Exception as e:
        print(f"[!] Error loading model: {e}")
        return

    # 2. Read Raw Excel File
    print(f"[*] Reading test file: {TEST_FILE}")
    try:
        df_raw = pd.read_excel(TEST_FILE, header=None)
    except Exception as e:
        print(f"[!] Error reading Excel file: {e}")
        return

    # 3. Locate the 'IM' sub-header dynamically
    sub_header_idx = -1
    for i, row in df_raw.iterrows():
        row_str = row.astype(str).str.strip().str.upper().values
        if 'IM' in row_str:
            sub_header_idx = i
            break
            
    if sub_header_idx == -1:
        print("[!] Could not find the 'IM' (Internal Marks) row in the Excel sheet.")
        return
        
    print(f"[*] Found 'IM' header at row index {sub_header_idx}")
    
    # Get exact column indexes that contain 'IM'
    im_cols = [j for j, val in enumerate(df_raw.iloc[sub_header_idx]) if str(val).strip().upper() == 'IM']
    print(f"[*] Extracting marks from column indices: {im_cols}")

    # 4. Extract data and find max mark for scaling
    students_data = []
    max_im_global = 0.0

    for i in range(sub_header_idx + 1, len(df_raw)):
        row = df_raw.iloc[i]
        reg_no = str(row[0]).strip()
        name = str(row[1]).strip()
        
        # Skip empty rows or generic text
        if pd.isna(row[0]) or reg_no == '' or reg_no.lower() == 'nan':
            continue
            
        im_values = []
        for col in im_cols:
            val = str(row[col]).strip().upper()
            
            # --- THE FIX IS HERE ---
            if val.replace('.', '', 1).isdigit():
                im_values.append(float(val))
            elif val in ['AB', 'U', 'W']: # ONLY true fails/absents get 0.0
                im_values.append(0.0)
            # Hyphens ('-') and empty cells ('', 'NAN') are completely ignored
                
        if not im_values:
            continue
            
        current_max = max(im_values) if im_values else 0.0
        max_im_global = max(max_im_global, current_max)
        
        students_data.append({
            'reg_no': reg_no,
            'name': name,
            'im_values': im_values
        })

    # 5. Apply the scaling rule (if marks are out of 25, multiply by 2)
    scale_factor = 2.0 if 0 < max_im_global <= 25 else 1.0
    print(f"[*] Global Max Internal Mark found: {max_im_global}")
    print(f"[*] Applying Scale Factor: x{scale_factor}")

    # 6. Process features and predict
    results = []
    for student in students_data:
        # Apply scaling
        scaled_ims = [x * scale_factor for x in student['im_values']]
        
        # Calculate features matching model training
        avg_im = np.mean(scaled_ims)
        min_im = np.min(scaled_ims)
        low_count = sum(1 for x in scaled_ims if x < 25.0)
        
        # Predict
        X_test = pd.DataFrame([[avg_im, min_im, low_count]], columns=feature_cols)
        probs = model.predict_proba(X_test)[0]
        
        pass_prob = round(probs[0] * 100, 2)
        fail_prob = round(probs[1] * 100, 2)
        
        # Status Labeling
        if fail_prob >= 50.0:
            risk = "HIGH RISK (FAIL)"
        elif fail_prob >= 25.0:
            risk = "MEDIUM RISK"
        else:
            risk = "SAFE (PASS)"
            
        results.append({
            'Register Number': student['reg_no'],
            'Student Name': student['name'],
            'Raw Extracted Marks': str(student['im_values']),
            'Scaled Avg IM (/50)': round(avg_im, 2),
            'Scaled Min IM (/50)': round(min_im, 2),
            'Danger Subjects (<25)': low_count,
            'Pass Probability (%)': pass_prob,
            'Fail Probability (%)': fail_prob,
            'Risk Status': risk
        })
        
    # 7. Save results to a new Excel file
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_file = os.path.join(OUTPUT_DIR, "Model_Predictions_Output.xlsx")
    out_df = pd.DataFrame(results)
    
    out_df.to_excel(out_file, index=False)
    print(f"\n[SUCCESS] Processed {len(results)} students.")
    print(f"[SUCCESS] Test results successfully saved to:\n -> {out_file}")

if __name__ == "__main__":
    run_test()