import React, { useState } from 'react';
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, 
  Plus, Trash2, Download, Search, Sparkles, BrainCircuit, 
  RefreshCw, ShieldAlert, ArrowRight, Activity, Award, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { predictSingle, predictBulk } from '../services/api';

const PredictionHub = () => {
  const [activeTab, setActiveTab] = useState('bulk'); // 'bulk' | 'single'

  // --- Bulk Prediction State ---
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkResults, setBulkResults] = useState(null); // { summary, students }
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());

  // --- Single Prediction State ---
  const [studentId, setStudentId] = useState('7376221CS101');
  const [studentName, setStudentName] = useState('John Doe');
  const [subjectMarks, setSubjectMarks] = useState([
    { name: 'Data Structures', mark: 35.0, max_score: 50.0 },
    { name: 'Computer Architecture', mark: 42.0, max_score: 50.0 },
    { name: 'Discrete Math', mark: 18.0, max_score: 50.0 },
    { name: 'Operating Systems', mark: 30.0, max_score: 50.0 },
    { name: 'Database Systems', mark: 22.0, max_score: 50.0 },
  ]);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState('');
  const [singleResult, setSingleResult] = useState(null);

  // Dynamic Subject handlers
  const handleAddSubject = () => {
    setSubjectMarks([...subjectMarks, { name: `Subject ${subjectMarks.length + 1}`, mark: 30.0, max_score: 50.0 }]);
  };

  const handleRemoveSubject = (index) => {
    if (subjectMarks.length <= 1) return;
    setSubjectMarks(subjectMarks.filter((_, i) => i !== index));
  };

  const handleMarkChange = (index, field, value) => {
    const updated = [...subjectMarks];
    if (field === 'mark' || field === 'max_score') {
      const parsed = parseFloat(value);
      updated[index][field] = isNaN(parsed) ? 0 : parsed;
    } else {
      updated[index][field] = value;
    }
    setSubjectMarks(updated);
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setSingleLoading(true);
    setSingleError('');
    try {
      const res = await predictSingle({
        student_id: studentId,
        student_name: studentName,
        subjects: subjectMarks,
      });
      setSingleResult(res);
    } catch (err) {
      setSingleError(err.response?.data?.detail || 'Failed to generate single student prediction.');
    } finally {
      setSingleLoading(false);
    }
  };

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Bulk File Upload handlers
  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setBulkError('Please select a valid Excel file (.xlsx or .xls).');
      return;
    }
    setBulkError('');
    setBulkFile(file);
  };

  const handleBulkSubmit = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkError('');
    try {
      const res = await predictBulk(bulkFile);
      setBulkResults(res);
      setExpandedRows(new Set());
    } catch (err) {
      setBulkError(err.response?.data?.detail || 'Failed to process bulk prediction file.');
    } finally {
      setBulkLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!bulkResults || !bulkResults.students.length) return;
    const headers = ["Register No", "Student Name", "Avg Internal %", "Min Internal %", "Low Marks (<50%)", "Pass Chance (%)", "Fail Chance (%)", "Risk Status", "At-Risk Subjects"];
    const rows = bulkResults.students.map(s => [
      `"${s.student_id}"`,
      `"${s.student_name}"`,
      s.avg_internal_pct,
      s.min_internal_pct,
      s.low_internal_count,
      s.pass_probability,
      s.fail_probability,
      `"${s.risk_status}"`,
      `"${s.at_risk_subjects ? s.at_risk_subjects.map(sub => `${sub.subject_code} (${sub.raw_score}/${sub.max_score})`).join('; ') : ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Prediction_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper Badge Renderers
  const getBadgeStyle = (status) => {
    if (status.includes('HIGH RISK')) {
      return { bg: '#fef2f2', text: '#ef4444', border: '#fca5a5', icon: <AlertTriangle size={14} className="inline mr-1" /> };
    } else if (status.includes('MEDIUM RISK')) {
      return { bg: '#fffbeb', text: '#f59e0b', border: '#fde68a', icon: <AlertTriangle size={14} className="inline mr-1" /> };
    } else {
      return { bg: '#ecfdf5', text: '#10b981', border: '#6ee7b7', icon: <CheckCircle2 size={14} className="inline mr-1" /> };
    }
  };

  // Faculty Feedback logic
  const getFacultyRecommendation = (result) => {
    const { low_internal_count, fail_probability, min_internal_pct } = result;
    if (fail_probability >= 50) {
      return `CRITICAL INTERVENTION NEEDED: Student exhibits a high failure risk (${fail_probability}%). ${low_internal_count} subject(s) are strictly below 50% (Lowest: ${min_internal_pct}%). Immediate 1-on-1 academic counseling and mandatory remedial classes recommended.`;
    } else if (fail_probability >= 25) {
      return `MODERATE MONITORING REQUIRED: Student shows moderate failure risk (${fail_probability}%). Has ${low_internal_count} subject(s) below 50%. Faculty advisor should assign targeted practice assignments and monitor upcoming internal assessments.`;
    } else {
      return `ACADEMIC PROGRESS ON TRACK: Student is predicted SAFE with ${result.pass_probability}% pass probability. Minimum internal mark is ${min_internal_pct}%. Encourage participation in advanced projects and peer tutoring.`;
    }
  };

  // Filtered Students for Bulk Table
  const filteredStudents = bulkResults ? bulkResults.students.filter(s => {
    const matchesSearch = s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'HIGH_RISK') return matchesSearch && s.risk_status.includes('HIGH RISK');
    if (filterStatus === 'MEDIUM_RISK') return matchesSearch && s.risk_status.includes('MEDIUM RISK');
    if (filterStatus === 'SAFE') return matchesSearch && s.risk_status.includes('SAFE');
    if (filterStatus === 'LOW_SUBJECTS') return matchesSearch && s.low_internal_count >= 2;
    return matchesSearch;
  }) : [];

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <BrainCircuit size={28} color="#2563eb" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              AI Prediction Engine & Risk Analyzer
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            XGBoost Machine Learning model predicting student failure probabilities and academic risk levels.
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('bulk')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              background: activeTab === 'bulk' ? '#ffffff' : 'transparent',
              color: activeTab === 'bulk' ? '#2563eb' : '#64748b',
              boxShadow: activeTab === 'bulk' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <FileSpreadsheet size={18} />
            Bulk Batch Upload
          </button>
          <button
            onClick={() => setActiveTab('single')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              background: activeTab === 'single' ? '#ffffff' : 'transparent',
              color: activeTab === 'single' ? '#2563eb' : '#64748b',
              boxShadow: activeTab === 'single' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <User size={18} />
            Single Student Predictor
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB A: BULK BATCH PREDICTION (EXCEL UPLOAD) */}
      {/* ========================================== */}
      {activeTab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Uploader Box */}
          <div className="card" style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={20} color="#2563eb" />
              Upload Result Sheet (.xlsx / .xls)
            </h2>
            
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => document.getElementById('file-upload-input').click()}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <FileSpreadsheet size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: 600, color: '#334155', fontSize: '1rem', marginBottom: '0.25rem' }}>
                {bulkFile ? bulkFile.name : 'Drag & Drop your Excel Result File here'}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                {bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB` : 'Supports standard college semester result sheets or subject mark tables'}
              </p>
            </div>

            {bulkError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '8px', fontSize: '0.875rem' }}>
                {bulkError}
              </div>
            )}

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              {bulkFile && (
                <button
                  onClick={() => { setBulkFile(null); setBulkResults(null); }}
                  style={{ padding: '0.6rem 1.25rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, color: '#475569' }}
                >
                  Clear File
                </button>
              )}
              <button
                disabled={!bulkFile || bulkLoading}
                onClick={handleBulkSubmit}
                style={{
                  padding: '0.65rem 1.5rem',
                  background: !bulkFile || bulkLoading ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: !bulkFile || bulkLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {bulkLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Analyzing Batch Data...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Run Batch Prediction
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Summary Dashboard */}
          {bulkResults && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL STUDENTS</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                    {bulkResults.summary.total_students}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>SAFE (PASS)</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>
                    {bulkResults.summary.total_safe}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>MEDIUM RISK</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.25rem' }}>
                    {bulkResults.summary.total_medium_risk}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>HIGH RISK (FAIL)</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ef4444', marginTop: '0.25rem' }}>
                    {bulkResults.summary.total_high_risk}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>PREDICTED PASS RATE</div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>
                    {bulkResults.summary.class_pass_rate}%
                  </div>
                </div>
              </div>

              {/* Table Toolbar */}
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                      <input
                        type="text"
                        placeholder="Search student or register no..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                          padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.875rem',
                          width: '240px'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '2px', borderRadius: '8px' }}>
                      {['ALL', 'HIGH_RISK', 'MEDIUM_RISK', 'SAFE', 'LOW_SUBJECTS'].map(st => (
                        <button
                          key={st}
                          onClick={() => setFilterStatus(st)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: filterStatus === st ? '#ffffff' : 'transparent',
                            color: filterStatus === st ? '#2563eb' : '#64748b',
                          }}
                        >
                          {st === 'LOW_SUBJECTS' ? '>=2 LOW SUBJ' : st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleExportCSV}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Download size={16} />
                    Export CSV Report
                  </button>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                        <th style={{ padding: '0.75rem 1rem', width: '40px' }}></th>
                        <th style={{ padding: '0.75rem 1rem' }}>Register No</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Avg Internal</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Pass Chance</th>
                        <th style={{ padding: '0.75rem 1rem' }}>At-Risk Subjects</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Risk Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                            No student records found matching filter.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s, idx) => {
                          const badge = getBadgeStyle(s.risk_status);
                          const isExpanded = expandedRows.has(s.student_id);
                          return (
                            <React.Fragment key={s.student_id || idx}>
                              <tr 
                                onClick={() => toggleRow(s.student_id)}
                                style={{ 
                                  borderBottom: '1px solid #f1f5f9', 
                                  background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                              >
                                <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>{s.student_id}</td>
                                <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{s.student_name}</td>
                                <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{s.avg_internal_pct}%</td>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#10b981' }}>{s.pass_probability}%</td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                  {s.at_risk_subjects && s.at_risk_subjects.length > 0 ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      {s.at_risk_subjects.map((sub, i) => (
                                        <span 
                                          key={i} 
                                          title={`Raw: ${sub.raw_score} / Max: ${sub.max_score} (${sub.percentage}%)`}
                                          style={{
                                            background: '#fef2f2',
                                            color: '#ef4444',
                                            border: '1px solid #fca5a5',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'help'
                                          }}
                                        >
                                          {sub.subject_code} ({sub.raw_score}/{sub.max_score})
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: badge.bg,
                                    color: badge.text,
                                    border: `1px solid ${badge.border}`
                                  }}>
                                    {badge.icon}
                                    {s.risk_status}
                                  </span>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                  <td colSpan={7} style={{ padding: '1rem 2rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                      <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>MIN INTERNAL %</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{s.min_internal_pct}%</div>
                                      </div>
                                      <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>FAIL PROBABILITY</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.fail_probability >= 50 ? '#ef4444' : s.fail_probability >= 25 ? '#f59e0b' : '#64748b' }}>
                                          {s.fail_probability}%
                                        </div>
                                      </div>
                                      <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>SUBJECTS &lt; 50%</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.low_internal_count > 0 ? '#ef4444' : '#10b981' }}>{s.low_internal_count}</div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB B: INDIVIDUAL STUDENT PREDICTOR        */}
      {/* ========================================== */}
      {activeTab === 'single' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Input Form Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} color="#2563eb" />
              Student Academic Profile Input
            </h2>

            <form onSubmit={handleSingleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    Register Number / ID
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="e.g. 7376221CS101"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    Student Name
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              {/* Dynamic Subject Marks List */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    Subject Internal Marks
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Plus size={14} /> Add Subject
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
                  {subjectMarks.map((sub, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={sub.name}
                        onChange={(e) => handleMarkChange(idx, 'name', e.target.value)}
                        placeholder={`Subject ${idx + 1}`}
                        style={{ flex: 2, padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={sub.mark}
                        onChange={(e) => handleMarkChange(idx, 'mark', e.target.value)}
                        style={{ flex: 1, padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}
                        placeholder="Mark"
                      />
                      <span style={{color: '#94a3b8', fontSize: '1rem'}}>/</span>
                      <select
                        value={sub.max_score}
                        onChange={(e) => handleMarkChange(idx, 'max_score', e.target.value)}
                        style={{ padding: '0.45rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#f8fafc', color: '#475569' }}
                      >
                        <option value="40">40</option>
                        <option value="50">50</option>
                        <option value="60">60</option>
                        <option value="100">100</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(idx)}
                        disabled={subjectMarks.length <= 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: subjectMarks.length <= 1 ? '#cbd5e1' : '#ef4444',
                          cursor: subjectMarks.length <= 1 ? 'not-allowed' : 'pointer',
                          padding: '0.35rem'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {singleError && (
                <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '6px', fontSize: '0.85rem' }}>
                  {singleError}
                </div>
              )}

              <button
                type="submit"
                disabled={singleLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: singleLoading ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: singleLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {singleLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" /> Analyzing Model...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Analyze Risk with XGBoost
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Result Output Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="#2563eb" />
              AI Risk Diagnostic Report
            </h2>

            {!singleResult ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <BrainCircuit size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontWeight: 500 }}>Enter student marks and click "Analyze Risk"</p>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>The model will compute features and evaluate pass/fail probability.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Header Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{singleResult.student_name}</h3>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Reg: {singleResult.student_id}</span>
                  </div>

                  {(() => {
                    const badge = getBadgeStyle(singleResult.risk_status);
                    return (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`
                      }}>
                        {badge.icon}
                        {singleResult.risk_status}
                      </span>
                    );
                  })()}
                </div>

                {/* Probability Gauge / Visual Progress Bar */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                    <span style={{ color: '#10b981' }}>Pass Chance: {singleResult.pass_probability}%</span>
                    <span style={{ color: '#ef4444' }}>Fail Chance: {singleResult.fail_probability}%</span>
                  </div>

                  {/* Dual Bar */}
                  <div style={{ height: '14px', borderRadius: '9999px', background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${singleResult.pass_probability}%`, background: '#10b981', transition: 'width 0.5s ease-in-out' }}></div>
                    <div style={{ width: `${singleResult.fail_probability}%`, background: '#ef4444', transition: 'width 0.5s ease-in-out' }}></div>
                  </div>
                </div>
                
                {/* At-Risk Subjects List */}
                {singleResult.at_risk_subjects && singleResult.at_risk_subjects.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#b91c1c', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Subjects At Risk (&lt; 50%)</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {singleResult.at_risk_subjects.map((sub, i) => (
                        <span 
                          key={i} 
                          title={`Raw: ${sub.raw_score} / Max: ${sub.max_score} (${sub.percentage}%)`}
                          style={{
                            background: '#ffffff',
                            color: '#ef4444',
                            border: '1px solid #fca5a5',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'help'
                          }}
                        >
                          {sub.subject_code} ({sub.raw_score}/{sub.max_score})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engineered Features Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>AVG INTERNAL %</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{singleResult.avg_internal_pct}</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>MIN INTERNAL %</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: singleResult.min_internal_pct < 50 ? '#ef4444' : '#1e293b' }}>
                      {singleResult.min_internal_pct}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>LOW MARKS (&lt;50%)</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: singleResult.low_internal_count > 0 ? '#ef4444' : '#10b981' }}>
                      {singleResult.low_internal_count}
                    </span>
                  </div>
                </div>

                {/* Actionable Faculty Recommendation */}
                <div style={{
                  background: singleResult.risk_status.includes('HIGH RISK') ? '#fef2f2' : singleResult.risk_status.includes('MEDIUM RISK') ? '#fffbeb' : '#ecfdf5',
                  border: `1px solid ${singleResult.risk_status.includes('HIGH RISK') ? '#fca5a5' : singleResult.risk_status.includes('MEDIUM RISK') ? '#fde68a' : '#6ee7b7'}`,
                  borderRadius: '12px',
                  padding: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', color: singleResult.risk_status.includes('HIGH RISK') ? '#dc2626' : singleResult.risk_status.includes('MEDIUM RISK') ? '#d97706' : '#059669' }}>
                    <Sparkles size={16} /> Faculty Advisory & Action Plan
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                    {getFacultyRecommendation(singleResult)}
                  </p>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionHub;
