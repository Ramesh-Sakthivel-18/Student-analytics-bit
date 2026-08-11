import os
import glob
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

# ==========================================
# 1. Configuration & Paths
# ==========================================
DATA_BASE_DIR = r"D:\ramesh\student analysis\dataset\CSE NOV 2025"
MODEL_SAVE_DIR = r"D:\ramesh\student analysis\training\model"
MODEL_SAVE_PATH = os.path.join(MODEL_SAVE_DIR, "xgboost_probability_model.joblib")

def load_and_engineer_features(base_dir):
    """
    Parses complex college Excel sheets to extract universal features:
    Average Internals, Minimum Internals, and identifies if the student failed.
    """
    print("[1/5] Extracting universal features from Excel files...")
    search_pattern = os.path.join(base_dir, "**", "*.xlsx")
    excel_files = glob.glob(search_pattern, recursive=True)
    
    all_student_data = []
    
    for file in excel_files:
        try:
            # Read raw to find headers
            temp_df = pd.read_excel(file, header=None)
            
            header_idx = -1
            sub_header_idx = -1
            
            # Locate the main header (contains GPA) and sub-header (contains IM, EM, GRD)
            for i, row in temp_df.iterrows():
                row_str = row.astype(str).str.strip().str.upper().values
                if "GPA" in row_str:
                    header_idx = i
                if "IM" in row_str and "EM" in row_str:
                    sub_header_idx = i
                    break # Found both
            
            if header_idx == -1 or sub_header_idx == -1:
                continue
                
            # Now process the actual student rows
            # Columns containing 'IM'
            im_cols = [j for j, val in enumerate(temp_df.iloc[sub_header_idx]) if str(val).strip().upper() == 'IM']
            # Columns containing 'GRD' (Grades) to check for fails
            grd_cols = [j for j, val in enumerate(temp_df.iloc[sub_header_idx]) if str(val).strip().upper() == 'GRD']
            # GPA column index
            gpa_col = [j for j, val in enumerate(temp_df.iloc[header_idx]) if str(val).strip().upper() == 'GPA'][0]
            
            # Start reading student data below the sub-header
            for i in range(sub_header_idx + 1, len(temp_df)):
                row = temp_df.iloc[i]
                
                # Extract Internal Marks, handle hyphens/absents
                im_values = []
                for col in im_cols:
                    val = str(row[col]).strip().upper()
                    if val.replace('.','',1).isdigit(): # If it's a number
                        im_values.append(float(val))
                    elif val in ['AB', 'U', '-', 'W', 'NAN', '']: 
                        im_values.append(0.0) # Absent or missing is treated as 0
                
                if not im_values:
                    continue
                    
                # Engineer Features
                avg_im = np.mean(im_values)
                min_im = np.min(im_values)
                low_im_count = sum(1 for x in im_values if x < 25) # Assuming < 25 out of 40/50 is a risk
                
                # Define Target: Did they fail? (1 = Fail/Risk, 0 = Pass)
                # Check if they have a 'U' (Arrear) in any grade column, or GPA < 6.0
                is_fail = 0
                gpa_val = str(row[gpa_col]).strip()
                
                if gpa_val.replace('.','',1).isdigit() and float(gpa_val) < 6.0:
                    is_fail = 1
                    
                for col in grd_cols:
                    if str(row[col]).strip().upper() in ['U', 'RA', 'F']:
                        is_fail = 1
                        break
                
                all_student_data.append({
                    'Avg_Internal': avg_im,
                    'Min_Internal': min_im,
                    'Low_Internal_Count': low_im_count,
                    'Is_Fail': is_fail
                })
                
        except Exception as e:
            print(f"    [Error] processing {file}: {e}")
            
    df = pd.DataFrame(all_student_data)
    print(f"Total valid students extracted: {len(df)}")
    print(f"Number of 'At-Risk/Fail' students found: {df['Is_Fail'].sum()}")
    return df

def main():
    try:
        os.makedirs(MODEL_SAVE_DIR, exist_ok=True)
        
        # Step 1 & 2: Load and Feature Engineer
        df = load_and_engineer_features(DATA_BASE_DIR)
        
        if df.empty:
            raise ValueError("No data extracted. Check your Excel structures.")

        X = df[['Avg_Internal', 'Min_Internal', 'Low_Internal_Count']]
        y = df['Is_Fail']

        # Step 3: Train/Test Split
        print("\n[3/5] Splitting data into Train/Test sets...")
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # Balance weights because there are usually more passing students than failing students
        num_pass = (y_train == 0).sum()
        num_fail = (y_train == 1).sum()
        pos_weight = num_pass / max(num_fail, 1)

        # Step 4: Train XGBoost Classifier (Using GPU)
        print("[4/5] Training Probability Classifier on RTX 3060 (GPU)...")
        model = xgb.XGBClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=4,
            scale_pos_weight=pos_weight,
            tree_method="hist",
            device="cuda",
            random_state=42,
            eval_metric="logloss"
        )
        model.fit(X_train, y_train)
        
        # Step 5: Evaluate
        print("\n[5/5] Evaluating Fail Prediction Model...")
        preds = model.predict(X_test)
        
        print("\n=== CLASSIFICATION REPORT ===")
        print(classification_report(y_test, preds, target_names=['Will Pass (0)', 'Will Fail (1)']))
        print(f"Overall Accuracy: {accuracy_score(y_test, preds) * 100:.2f}%")
        
        # Test the Probability logic on a sample student
        sample_probs = model.predict_proba(X_test.iloc[[0]])
        print("\n=== PROBABILITY ENGINE TEST (First Test Student) ===")
        print(f"Student Features: Avg IM={X_test.iloc[0]['Avg_Internal']:.1f}, Min IM={X_test.iloc[0]['Min_Internal']:.1f}")
        print(f"Pass Probability: {sample_probs[0][0]*100:.1f}%")
        print(f"Fail Probability: {sample_probs[0][1]*100:.1f}%")
        
        # Save Model
        joblib.dump(model, MODEL_SAVE_PATH)
        joblib.dump(list(X.columns), os.path.join(MODEL_SAVE_DIR, "prob_features.joblib"))
        print(f"\nModel saved successfully to: {MODEL_SAVE_PATH}")

    except Exception as e:
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    main()