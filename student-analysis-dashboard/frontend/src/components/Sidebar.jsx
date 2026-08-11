import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, BrainCircuit, Users, ShieldAlert, BarChart3, FileText, Settings, Sparkles } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <BookOpen size={24} color="#2563eb" />
        <span>Academic Intelligence</span>
      </div>
      
      <div className="nav-links">
        <div style={{ padding: '1rem 1.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Analytics & AI</div>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          Overview
        </NavLink>
        <NavLink to="/prediction-hub" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BrainCircuit size={20} color="#3b82f6" />
          Prediction Hub
        </NavLink>
        <NavLink to="/students" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          Student Directory
        </NavLink>
        <NavLink to="/at-risk" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <ShieldAlert size={20} />
          At-Risk Analysis
        </NavLink>

        <div style={{ padding: '1.5rem 1.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>System</div>
        <NavLink to="/reports" className="nav-link">
          <FileText size={20} />
          Reports
        </NavLink>
        <NavLink to="/settings" className="nav-link">
          <Settings size={20} />
          Settings
        </NavLink>
      </div>

      <div style={{ marginTop: 'auto', padding: '1.5rem' }}>
        <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#60a5fa', fontWeight: 600 }}>
            <Sparkles size={16} /> XGBoost Model
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Model loaded with features: Avg Internal, Min Internal, Low Marks (&lt;25).
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
