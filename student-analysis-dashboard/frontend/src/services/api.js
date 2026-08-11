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

export const getDashboardSummary = async (semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/summary`, { params: { semester } });
  return response.data;
};

export const getSemesterTrends = async () => {
  const response = await axios.get(`${API_URL}/dashboard/semester-trends`);
  return response.data;
};

export const getSubjectAnalytics = async (semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/subject-analytics`, { params: { semester } });
  return response.data;
};

export const getStudents = async (semester = 'All', search = '') => {
  const response = await axios.get(`${API_URL}/students`, { params: { semester, search } });
  return response.data;
};

export const getStudentDetails = async (registerNumber) => {
  const response = await axios.get(`${API_URL}/students/${registerNumber}`);
  return response.data;
};

export const getTopPerformers = async (semester = 'All', limit = 5) => {
  const response = await axios.get(`${API_URL}/dashboard/top-performers`, { params: { semester, limit } });
  return response.data;
};

export const getClassDivision = async (semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/class-division`, { params: { semester } });
  return response.data;
};

export const getGradeDistribution = async (semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/grade-distribution`, { params: { semester } });
  return response.data;
};

export const getBatchComparison = async () => {
  const response = await axios.get(`${API_URL}/dashboard/batch-comparison`);
  return response.data;
};

export const getAtRiskStudents = async (semester = 'All') => {
  const response = await axios.get(`${API_URL}/dashboard/at-risk`, { params: { semester } });
  return response.data;
};
