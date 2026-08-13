import pandas as pd
import numpy as np

# ==========================================
# 1. Target Test File (Change this to any one of your files to test)
# ==========================================
TEST_FILE = r"D:\ramesh\student analysis\dataset\UG\AD\V\AD-CONS-WO.xlsx"

def get_subject_total(max_score):
    if max_score > 50: return 60.0
    elif max_score >= 40: return 50.0
    else: return 40.0

def test_extraction():
    print(f"--- Testing Extraction on: {TEST_FILE} ---\n")
    
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

    # 2. Locate 'RESULT' or 'GPA' column (FIXED: Must be an exact match and NOT in columns 0, 1, or 2)
    result_col = -1
    for i in range(min(10, len(df_raw))):
        row_str = df_raw.iloc[i].astype(str).str.strip().str.upper().values
        for j, val in enumerate(row_str):
            # Look for exact column headers, ignoring big document titles in the first few columns
            if val in ['RESULT', 'RES', 'GPA'] and j > 2:
                result_col = j
                break
        if result_col != -1:
            break

    print(f"[*] Found 'IM' Row Index: {sub_header_idx}")
    print(f"[*] Found 'IM' Columns: {im_cols}")
    print(f"[*] Found 'Result/GPA' Column Index: {result_col}")
    
    if result_col == -1 or not im_cols:
        print("\n[!] Failed to find required columns. Exiting.")
        return

    # 3. Determine Max Marks for each IM Column
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
    
    print("\n[*] Detected Subject Totals based on Max Column Scores:")
    for col, highest in col_max_scores.items():
        print(f"    - Column {col}: Max Score = {highest} -> Set Total to {col_totals[col]}")

    print("\n--- Extracting First 5 Students ---")
    
    # 4. Extract Student Data and Normalize
    valid_students_found = 0
    
    for i in range(sub_header_idx + 1, len(df_raw)):
        row = df_raw.iloc[i]
        reg_no = str(row[0]).strip()
        
        if pd.isna(row[0]) or reg_no == '' or reg_no.lower() == 'nan':
            continue

        normalized_pcts = []
        raw_marks_extracted = []
        
        for col in im_cols:
            val = str(row[col]).strip().upper()
            
            if val in ['-', '', 'NAN', 'N/A']:
                continue
                
            subject_total = col_totals[col]
            
            if val.replace('.', '', 1).isdigit():
                raw_score = min(float(val), subject_total)
                pct = (raw_score / subject_total) * 100.0
                normalized_pcts.append(pct)
                raw_marks_extracted.append(f"{raw_score}/{subject_total}")
            elif val in ['AB', 'U', 'W', 'FAIL', 'NC']:
                normalized_pcts.append(0.0)
                raw_marks_extracted.append(f"{val}(0.0)/{subject_total}")

        if not normalized_pcts:
            continue

        # Parse Result
        result_val = str(row[result_col]).strip().upper()
        target_label = -1
        if result_val in ['RA', 'U', 'FAIL', 'W', 'WH', '0', '0.0']:
            target_label = 1 # Fail
        elif result_val in ['P', 'PASS', 'S', 'SAFE'] or result_val.replace('.', '', 1).isdigit():
            target_label = 0 # Pass (or numeric GPA means pass)

        if target_label != -1:
            valid_students_found += 1
            
            # Print the detailed breakdown for the first 5 students to prove it works
            if valid_students_found <= 5:
                print(f"\nStudent {valid_students_found}: {reg_no}")
                print(f"  Raw Marks Extracted : {raw_marks_extracted}")
                print(f"  Normalized Pcts (%) : {[round(p, 1) for p in normalized_pcts]}")
                print(f"  Features            : Avg={round(np.mean(normalized_pcts), 1)}%, Min={round(np.min(normalized_pcts), 1)}%, Low Count={sum(1 for x in normalized_pcts if x < 50.0)}")
                print(f"  Target Label        : {result_val} -> {'FAIL (1)' if target_label == 1 else 'PASS (0)'}")

    print(f"\n[SUCCESS] Total valid students successfully extracted from this file: {valid_students_found}")

if __name__ == "__main__":
    test_extraction()