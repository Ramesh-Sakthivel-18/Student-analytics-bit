import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentDetails } from '../services/api';
import { ArrowLeft, Download, CheckCircle, GraduationCap, AlertTriangle, Lightbulb, BookOpen, Calendar } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await getStudentDetails(id);
        setStudent(data);
      } catch (error) {
        console.error("Error fetching student details", error);
      }
      setLoading(false);
    };
    fetchDetail();
  }, [id]);

  if (loading) return <div className="loading-spinner">Loading Profile...</div>;
  if (!student || student.error) return <div style={{ padding: '2rem', textAlign: 'center' }}>Student not found.</div>;

  const gpaData = student.records.map(r => ({
    semester: `Sem ${r.semester}`,
    gpa: r.gpa
  }));

  const latestRecord = student.records[student.records.length - 1];
  const totalArrears = student.records.reduce((sum, r) => sum + (r.failCount || 0), 0);
  const isOptimal = latestRecord.gpa >= 6.0 && (latestRecord.result.toUpperCase() === 'P' || latestRecord.result.toUpperCase() === 'PASS');

  // Grade distribution across all semesters for this student
  const gradeCount = {};
  student.records.forEach(r => {
    r.subjects.forEach(s => {
      gradeCount[s.grd] = (gradeCount[s.grd] || 0) + 1;
    });
  });
  const gradeData = Object.entries(gradeCount).map(([grade, count]) => ({ grade, count }));
  const GRADE_COLORS_MAP = { 'S': '#059669', 'A+': '#0d9488', 'A': '#0891b2', 'B+': '#2563eb', 'B': '#7c3aed', 'C': '#f59e0b', 'U': '#ef4444' };

  // Subject performance for the latest semester bar chart
  const latestSubjects = latestRecord.subjects.map(s => ({
    code: s.code,
    total: s.tot
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
          <ArrowLeft size={18} /> Back to Directory
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#ffffff', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer', color: '#2563eb', fontWeight: 500, fontSize: '0.875rem' }}>
          <Download size={16} /> Download Report
        </button>
      </div>

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">{student.name.charAt(0)}</div>
        <div className="profile-meta" style={{ flex: 1 }}>
          <h2>{student.name}</h2>
          <p>{student.registerNumber} | B.E. Computer Science and Engineering</p>
        </div>
        <div style={{ display: 'flex', gap: '2.5rem', paddingLeft: '2rem', borderLeft: '1px solid var(--panel-border)' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Current Semester</div>
            <div style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} color="#64748b" /> Semester {latestRecord.semester}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Semesters</div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{student.records.length}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Arrears</div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: totalArrears > 0 ? 'var(--danger)' : 'var(--success)' }}>{totalArrears}</div>
          </div>
        </div>
      </div>

      {/* Row 1: GPA Chart + CGPA + Risk */}
      <div className="charts-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chart-card-header">
            <h3 className="chart-header" style={{ marginBottom: 0 }}>SGPA Progression</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>Actual SGPA</span>
          </div>
          <div style={{ flex: 1, minHeight: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gpaData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorGpaP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="semester" stroke="#64748b" tickLine={false} axisLine={false} dy={10} />
                <YAxis domain={[0, 10]} stroke="#64748b" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="gpa" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorGpaP)" dot={{ r: 5, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: '#f8fafc', padding: '0.875rem', borderRadius: '8px', marginTop: '0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--panel-border)' }}>
            <Lightbulb size={16} color="#2563eb" />
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Insight:</span>
            {isOptimal
              ? ` Student has maintained a consistent performance. Current GPA: ${latestRecord.gpa}`
              : ` Student needs academic support. Current GPA: ${latestRecord.gpa}. ${totalArrears} total arrears across semesters.`
            }
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* CGPA Card */}
          <div className="kpi-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <GraduationCap size={28} color="#2563eb" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>Current CGPA</div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: '#2563eb', margin: '0.25rem 0' }}>{latestRecord.gpa}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>out of 10.00</div>
          </div>
          
          {/* Risk Card */}
          <div className="kpi-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.75rem' }}>Risk Status Indicator</div>
            <div style={{ 
              background: isOptimal ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: isOptimal ? 'var(--success)' : 'var(--danger)',
              padding: '0.875rem', borderRadius: '8px', fontWeight: 700, fontSize: '1.125rem',
              display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'center'
            }}>
              {isOptimal ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
              {isOptimal ? 'Green (Optimal)' : 'Red (At-Risk)'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem' }}>
              {isOptimal ? 'No immediate academic risk detected.' : 'Requires immediate attention and counseling.'}
            </div>
          </div>

          {/* Grade Distribution Mini Donut */}
          <div className="kpi-card" style={{ padding: '1.25rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.75rem', textAlign: 'center' }}>Grade Distribution</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '100px', height: '100px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={gradeData} cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="count" stroke="none">
                      {gradeData.map((entry, index) => <Cell key={index} fill={GRADE_COLORS_MAP[entry.grade] || '#94a3b8'} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, paddingLeft: '0.75rem', fontSize: '0.7rem' }}>
                {gradeData.map((g, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: GRADE_COLORS_MAP[g.grade] || '#94a3b8' }}>● {g.grade}</span>
                    <span style={{ fontWeight: 600 }}>{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Latest Semester Subject Marks Bar */}
      <div className="chart-card" style={{ marginBottom: '1.5rem', minHeight: 'auto' }}>
        <h3 className="chart-header">Latest Semester Subject-wise Marks (Semester {latestRecord.semester})</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={latestSubjects} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="code" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} stroke="#64748b" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {latestSubjects.map((entry, index) => (
                <Cell key={index} fill={entry.total >= 50 ? '#2563eb' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Detailed Academic Records */}
      <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BookOpen size={20} /> Detailed Academic Records
      </h2>
      
      {student.records.map((record, idx) => (
        <div key={idx} className="chart-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '1.5rem', minHeight: 'auto' }}>
          <div style={{ padding: '1.25rem', background: '#f8fafc', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Semester {record.semester}</h3>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>SGPA</span>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{record.gpa}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Result</span>
                <div style={{ marginTop: '0.25rem' }}>
                  <span className={`badge ${record.result.toUpperCase() === 'P' || record.result.toUpperCase() === 'PASS' ? 'pass' : 'fail'}`}>
                    {record.result}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Internal Marks</th>
                  <th>External Marks</th>
                  <th>Total</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {record.subjects.map((sub, sidx) => (
                  <tr key={sidx}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{sub.code}</td>
                    <td>{sub.im}</td>
                    <td>{sub.em}</td>
                    <td style={{ fontWeight: 600 }}>{sub.tot}</td>
                    <td><span className={`badge ${['U', 'F', 'RA'].includes(sub.grd) ? 'fail' : 'pass'}`}>{sub.grd}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentDetail;
