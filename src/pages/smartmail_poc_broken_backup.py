
    with open(
        ERROR_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        f.write(
            "=" * 80 + "\n"
        )

        f.write(
            "SMARTMAIL POC 4 - ERROR ANALYSIS\n"
        )

        f.write(
            "=" * 80 + "\n\n"
        )

        f.write(
            f"Total test emails: {len(test_idx)}\n"
        )

        f.write(
            f"Correct primary predictions: "
            f"{correct_count}\n"
        )

        f.write(
            f"Incorrect primary predictions: "
            f"{incorrect_count}\n"
        )

        f.write(
            f"Primary membership accuracy: "
            f"{primary_accuracy:.2f}%\n"
        )

        f.write("\n")

        f.write(
            "=" * 80 + "\n"
        )

        f.write(
            "INCORRECT PREDICTIONS\n"
        )

        f.write(
            "=" * 80 + "\n\n"
        )


        for error in error_details:

            f.write(
                f"ERROR #{error['number']}\n\n"
            )

            f.write(
                "Subject:\n"
            )

            f.write(
                str(error["subject"]) + "\n\n"
            )

            body_text = str(error.get("body", "")).strip()

            body_preview = " ".join(body_text.split())[:600]

            if not body_preview:
                body_preview = "(empty)"

            f.write(
                "Body (preview, first 600 chars):\n"
            )

            f.write(
                body_preview + "\n\n"
            )

            f.write(
                "Actual Categories:\n"
            )

            f.write(
                ", ".join(error["actual"]) + "\n\n"
            )

            f.write(
                "Predicted Primary:\n"
            )

            f.write(
                error["primary"] + "\n\n"
            )

            f.write(
                "Model Predicted Categories:\n"
            )

            f.write(
                ", ".join(error["model"]) + "\n\n"
            )

            f.write(
                "Secondary Categories:\n"
            )

            f.write(
                ", ".join(error["secondary"])
                if error["secondary"]
                else "None"
            )

            f.write("\n\n")

            f.write(
                "-" * 80
            )

            f.write("\n\n")


    # ============================================================
    # ERROR SUMMARY
    # ============================================================

    actual_error_counts = {
        category: 0
        for category in CATEGORIES
    }

    predicted_error_counts = {
        category: 0
        for category in CATEGORIES
    }

    confusions = {}


    for error in error_details:

        actual_categories = error["actual"]

        predicted = error["primary"]


        for category in actual_categories:

            actual_error_counts[category] += 1

            key = (
                category,
                predicted
            )

            confusions[key] = (
                confusions.get(key, 0) + 1