import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import StudentsList from './pages/StudentsList';
import StudentDetail from './pages/StudentDetail';
import PredictionHub from './pages/PredictionHub';
import { Search, Bell, User } from 'lucide-react';
import './index.css';

const Topbar = () => {
  const location = useLocation();
  let title = "Department Performance Overview";
  let subtitle = "Comprehensive performance summary for Computer Science and Engineering";
  
  if (location.pathname.includes('/prediction-hub')) {
    title = "AI Prediction Hub & Risk Engine";
    subtitle = "Predict student pass/fail probabilities using XGBoost Machine Learning";
  } else if (location.pathname.includes('/students')) {
    title = "Students Directory";
    subtitle = "Search and filter student performance records";
  } else if (location.pathname.includes('/student/')) {
    title = "Student Performance Analytics";
    subtitle = "Comprehensive view of student academic performance";
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-right">
        <div className="search-bar">
          <Search size={18} color="#94a3b8" />
          <input type="text" placeholder="Search student, roll number..." />
        </div>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={20} color="#64748b" />
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', width: 8, height: 8, borderRadius: '50%' }}></span>
        </div>
        <div className="profile-section">
          <div className="profile-img">
            <User size={24} color="#94a3b8" style={{ margin: '6px' }} />
          </div>
          <div className="profile-info">
            <span className="profile-name">Dr. Ramesh</span>
            <span className="profile-role">Department HOD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Topbar />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/prediction-hub" element={<PredictionHub />} />
              <Route path="/students" element={<StudentsList />} />
              <Route path="/student/:id" element={<StudentDetail />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
