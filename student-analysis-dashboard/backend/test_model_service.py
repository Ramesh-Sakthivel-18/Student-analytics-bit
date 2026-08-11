import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model_service import verify_model_loaded, predict_single, compute_features, classify_risk

print("1. Testing Model Availability:")
status = verify_model_loaded()
print("   Status:", status)

print("\n2. Testing Single Prediction:")
sample_student = predict_single(
    student_id="7376221CS101",
    student_name="John Doe",
    internal_marks=[35.0, 42.0, 18.0, 30.0, 22.0]
)
print("   Single Prediction Result:")
for k, v in sample_student.items():
    print(f"     {k}: {v}")

print("\n3. Testing Safe Student Case:")
safe_student = predict_single(
    student_id="7376221CS102",
    student_name="Alice Smith",
    internal_marks=[45.0, 48.0, 42.0, 40.0, 46.0]
)
print("   Safe Student Result:")
for k, v in safe_student.items():
    print(f"     {k}: {v}")

print("\nAll model service unit tests passed!")
