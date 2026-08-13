import sys
sys.path.insert(0, 'd:/ramesh/student analysis/student-analysis-dashboard/backend')
import model_service

with open('d:/ramesh/student analysis/dataset/CSE NOV 2025/I/CS.xlsx', 'rb') as f:
    res = model_service.parse_and_predict_excel(f.read())

print('Total Students:', len(res['students']))
if res['students']:
    print('Sample Student 1:', res['students'][0])
    print('Sample Student 2:', res['students'][1])
