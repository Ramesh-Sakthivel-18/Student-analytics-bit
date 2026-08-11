import pandas as pd
import sys

def explore_excel(file_path):
    print(f"Reading {file_path}")
    try:
        df = pd.read_excel(file_path, header=None)
        print("Row 0:", df.iloc[0].values)
        print("Row 1:", df.iloc[1].values)
        print("Row 2:", df.iloc[2].values)
        print("Row 3:", df.iloc[3].values)
        print("Row 4:", df.iloc[4].values)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    explore_excel(sys.argv[1])
