import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const checkHealth = async () => {
  const response = await axios.get(`${API_URL}/health`);
  return response.data;
};

export const predictSingle = async (studentData) => {
  const response = await axios.post(`${API_URL}/predict/single`, studentData);
  return response.data;
};

export const predictBulk = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${API_URL}/predict/bulk`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDepartments = async () => {
  const response = await axios.get(`${API_URL}/departments`);
  return response.data.departments;
};

export const getDashboardSummary = async (department = 'All', semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/summary`, { params: { department, semester } });
  return response.data;
};

export const getSemesterTrends = async (department = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/semester-trends`, { params: { department } });
  return response.data;
};

export const getSubjectAnalytics = async (department = 'All', semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/subject-analytics`, { params: { department, semester } });
  return response.data;
};

export const getStudents = async (department = 'All', semester = 'All', search = '') => {
  const response = await axios.get(`${API_URL}/students`, { params: { department, semester, search } });
  return response.data;
};

export const getStudentDetails = async (registerNumber) => {
  const response = await axios.get(`${API_URL}/students/${registerNumber}`);
  return response.data;
};

export const getTopPerformers = async (department = 'All', semester = 'All', limit = 5) => {
  const response = await axios.get(`${API_URL}/dashboard/top-performers`, { params: { department, semester, limit } });
  return response.data;
};

export const getClassDivision = async (department = 'All', semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/class-division`, { params: { department, semester } });
  return response.data;
};

export const getGradeDistribution = async (department = 'All', semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/grade-distribution`, { params: { department, semester } });
  return response.data;
};

export const getBatchComparison = async (department = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/batch-comparison`, { params: { department } });
  return response.data;
};

export const getAtRiskStudents = async (department = 'All', semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/at-risk`, { params: { department, semester } });
  return response.data;
};
