import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model_service import parse_and_predict_excel

excel_path = r"D:\ramesh\student analysis\dataset\CSE NOV 2025\V\exp_provisionalreport(54).xlsx"

print(f"Reading dataset file: {excel_path}")
if os.path.exists(excel_path):
    with open(excel_path, "rb") as f:
        file_bytes = f.read()

    res = parse_and_predict_excel(file_bytes)
    print("\nBulk Batch Prediction Result Summary:")
    print("  Summary:", res["summary"])
    print(f"  Extracted {len(res['students'])} students.")
    if res["students"]:
        print("  Sample Student Prediction (First 2):")
        for s in res["students"][:2]:
            print("   ", s)
else:
    print(f"File not found: {excel_path}")
