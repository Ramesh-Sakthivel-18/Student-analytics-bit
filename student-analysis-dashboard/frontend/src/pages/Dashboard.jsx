import React, { useState, useEffect } from 'react';
import {
  getDashboardSummary, getSemesterTrends, getSubjectAnalytics,
  getTopPerformers, getClassDivision, getGradeDistribution,
  getBatchComparison, getAtRiskStudents
} from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, AlertTriangle, GraduationCap, Users, UserCheck,
  BookOpen, Trophy, Medal, Award, ShieldAlert, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GRADE_COLORS = {
  'S': '#059669', 'A+': '#0d9488', 'A': '#0891b2',
  'B+': '#2563eb', 'B': '#7c3aed', 'C': '#f59e0b', 'U': '#ef4444'
};

const DIVISION_COLORS = ['#059669', '#2563eb', '#f59e0b', '#ef4444'];

const Dashboard = () => {
  const [semester, setSemester] = useState('All');
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [classDivision, setClassDivision] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [batchComparison, setBatchComparison] = useState([]);
  const [atRisk, setAtRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchData(); }, [semester]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumData, trendData, subData, topData, divData, gradeData, batchData, riskData] = await Promise.all([
        getDashboardSummary(semester),
        getSemesterTrends(),
        getSubjectAnalytics(semester),
        getTopPerformers(semester, 5),
        getClassDivision(semester),
        getGradeDistribution(semester),
        getBatchComparison(),
        getAtRiskStudents(semester)
      ]);
      setSummary(sumData);
      setTrends(trendData);
      setSubjects(subData.sort((a, b) => b.failCount - a.failCount).slice(0, 5));
      setTopPerformers(topData);
      setClassDivision(divData);
      setGradeDistribution(gradeData);
      setBatchComparison(batchData);
      setAtRisk(riskData);
    } catch (error) {
      console.error("Error fetching dashboard data", error);
    }
    setLoading(false);
  };

  if (loading || !summary) {
    return <div className="loading-spinner">Loading Analytics...</div>;
  }

  const rankIcons = [
    <Trophy size={18} color="#f59e0b" />,
    <Medal size={18} color="#94a3b8" />,
    <Award size={18} color="#b45309" />,
    <span style={{ fontWeight: 700, color: '#64748b' }}>4</span>,
    <span style={{ fontWeight: 700, color: '#64748b' }}>5</span>
  ];

  // Prepare radar data from subjects
  const radarData = subjects.map(s => ({
    subject: s.subject,
    average: s.average,
    fullMark: 100
  }));

  return (
    <div>
      {/* Semester Filter */}
      <div className="semester-filters">
        <div className="semester-selector">
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="All">All Semesters</option>
            <option value="I">Semester I</option>
            <option value="III">Semester III</option>
            <option value="V">Semester V</option>
            <option value="VII">Semester VII</option>
          </select>
        </div>
      </div>

      {/* ── ROW 1: KPI Cards ── */}
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Total Students</span>
            <div className="kpi-icon blue"><Users size={20} /></div>
          </div>
          <span className="kpi-value">{summary.totalStudents}</span>
        </div>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Overall Pass Percentage</span>
            <div className="kpi-icon green"><TrendingUp size={20} /></div>
          </div>
          <span className="kpi-value green">{summary.passPercentage}%</span>
          <span className="kpi-trend up">↑ vs Last Semester</span>
        </div>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Total At-Risk Students</span>
            <div className="kpi-icon red"><AlertTriangle size={20} /></div>
          </div>
          <span className="kpi-value red">{atRisk ? atRisk.totalAtRisk : 0}</span>
          <span className="kpi-trend down">
            {atRisk ? `${atRisk.highRiskCount} Critical · ${atRisk.moderateRiskCount} Warning` : ''}
          </span>
        </div>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Average Departmental SGPA</span>
            <div className="kpi-icon blue"><GraduationCap size={20} /></div>
          </div>
          <span className="kpi-value">{summary.averageGpa}</span>
          <span className="kpi-trend up">Highest: {summary.highestGpa} · Lowest: {summary.lowestGpa}</span>
        </div>
      </div>

      {/* ── ROW 2: SGPA Trend + Top Performers ── */}
      <div className="charts-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-header" style={{ marginBottom: 0 }}>SGPA Trend (Department Average)</h3>
            <a href="#" className="view-details-link">View Details</a>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="semester" stroke="#64748b" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} stroke="#64748b" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="averageGpa" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorGpa)" dot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ minHeight: 'auto' }}>
          <div className="chart-card-header">
            <h3 className="chart-header" style={{ marginBottom: 0 }}>🏆 Top Performers</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topPerformers.map((s, i) => (
              <div key={i} className="leaderboard-item" onClick={() => navigate(`/student/${s.registerNumber}`)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={`rank-badge rank-${i + 1}`}>{rankIcons[i]}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.registerNumber}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '1.125rem' }}>{s.gpa}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Grade Distribution (Stacked) + Class Division (Donut) + Radar ── */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {/* Grade Distribution Stacked Bar */}
        <div className="chart-card">
          <h3 className="chart-header">Grade Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gradeDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" tickLine={false} axisLine={false} unit="%" />
              <YAxis type="category" dataKey="grade" stroke="#64748b" tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                {gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.grade] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Class Division Donut */}
        <div className="chart-card">
          <h3 className="chart-header">Class Division Breakdown</h3>
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={classDivision} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                  {classDivision.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DIVISION_COLORS[index % DIVISION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{summary.totalStudents}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Students</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
            {classDivision.map((d, i) => (
              <span key={i} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: DIVISION_COLORS[i], display: 'inline-block' }}></span>
                {d.name}: {d.percentage}%
              </span>
            ))}
          </div>
        </div>

        {/* Subject Difficulty Radar */}
        <div className="chart-card">
          <h3 className="chart-header">Subject Difficulty Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Radar name="Average Marks" dataKey="average" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} strokeWidth={2} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── ROW 4: Batch Comparison (Stacked Bar) + At-Risk Courses ── */}
      <div className="charts-grid" style={{ gridTemplateColumns: '3fr 2fr' }}>
        <div className="chart-card">
          <h3 className="chart-header">Grade Distribution by Batch (Semester)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={batchComparison} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" tickLine={false} axisLine={false} unit="%" />
              <YAxis type="category" dataKey="semester" stroke="#64748b" tickLine={false} axisLine={false} width={60} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              {Object.keys(GRADE_COLORS).map(g => (
                <Bar key={g} dataKey={g} stackId="a" fill={GRADE_COLORS[g]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-header" style={{ marginBottom: 0 }}>Top At-Risk Courses</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Fail %</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {subjects.map((sub, index) => {
              const total = sub.passCount + sub.failCount;
              const failPercent = total > 0 ? Math.round((sub.failCount / total) * 100) : 0;
              const barColors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6'];
              return (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '120px', fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.subject}</div>
                  <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${failPercent}%`, height: '100%', background: barColors[index % barColors.length], borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                  </div>
                  <div style={{ width: '40px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600 }}>{failPercent}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 5: At-Risk Students Table ── */}
      {atRisk && atRisk.totalAtRisk > 0 && (
        <div className="chart-card" style={{ minHeight: 'auto', marginBottom: '2rem' }}>
          <div className="chart-card-header" style={{ marginBottom: '1rem' }}>
            <h3 className="chart-header" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} color="#ef4444" /> At-Risk Students
            </h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                Critical: {atRisk.highRiskCount}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                Warning: {atRisk.moderateRiskCount}
              </span>
            </div>
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Register Number</th>
                  <th>Name</th>
                  <th>Semester</th>
                  <th>GPA</th>
                  <th>Arrears</th>
                  <th>Risk Level</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...atRisk.highRisk, ...atRisk.moderateRisk].slice(0, 10).map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{s.registerNumber}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{s.semester}</td>
                    <td style={{ fontWeight: 600 }}>{s.gpa}</td>
                    <td>{s.failCount}</td>
                    <td>
                      <span className={`badge ${s.riskLevel === 'critical' ? 'fail' : 'warning'}`}>
                        {s.riskLevel === 'critical' ? '🔴 Critical' : '🟡 Warning'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '200px' }}>{s.reason}</td>
                    <td>
                      <button className="icon-btn" onClick={() => navigate(`/student/${s.registerNumber}`)}>
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ROW 6: Performance Summary + Quick Stats ── */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="chart-card" style={{ minHeight: 'auto' }}>
          <h3 className="chart-header">Performance Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: <Users size={18} color="#64748b" />, label: 'Total Students', value: summary.totalStudents },
              { icon: <UserCheck size={18} color="#10b981" />, label: 'Students Passed', value: summary.passCount },
              { icon: <AlertTriangle size={18} color="#ef4444" />, label: 'Students Failed', value: summary.failCount },
              { icon: <BookOpen size={18} color="#2563eb" />, label: 'Highest GPA', value: summary.highestGpa },
              { icon: <GraduationCap size={18} color="#8b5cf6" />, label: 'Lowest GPA', value: summary.lowestGpa },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: i < 4 ? '1px solid var(--panel-border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {item.icon}
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.label}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card" style={{ minHeight: 'auto' }}>
          <h3 className="chart-header">Subject-wise Average Marks</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subjects} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="subject" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                {subjects.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#2563eb', '#059669', '#7c3aed', '#f59e0b', '#0891b2'][index % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
