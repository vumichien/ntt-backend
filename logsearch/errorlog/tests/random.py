import re


def mask_explanation(explanation):
    # Function to mask specific patterns in the explanation
    if not explanation:
        return explanation

    parts = explanation.split("へ")
    if len(parts) > 1:
        # Case 1: Pattern with へ
        # Keep the system/field name part unchanged
        result = parts[0] + "へ"
        # Mask the input value in the remaining part
        remaining = "へ".join(parts[1:])

        # Order matters! Check specific patterns first
        # 1. Mask dates (YYYY-MM-DD format)
        remaining = re.sub(r"「\d{4}-\d{2}-\d{2}」", "「DATE」", remaining)

        # 2. Mask numbers (must come before general text)
        remaining = re.sub(r"「\d+」", "「NUMBER」", remaining)

        # 3. Mask remaining text patterns (only if not already masked)
        remaining = re.sub(r"「(?!(DATE|NUMBER)」)[^」]+」", "「TEXT」", remaining)

        explanation = result + remaining
    else:
        # Case 2: Pattern without へ
        # Apply the same masking patterns to the entire string
        explanation = re.sub(r"「\d{4}-\d{2}-\d{2}」", "「DATE」", explanation)
        explanation = re.sub(r"「\d+」", "「NUMBER」", explanation)
        explanation = re.sub(r"「(?!(DATE|NUMBER)」)[^」]+」", "「TEXT」", explanation)

    return explanation


# Test cases
print(mask_explanation("「予約管理システム」へ「shinjin」を入力する"))
print(mask_explanation("「希望納期：」へ「2024-04-17」を選択する"))
print(mask_explanation("「案件ID：」へ「10001」を入力する"))
print(mask_explanation("ユーザー名「shinnjin」は無効です。"))
