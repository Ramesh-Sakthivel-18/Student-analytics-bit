import os
import glob
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import numpy as np

# ==========================================
# 1. Configuration & Paths
# ==========================================
DATA_BASE_DIR = r"D:\ramesh\student analysis\dataset\CSE NOV 2025"
MODEL_SAVE_DIR = r"D:\ramesh\student analysis\training\model"
MODEL_SAVE_PATH = os.path.join(MODEL_SAVE_DIR, "xgboost_model.joblib")

# Updated based on your Excel snippet
TARGET_COLUMN = "GPA" 

def load_data(base_dir):
    """Finds Excel files and dynamically locates the correct header row."""
    print("[1/5] Searching for Excel files...")
    
    search_pattern = os.path.join(base_dir, "**", "*.xlsx")
    excel_files = glob.glob(search_pattern, recursive=True)
    
    if not excel_files:
        raise FileNotFoundError(f"No Excel files found in {base_dir}")
        
    dataframes = []
    for file in excel_files:
        print(f" -> Loading: {file}")
        try:
            temp_df = pd.read_excel(file, header=None)
            
            header_row_index = -1
            # Search row by row for the target column
            for i, row in temp_df.iterrows():
                row_values = row.astype(str).str.strip().str.upper().values
                if TARGET_COLUMN.upper() in row_values:
                    header_row_index = i
                    break
            
            if header_row_index == -1:
                print(f"    [Warning] Could not find '{TARGET_COLUMN}' in this file. Skipping.")
                continue
                
            # Read file using the found header row
            df = pd.read_excel(file, header=header_row_index)
            
            if str(df.iloc[0, 0]).strip() in ['IM', 'nan', 'NaN'] or pd.isna(df.iloc[0, 0]):
                df = df.iloc[1:].reset_index(drop=True)
            
            # Clean up column names
            df.columns = df.columns.astype(str).str.strip()
            
            dataframes.append(df)
            print(f"    Success! Found headers on row {header_row_index}.")
            
        except Exception as e:
            print(f"    [Error] reading {file}: {e}")
            
    if not dataframes:
        raise ValueError(f"Failed to load any valid data containing '{TARGET_COLUMN}'.")

    combined_df = pd.concat(dataframes, ignore_index=True)
    print(f"\nTotal valid records loaded: {len(combined_df)}")
    return combined_df

def preprocess_data(df):
    """Cleans data, handles hyphens, missing values, and separates features."""
    print("[2/5] Preprocessing data...")
    
    df[TARGET_COLUMN] = pd.to_numeric(df[TARGET_COLUMN], errors='coerce')
    df = df.dropna(subset=[TARGET_COLUMN])
    
    y = df[TARGET_COLUMN]
    X = df.drop(columns=[TARGET_COLUMN])
    
    X = X.replace(to_replace=[r'^-+$', 'AB', 'U', 'W'], value=np.nan, regex=True)
    X_numeric = X.apply(pd.to_numeric, errors='coerce')
    X_numeric = X_numeric.dropna(axis=1, how='all')
    X_numeric = X_numeric.fillna(0)
    
    print(f"Number of numeric features extracted: {len(X_numeric.columns)}")
    return X_numeric, y

def main():
    try:
        os.makedirs(MODEL_SAVE_DIR, exist_ok=True)

        # Step 1: Load Data
        df = load_data(DATA_BASE_DIR)
        
        # Step 2: Preprocess
        X, y = preprocess_data(df)
        
        if len(X) == 0:
            raise ValueError("No valid numeric data left after preprocessing!")

        # Step 3: Split into Training and Testing Sets
        print("[3/5] Splitting data into Train/Test sets...")
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Step 4: Initialize and Train XGBoost Model
        print("[4/5] Training XGBoost model on RTX 3060 (GPU)...")
        model = xgb.XGBRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=5,
            tree_method="hist",
            device="cuda",
            random_state=42
        )
        model.fit(X_train, y_train)
        
        # Step 5: Evaluate and Save
        print("[5/5] Evaluating model...")
        predictions = model.predict(X_test)
        
        # FIXED: Using np.sqrt instead of squared=False
        mae = mean_absolute_error(y_test, predictions)
        rmse = np.sqrt(mean_squared_error(y_test, predictions))
        r2 = r2_score(y_test, predictions)
        
        print("\n=== Model Performance ===")
        print(f"Mean Absolute Error (MAE): {mae:.4f}")
        print(f"Root Mean Squared Error (RMSE): {rmse:.4f}")
        print(f"R² Score: {r2:.4f}")
        print("=========================\n")
        
        joblib.dump(model, MODEL_SAVE_PATH)
        
        # Also save the feature names so we know exactly what the model expects during prediction later
        joblib.dump(list(X.columns), os.path.join(MODEL_SAVE_DIR, "model_features.joblib"))
        
        print(f"Model saved successfully to: {MODEL_SAVE_PATH}")

    except Exception as e:
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    main()