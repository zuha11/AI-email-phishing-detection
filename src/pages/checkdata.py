import pandas as pd

CSV_PATH = r"C:\Users\pc\Desktop\machine learning\CEAS_08.csv"

df = pd.read_csv(CSV_PATH, encoding="latin-1")

print("Shape:", df.shape)
print("Columns:", df.columns.tolist())
print()
print("Label value counts:")
print(df["label"].value_counts(dropna=False))