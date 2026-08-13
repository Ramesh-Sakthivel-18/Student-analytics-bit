import os
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# ==========================================
# 1. Configuration & Paths
# ==========================================
DATASET_DIR = r"D:\ramesh\student analysis\dataset\UG"
OUTPUT_DIR = r"D:\ramesh\student analysis\training\model\new"

os.makedirs(OUTPUT_DIR, exist_ok=True)
MODEL_PATH = os.path.join(OUTPUT_DIR, "xgboost_probability_model.joblib")
FEATURES_PATH = os.path.join(OUTPUT_DIR, "prob_features.joblib")

# ==========================================
# 2. Helper Functions
# ==========================================
def get_subject_total(max_score):
    if max_score > 50:
        return 60.0
    elif max_score >= 40:
        return 50.0
    else:
        return 40.0

def parse_excel_file(filepath):
    """Parses a single college Excel sheet using the tested robust extraction."""
    try:
        df_raw = pd.read_excel(filepath, header=None)
    except Exception as e:
        print(f"   [!] Error reading file: {e}")
        return []

    # 1. Locate the 'IM' sub-header
    sub_header_idx = -1
    im_cols = []
    for i in range(min(10, len(df_raw))):
        row_str = df_raw.iloc[i].astype(str).str.strip().str.upper().values
        if 'IM' in row_str:
            sub_header_idx = i
            im_cols = [j for j, val in enumerate(row_str) if val == 'IM']
            break

    # 2. Locate 'RESULT' or 'GPA' column (Must be an exact match and NOT in first few columns)
    result_col = -1
    for i in range(min(10, len(df_raw))):
        row_str = df_raw.iloc[i].astype(str).str.strip().str.upper().values
        for j, val in enumerate(row_str):
            if val in ['RESULT', 'RES', 'GPA'] and j > 2:
                result_col = j
                break
        if result_col != -1:
            break

    if sub_header_idx == -1 or result_col == -1 or not im_cols:
        return []

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

    # 4. Extract Student Data and Normalize
    student_records = []
    for i in range(sub_header_idx + 1, len(df_raw)):
        row = df_raw.iloc[i]
        reg_no = str(row[0]).strip()
        
        if pd.isna(row[0]) or reg_no == '' or reg_no.lower() == 'nan':
            continue

        normalized_pcts = []
        
        for col in im_cols:
            val = str(row[col]).strip().upper()
            
            # IGNORE hyphens and blanks completely
            if val in ['-', '', 'NAN', 'N/A']:
                continue
                
            subject_total = col_totals[col]
            
            if val.replace('.', '', 1).isdigit():
                raw_score = min(float(val), subject_total) # Cap at subject total
                pct = (raw_score / subject_total) * 100.0
                normalized_pcts.append(pct)
            elif val in ['AB', 'U', 'W', 'FAIL', 'NC']: # Only true fails/absents get 0.0
                normalized_pcts.append(0.0)

        if not normalized_pcts:
            continue

        # Calculate features
        avg_im_pct = np.mean(normalized_pcts)
        min_im_pct = np.min(normalized_pcts)
        low_count = sum(1 for x in normalized_pcts if x < 50.0)

        # Parse Result for Target Label (1 = Fail/RA, 0 = Pass)
        result_val = str(row[result_col]).strip().upper()
        if result_val in ['RA', 'U', 'FAIL', 'W', 'WH', '0', '0.0']:
            target_label = 1
        elif result_val in ['P', 'PASS', 'S', 'SAFE'] or result_val.replace('.', '', 1).isdigit():
            target_label = 0
        else:
            continue

        student_records.append({
            'Avg_Internal_Pct': avg_im_pct,
            'Min_Internal_Pct': min_im_pct,
            'Low_Internal_Count': low_count,
            'Target': target_label
        })

    return student_records

# ==========================================
# 3. Main Execution Pipeline
# ==========================================
def train_model():
    print("--- Starting Master Dataset Processing ---")
    
    all_data = []
    
    # Walk through all directories inside UG
    for root, dirs, files in os.walk(DATASET_DIR):
        for file in files:
            if file.endswith(".xlsx") and not file.startswith("~$"):
                filepath = os.path.join(root, file)
                print(f"[*] Parsing: {filepath}")
                records = parse_excel_file(filepath)
                if records:
                    print(f"    [+] Extracted {len(records)} valid records.")
                else:
                    print(f"    [-] Skipped or no valid data found.")
                all_data.extend(records)
                
    if not all_data:
        print("\n[!] No valid student data extracted.")
        return

    # Convert to DataFrame
    df = pd.DataFrame(all_data)
    print(f"\n[+] Total Student Records Extracted Across All Departments: {len(df)}")
    
    feature_cols = ['Avg_Internal_Pct', 'Min_Internal_Pct', 'Low_Internal_Count']
    X = df[feature_cols]
    y = df['Target']

    print(f"[-] Target Distribution (0=Pass, 1=Fail): \n{y.value_counts()}")

    # Calculate scale_pos_weight to balance classes if failures are rare
    num_pass = len(y[y == 0])
    num_fail = len(y[y == 1])
    # Change this line in train_new.py:
    imbalance_ratio = (num_pass / num_fail) * 0.35  # Sets scale_pos_weight to ~3.2 instead of 9.1

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("\n--- Training XGBoost Model on RTX 3060 GPU ---")
    
    # Initialize GPU-accelerated XGBoost
    model = XGBClassifier(
        tree_method='hist',      
        device='cuda',           
        max_depth=4,             
        learning_rate=0.05,
        n_estimators=200,
        scale_pos_weight=imbalance_ratio,
        eval_metric='logloss',
        random_state=42
    )

    # Train Model
    model.fit(X_train, y_train)
    print("[+] Training Complete.")

    # Evaluate Model
    y_pred = model.predict(X_test)
    print("\n--- Model Evaluation ---")
    print(f"Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["SAFE (PASS)", "HIGH RISK (FAIL)"]))

    # Save Model & Features
    joblib.dump(model, MODEL_PATH)
    joblib.dump(feature_cols, FEATURES_PATH)
    
    print(f"\n[SUCCESS] Model successfully saved to:\n -> {MODEL_PATH}")
    print(f" -> {FEATURES_PATH}")

if __name__ == "__main__":
    train_model()