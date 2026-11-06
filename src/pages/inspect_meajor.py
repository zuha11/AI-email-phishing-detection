import re
import numpy as np
import pandas as pd

from scipy.sparse import hstack
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC


# ============================================================
# CONFIG
# ============================================================

DATASET_FILE = r"C:\Users\pc\Downloads\AVN_Corpus_cleaned_v3.csv"

C_VALUE = 1.0
THRESHOLD = 0.06

# Model A = current best CHAR_WB model
# Model B = independent word-only model

# Ensemble weights tested on validation data
ENSEMBLE_WEIGHTS = [
    0.0,
    0.1,
    0.2,
    0.3,
    0.4,
    0.5,
    0.6,
    0.7,
    0.8,
    0.9,
    1.0,
]


# ============================================================
# TEXT HELPERS
# ============================================================

def safe_text(value):
    if pd.isna(value):
        return ""
    return str(value)


def extract_urls(text):
    text = safe_text(text)

    return re.findall(
        r'https?://[^\s<>"\']+|www\.[^\s<>"\']+',
        text,
        flags=re.IGNORECASE
    )


def build_phishing_text(subject, body, sender, urls=""):
    subject = safe_text(subject)
    body = safe_text(body)
    sender = safe_text(sender)
    urls = safe_text(urls)

    if not urls.strip():
        urls = " ".join(extract_urls(body))

    sender_domain = ""

    if "@" in sender:
        sender_domain = (
            sender.lower()
            .split("@", 1)[-1]
            .split()[0]
        )

        sender_domain = re.sub(
            r"[^a-z0-9]+",
            "_",
            sender_domain
        ).strip("_")

    return (
        (subject + " ") * 2
        + (sender + " ") * 2
        + body
        + " "
        + urls
        + " "
        + ("senderdomain_" + sender_domain + " ") * 3
    ).lower()


# ============================================================
# LOAD DATASET
# ============================================================

print("=" * 70)
print("POC3 - CHAR_WB + WORD ENSEMBLE EXPERIMENT")
print("=" * 70)

print("\nLoading AVN dataset...")

df = pd.read_csv(DATASET_FILE)

print(
    "Original shape:",
    df.shape
)


# ============================================================
# DUPLICATE CLEANING
# ============================================================

before = len(df)

df["_subject_clean"] = (
    df["subject"]
    .fillna("")
    .astype(str)
    .str.strip()
    .str.lower()
)

df["_body_clean"] = (
    df["body"]
    .fillna("")
    .astype(str)
    .str.strip()
    .str.lower()
)

df = df.drop_duplicates(
    subset=[
        "_subject_clean",
        "_body_clean"
    ]
).copy()

df = df.drop(
    columns=[
        "_subject_clean",
        "_body_clean"
    ]
)

print(
    "Duplicate rows removed:",
    before - len(df)
)

print(
    "Rows after cleaning:",
    len(df)
)


# ============================================================
# BUILD TEXT
# ============================================================

print("\nBuilding phishing text...")

df["phishing_text"] = df.apply(
    lambda row: build_phishing_text(
        row.get("subject", ""),
        row.get("body", ""),
        row.get("sender", ""),
        row.get("urls", "")
    ),
    axis=1
)

X = df["phishing_text"]
y = df["label"].astype(int)


# ============================================================
# EXACT SAME TEST SPLIT
# ============================================================

X_temp, X_test, y_temp, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

# Internal validation split
X_train, X_val, y_train, y_val = train_test_split(
    X_temp,
    y_temp,
    test_size=0.20,
    random_state=42,
    stratify=y_temp
)

print(
    "\nTrain size  :",
    len(X_train)
)

print(
    "Validation size:",
    len(X_val)
)

print(
    "Final test size:",
    len(X_test)
)


# ============================================================
# MODEL A
# CURRENT BEST: WORD + CHAR_WB
# ============================================================

print("\n")
print("=" * 70)
print("MODEL A - CURRENT CHAR_WB BASELINE")
print("=" * 70)

print("\nCreating word TF-IDF for Model A...")

word_vectorizer_A = TfidfVectorizer(
    lowercase=True,
    ngram_range=(1, 2),
    max_features=60000,
    min_df=2,
    max_df=0.98,
    sublinear_tf=True
)

A_train_word = word_vectorizer_A.fit_transform(
    X_train
)

A_val_word = word_vectorizer_A.transform(
    X_val
)

A_test_word = word_vectorizer_A.transform(
    X_test
)

print(
    "Model A word features:",
    A_train_word.shape[1]
)


print("\nCreating CHAR_WB TF-IDF for Model A...")

char_vectorizer_A = TfidfVectorizer(
    analyzer="char_wb",
    lowercase=True,
    ngram_range=(3, 5),
    max_features=40000,
    min_df=2,
    sublinear_tf=True
)

A_train_char = char_vectorizer_A.fit_transform(
    X_train
)

A_val_char = char_vectorizer_A.transform(
    X_val
)

A_test_char = char_vectorizer_A.transform(
    X_test
)

print(
    "Model A CHAR_WB features:",
    A_train_char.shape[1]
)


A_train = hstack(
    [
        A_train_word,
        A_train_char
    ]
).tocsr()

A_val = hstack(
    [
        A_val_word,
        A_val_char
    ]
).tocsr()

A_test = hstack(
    [
        A_test_word,
        A_test_char
    ]
).tocsr()

print(
    "Model A final features:",
    A_train.shape[1]
)


model_A = LinearSVC(
    C=C_VALUE,
    class_weight={
        0: 1.2,
        1: 1.0
    },
    random_state=42
)

print("\nTraining Model A...")

model_A.fit(
    A_train,
    y_train
)


# ============================================================
# MODEL B
# INDEPENDENT WORD-ONLY MODEL
# ============================================================

print("\n")
print("=" * 70)
print("MODEL B - INDEPENDENT WORD MODEL")
print("=" * 70)

word_vectorizer_B = TfidfVectorizer(
    lowercase=True,
    ngram_range=(1, 3),
    max_features=100000,
    min_df=2,
    max_df=0.98,
    sublinear_tf=True
)

B_train = word_vectorizer_B.fit_transform(
    X_train
)

B_val = word_vectorizer_B.transform(
    X_val
)

B_test = word_vectorizer_B.transform(
    X_test
)

print(
    "Model B features:",
    B_train.shape[1]
)


model_B = LinearSVC(
    C=0.5,
    class_weight={
        0: 1.2,
        1: 1.0
    },
    random_state=42
)

print("\nTraining Model B...")

model_B.fit(
    B_train,
    y_train
)


# ============================================================
# GET DECISION SCORES
# ============================================================

print("\n")
print("=" * 70)
print("GENERATING MODEL SCORES")
print("=" * 70)

A_val_scores = model_A.decision_function(
    A_val
)

A_test_scores = model_A.decision_function(
    A_test
)

B_val_scores = model_B.decision_function(
    B_val
)

B_test_scores = model_B.decision_function(
    B_test
)


# ============================================================
# SCORE NORMALIZATION
# ============================================================
#
# The two SVMs have different score scales.
# Normalize each model using its validation-set mean/std
# before combining them.
# ============================================================

A_mean = A_val_scores.mean()
A_std = A_val_scores.std()

B_mean = B_val_scores.mean()
B_std = B_val_scores.std()

if A_std == 0:
    A_std = 1.0

if B_std == 0:
    B_std = 1.0


A_val_norm = (
    A_val_scores - A_mean
) / A_std

B_val_norm = (
    B_val_scores - B_mean
) / B_std

A_test_norm = (
    A_test_scores - A_mean
) / A_std

B_test_norm = (
    B_test_scores - B_mean
) / B_std


# ============================================================
# VALIDATION ENSEMBLE SEARCH
# ============================================================

print("\n")
print("=" * 70)
print("SEARCHING ENSEMBLE WEIGHT ON VALIDATION SET")
print("=" * 70)

validation_results = []

actual_val = y_val.to_numpy()

for weight_A in ENSEMBLE_WEIGHTS:

    weight_B = 1.0 - weight_A

    combined_val_scores = (
        weight_A * A_val_norm
        + weight_B * B_val_norm
    )

    val_predictions = (
        combined_val_scores >= 0
    ).astype(int)

    errors = int(
        (
            val_predictions
            != actual_val
        ).sum()
    )

    fp = int(
        (
            (val_predictions == 1)
            & (actual_val == 0)
        ).sum()
    )

    fn = int(
        (
            (val_predictions == 0)
            & (actual_val == 1)
        ).sum()
    )

    accuracy = (
        (len(actual_val) - errors)
        / len(actual_val)
        * 100
    )

    validation_results.append(
        {
            "weight_A": weight_A,
            "weight_B": weight_B,
            "errors": errors,
            "fp": fp,
            "fn": fn,
            "accuracy": accuracy
        }
    )


validation_df = pd.DataFrame(
    validation_results
)

print(
    validation_df.to_string(
        index=False,
        formatters={
            "accuracy": "{:.4f}".format
        }
    )
)


# ============================================================
# SELECT BEST ENSEMBLE FROM VALIDATION ONLY
# ============================================================

best_validation = validation_df.loc[
    validation_df["errors"].idxmin()
]

best_A_weight = float(
    best_validation["weight_A"]
)

best_B_weight = float(
    best_validation["weight_B"]
)

print("\n")
print("=" * 70)
print("BEST VALIDATION ENSEMBLE")
print("=" * 70)

print(
    f"Model A weight: {best_A_weight:.1f}"
)

print(
    f"Model B weight: {best_B_weight:.1f}"
)

print(
    f"Validation errors: "
    f"{int(best_validation['errors'])}"
)


# ============================================================
# FINAL TEST
# ============================================================

print("\n")
print("=" * 70)
print("FINAL AVN TEST")
print("=" * 70)

combined_test_scores = (
    best_A_weight * A_test_norm
    + best_B_weight * B_test_norm
)

actual_test = y_test.to_numpy()

# Ensemble score is centered around zero,
# so zero is the ensemble decision boundary.
final_predictions = (
    combined_test_scores >= 0
).astype(int)

errors = int(
    (
        final_predictions
        != actual_test
    ).sum()
)

false_positive = int(
    (
        (final_predictions == 1)
        & (actual_test == 0)
    ).sum()
)

false_negative = int(
    (
        (final_predictions == 0)
        & (actual_test == 1)
    ).sum()
)

accuracy = (
    (len(actual_test) - errors)
    / len(actual_test)
    * 100
)


# ============================================================
# RESULT
# ============================================================

print("\n")
print("=" * 70)
print("ENSEMBLE EXPERIMENT RESULT")
print("=" * 70)

print(
    f"Model A weight  : {best_A_weight:.1f}"
)

print(
    f"Model B weight  : {best_B_weight:.1f}"
)

print(
    f"Errors          : {errors}"
)

print(
    f"False Positives : {false_positive}"
)

print(
    f"False Negatives : {false_negative}"
)

print(
    f"Accuracy        : {accuracy:.4f}%"
)

print("\nCurrent CHAR_WB baseline:")
print("Errors          : 31")
print("False Positives : 12")
print("False Negatives : 19")
print("Accuracy        : 99.7100%")

difference = errors - 31

print(
    f"\nDifference from baseline: "
    f"{difference:+d} errors"
)

if errors < 31:
    print(
        "\n🔥 IMPROVEMENT FOUND!"
    )
elif errors == 31:
    print(
        "\nNo improvement. Same error count."
    )
else:
    print(
        "\nNo improvement. Baseline remains better."
    )

print(
    "\nExperiment complete."
)