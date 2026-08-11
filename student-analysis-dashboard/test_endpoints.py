import urllib.request, json

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
        data = json.loads(urllib.request.urlopen(f"http://localhost:8000/api/{e}").read())
        preview = str(data)[:100]
        print(f"OK {e}: {preview}")
    except Exception as ex:
        print(f"FAIL {e}: {ex}")
