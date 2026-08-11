import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudents } from '../services/api';
import { Search, Download, Filter, ArrowRight } from 'lucide-react';

const StudentsList = () => {
  const [students, setStudents] = useState([]);
  const [semester, setSemester] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const navigate = useNavigate();

  useEffect(() => { setPage(1); fetchStudents(); }, [semester, search]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudents(semester, search);
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students", error);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(students.length / perPage);
  const paginated = students.slice((page - 1) * perPage, page * perPage);

  const getRiskBadge = (student) => {
    const isPass = student.result.toUpperCase() === 'P' || student.result.toUpperCase() === 'PASS';
    if (!isPass || student.gpa < 5.0 || student.failCount >= 2) return <span className="badge fail">🔴 Critical</span>;
    if (student.gpa < 6.0 || student.failCount === 1) return <span className="badge warning">🟡 Warning</span>;
    return <span className="badge pass">🟢 Optimal</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ width: '320px', backgroundColor: '#ffffff', border: '1px solid var(--panel-border)' }}>
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search by Register Number or Name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="semester-selector">
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="All">All Semesters</option>
              <option value="I">Semester I</option>
              <option value="III">Semester III</option>
              <option value="V">Semester V</option>
              <option value="VII">Semester VII</option>
            </select>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#ffffff', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer', color: '#2563eb', fontWeight: 500, fontSize: '0.875rem' }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Quick stats bar */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span>Showing <strong style={{ color: 'var(--text-main)' }}>{paginated.length}</strong> of <strong style={{ color: 'var(--text-main)' }}>{students.length}</strong> students</span>
        {semester !== 'All' && <span>Filtered by: <strong style={{ color: 'var(--primary-color)' }}>Semester {semester}</strong></span>}
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-spinner">Searching...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Register Number</th>
                <th>Name</th>
                <th>Semester</th>
                <th>GPA</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? paginated.map((student, idx) => (
                <tr key={`${student.registerNumber}-${student.semester}-${idx}`}>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>{student.registerNumber}</td>
                  <td style={{ fontWeight: 500 }}>{student.name}</td>
                  <td>{student.semester}</td>
                  <td style={{ fontWeight: 600 }}>{student.gpa}</td>
                  <td>
                    <span className={`badge ${student.result.toLowerCase() === 'pass' || student.result.toLowerCase() === 'p' ? 'pass' : 'fail'}`}>
                      {student.result}
                    </span>
                  </td>
                  <td>{getRiskBadge(student)}</td>
                  <td>
                    <button className="icon-btn" onClick={() => navigate(`/student/${student.registerNumber}`)}>
                      <ArrowRight size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No students found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#cbd5e1' : 'var(--text-main)', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page + i - 2;
            if (p < 1 || p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{ padding: '0.5rem 0.875rem', borderRadius: '8px', border: page === p ? 'none' : '1px solid var(--panel-border)', background: page === p ? '#2563eb' : '#fff', color: page === p ? '#fff' : 'var(--text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: page === totalPages ? '#cbd5e1' : 'var(--text-main)', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentsList;
