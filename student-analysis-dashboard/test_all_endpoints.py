import urllib.request
import urllib.parse
import json

base_url = "http://localhost:8000/api"

print("--- Testing /api/health ---")
try:
    res = json.loads(urllib.request.urlopen(f"{base_url}/health").read())
    print("Health Status:", res)
except Exception as e:
    print("Health check failed:", e)

print("\n--- Testing /api/predict/single ---")
try:
    payload = json.dumps({
        "student_id": "7376221CS101",
        "student_name": "John Doe",
        "internal_marks": [35.0, 42.0, 18.0, 30.0, 22.0]
    }).encode("utf-8")
    req = urllib.request.Request(f"{base_url}/predict/single", data=payload, headers={"Content-Type": "application/json"})
    res = json.loads(urllib.request.urlopen(req).read())
    print("Single Prediction Result:", res)
except Exception as e:
    print("Single prediction failed:", e)

print("\n--- Testing Existing Dashboard Endpoints ---")
endpoints = [
    'dashboard/summary',
    'dashboard/top-performers',
    'dashboard/class-division',
    'dashboard/grade-distribution',
    'dashboard/batch-comparison',
    'dashboard/at-risk',
    'dashboard/semester-trends',
    'dashboard/subject-analytics'
]

for e in endpoints:
    try:
        data = json.loads(urllib.request.urlopen(f"{base_url}/{e}").read())
        preview = str(data)[:80]
        print(f"OK {e}: {preview}")
    except Exception as ex:
        print(f"FAIL {e}: {ex}")
