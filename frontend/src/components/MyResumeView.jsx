import React, { useState, useMemo } from 'react';
import { api } from '../api/api';
import { IconMyResume, IconUpload, IconSparkles, IconNewInterview, IconCheck } from './Icons';

export default function MyResumeView({ onStartWithResume }) {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [copiedBulletIdx, setCopiedBulletIdx] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (f) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (!validTypes.includes(f.type) && !f.name.endsWith('.pdf') && !f.name.endsWith('.docx')) {
      setError('Please upload a PDF (.pdf) or Word document (.docx).');
      return;
    }

    setFile(f);
    setFileName(f.name);
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('resumeFile', f);
      const res = await api.extractResume(formData);
      if (res.success && res.data) {
        setExtractedText(res.data.extractedText || '');
        setSuccess('Resume extracted successfully! AI analysis and improvements generated below.');
      } else {
        setError(res.message || 'Failed to extract resume text.');
      }
    } catch (err) {
      setError(err.message || 'Error extracting resume.');
    } finally {
      setLoading(false);
    }
  };

  // Heuristic to extract skills from text
  const detectSkills = (text) => {
    if (!text) return [];
    const commonTech = [
      'Java', 'Spring Boot', 'Python', 'React', 'Node.js', 'MySQL', 'PostgreSQL',
      'Docker', 'Kubernetes', 'AWS', 'REST API', 'JavaScript', 'TypeScript',
      'Git', 'HTML', 'CSS', 'Microservices', 'GraphQL', 'Redis', 'MongoDB',
      'Kafka', 'CI/CD', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Data Structures',
      'Hibernate', 'JPA', 'JUnit', 'Mockito', 'Linux', 'Elasticsearch'
    ];
    return commonTech.filter(tech => {
      const regex = new RegExp(`\\b${tech.replace('.', '\\.')}\\b`, 'i');
      return regex.test(text);
    });
  };

  const detectedSkills = useMemo(() => detectSkills(extractedText), [extractedText]);

  // Analyze gaps & compute actionable improvements
  const resumeAnalysis = useMemo(() => {
    if (!extractedText) {
      return {
        score: null,
        status: 'Pending Upload',
        metricsFound: false,
        recommendedKeywords: ['Docker', 'Redis', 'CI/CD Pipelines', 'Kafka', 'JUnit / Mockito'],
        improvements: []
      };
    }

    const lower = extractedText.toLowerCase();

    // Check for metrics (% numbers, ms, metrics, latency, users)
    const hasNumbers = /\b\d+(\.\d+)?%\b|\b\d+\s*(ms|seconds|users|requests|req\/s|rps|queries|records|mb|gb|tb)\b/i.test(extractedText);
    const hasArchitecture = /architect|designed|optimized|concurrency|cache|thread|index|scalable|idempotent/i.test(extractedText);
    const hasTesting = /junit|mockito|testing|tdd|integration test|mock/i.test(lower);
    const hasDevOps = /docker|kubernetes|ci\/cd|jenkins|aws|cloud|github actions/i.test(lower);
    const hasCaching = /redis|caching|cache|memcached|hazelcast/i.test(lower);

    // Dynamic score calculation
    let baseScore = 65;
    if (detectedSkills.length >= 4) baseScore += 10;
    if (hasNumbers) baseScore += 10;
    if (hasArchitecture) baseScore += 5;
    if (hasTesting) baseScore += 5;
    if (hasDevOps) baseScore += 5;
    const score = Math.min(baseScore, 95);

    // Recommended additions
    const recommendedKeywords = [];
    if (!hasCaching) recommendedKeywords.push('Redis / Distributed Caching');
    if (!hasDevOps) recommendedKeywords.push('Docker / CI/CD Deployment');
    if (!hasTesting) recommendedKeywords.push('JUnit 5 / Mockito Unit Testing');
    if (!lower.includes('kafka') && !lower.includes('rabbitmq')) recommendedKeywords.push('Kafka / Message Queues');
    if (!lower.includes('indexing') && !lower.includes('query optimization')) recommendedKeywords.push('Database Indexing & Query Tuning');

    return {
      score,
      status: score >= 85 ? 'Strong ATS Alignment' : score >= 75 ? 'Good Potential • Key Gaps' : 'Needs Optimization',
      metricsFound: hasNumbers,
      hasArchitecture,
      hasTesting,
      hasDevOps,
      hasCaching,
      recommendedKeywords: recommendedKeywords.slice(0, 4)
    };
  }, [extractedText, detectedSkills]);

  // Sample STAR transformation bullets tailored for high impact
  const starTransformations = [
    {
      role: 'Project Architecture & Backend Engineering',
      before: 'Built Open Medi PCR automated reminder system for medicines using Spring Boot and MySQL.',
      after: 'Architected "Open Medi PCR" automated medication adherence engine in Java & Spring Boot, integrating Quartz schedulers and MySQL composite indexing; delivered 50,000+ daily dosage SMS/push reminders with 99.8% on-time delivery.',
      highlight: '+42% scheduler throughput, sub-250ms dispatch latency, 50k+ daily automated alerts'
    },
    {
      role: 'RESTful API & Database Optimization',
      before: 'Created REST API endpoints for user authentication and patient records in database.',
      after: 'Engineered idempotent RESTful microservice endpoints with Spring Security JWT tokens, Redis cache-aside caching, and HikariCP connection pooling; reduced p99 query latency by 38% under high concurrent read load.',
      highlight: '38% latency reduction, zero duplicate transaction charges, connection pooling'
    }
  ];

  const handleCopyBullet = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedBulletIdx(idx);
    setTimeout(() => setCopiedBulletIdx(null), 2000);
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-group">
          <div className="view-badge">
            <IconMyResume size={16} /> Resume Management & ATS Optimization
          </div>
          <h1>My Resume Profile</h1>
          <p className="view-subtitle">
            Upload your resume in PDF or DOCX format. Gemini AI parses your qualifications, extracts technical keywords, and crafts tailored interview questions.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="resume-grid">
        {/* Upload Card */}
        <div className="resume-upload-card">
          <h3>Upload or Replace Resume</h3>
          <p className="card-subtext">Supported formats: PDF (.pdf), Microsoft Word (.docx)</p>

          <div
            className={`drop-zone ${dragActive ? 'drop-zone-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="drop-zone-icon">
              <IconUpload size={40} />
            </div>
            <p className="drop-zone-title">
              {fileName ? fileName : 'Drag & drop your resume here'}
            </p>
            <p className="drop-zone-subtitle">or click to browse files from your computer</p>

            <label className="btn btn-secondary file-input-label">
              <span>Select File</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {loading && (
            <div className="loading-state">
              <div className="spinner-small" />
              <span>Analyzing resume with Gemini AI...</span>
            </div>
          )}

          {file && !loading && (
            <div className="file-info-bar">
              <div className="file-details">
                <span className="file-name-text">📄 {fileName}</span>
                <span className="file-size-text">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onStartWithResume && onStartWithResume(file, extractedText)}
              >
                <IconNewInterview size={16} />
                Launch Interview
              </button>
            </div>
          )}
        </div>

        {/* Extracted Details & Skills */}
        <div className="resume-details-card">
          <h3>Parsed Resume Content</h3>
          <p className="card-subtext">AI-detected skills & qualifications overview</p>

          {detectedSkills.length > 0 && (
            <div className="skills-section">
              <span className="skills-heading">Detected Competencies & Tech Stack:</span>
              <div className="skills-tags-wrap">
                {detectedSkills.map((s, idx) => (
                  <span key={idx} className="skill-chip">
                    <IconSparkles size={12} /> {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="extracted-text-box">
            {extractedText ? (
              <pre className="extracted-pre">{extractedText}</pre>
            ) : (
              <div className="empty-extract-placeholder">
                <IconMyResume size={32} />
                <p>Upload a resume to preview extracted content and AI-generated skills.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ACTIONABLE RESUME IMPROVEMENTS & RECOMMENDATIONS TO ADD IN RESUME      */}
      {/* ONLY DISPLAYED ONCE RESUME IS UPLOADED & PARSED (NOT PRE-FETCHED)     */}
      {/* --------------------------------------------------------------------- */}
      {file && extractedText && (
        <div className="resume-improvements-card">
          <div className="improvements-header-row">
            <div>
              <div className="improvements-tag">
                <IconSparkles size={14} /> AI Recruiter Benchmark Audit
              </div>
              <h2 className="improvements-title">
                Weaknesses & Recommended Improvements for Your Resume
              </h2>
              <p className="improvements-subtitle">
                Based on analysis of <strong>{fileName}</strong>, here are the critical gaps, weaknesses, and concrete recommendations to add to pass ATS filters and stand out to hiring managers.
              </p>
            </div>

            {resumeAnalysis.score !== null && (
              <div className="resume-ats-score-box">
                <div className="ats-score-circle">
                  <span className="ats-score-num">{resumeAnalysis.score}</span>
                  <span className="ats-score-denom">/100</span>
                </div>
                <div className="ats-score-meta">
                  <strong className="ats-score-label">ATS Readiness</strong>
                  <span className="ats-score-status">{resumeAnalysis.status}</span>
                </div>
              </div>
            )}
          </div>

          {/* Core Improvement Strategy Grid */}
          <div className="improvements-grid">
            {/* Card 1: STAR Quantification */}
            <div className="improvement-item-card">
              <div className="improvement-card-badge badge-metrics">
                <span>📊</span> 1. Quantify Impact with Concrete Numbers
              </div>
              <h4 className="improvement-item-title">Add Measurable Metrics to Every Project</h4>
              <p className="improvement-item-desc">
                {resumeAnalysis.metricsFound ? (
                  <span className="gap-detected-note note-good">✓ Good initial metrics detected, but ensure every project bullet has concrete throughput, latency, or user scale.</span>
                ) : (
                  <span className="gap-detected-note note-warn">⚠️ Weakness Detected: Your resume lacks quantifiable numbers. Recruiters reject duty-only descriptions.</span>
                )}
              </p>
              <div className="improvement-action-tip">
                <strong>💡 Add Numbers to Your Bullets:</strong>
                <ul>
                  <li>"Reduced API response latency by <strong>35%</strong> using Redis caching and query indexing"</li>
                  <li>"Handled <strong>10,000+ daily concurrent requests</strong> with zero downtime"</li>
                  <li>"Automated <strong>95%</strong> of manual reminder dispatch processes"</li>
                </ul>
              </div>
            </div>

            {/* Card 2: Deep Technical Mechanisms */}
            <div className="improvement-item-card">
              <div className="improvement-card-badge badge-arch">
                <span>🏗️</span> 2. Specify Architecture & Code Mechanisms
              </div>
              <h4 className="improvement-item-title">Explain HOW You Solved Problems, Not Just What</h4>
              <p className="improvement-item-desc">
                Instead of stating "built REST APIs with Spring Boot", highlight concrete engineering mechanisms that demonstrate architectural seniority.
              </p>
              <div className="improvement-action-tip">
                <strong>💡 Mechanisms to Explicitly Mention:</strong>
                <ul>
                  <li><strong>Concurrency:</strong> Thread pools (ExecutorService), optimistic locking, race condition mitigation</li>
                  <li><strong>Database:</strong> B-Tree composite indexing, connection pooling (HikariCP), ACID transactions</li>
                  <li><strong>Resilience:</strong> Idempotency keys, circuit breakers, rate limiting</li>
                </ul>
              </div>
            </div>

            {/* Card 3: In-Demand Missing Competencies */}
            <div className="improvement-item-card">
              <div className="improvement-card-badge badge-keywords">
                <span>🔍</span> 3. Add High-Demand Keywords & Tools
              </div>
              <h4 className="improvement-item-title">Target ATS Screening Keywords</h4>
              <p className="improvement-item-desc">
                Applicant Tracking Systems (ATS) filter resumes missing core infrastructure skills. Consider adding these relevant tools:
              </p>
              <div className="improvement-action-tip">
                <strong>💡 Recommended Competencies to Highlight:</strong>
                <div className="recommended-chips-wrap">
                  {resumeAnalysis.recommendedKeywords.map((kw, i) => (
                    <span key={i} className="recommended-kw-chip">
                      + {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4: Action Verbs */}
            <div className="improvement-item-card">
              <div className="improvement-card-badge badge-verbs">
                <span>✍️</span> 4. Replace Passive Phrases with High-Power Verbs
              </div>
              <h4 className="improvement-item-title">Upgrade Action Verbs for Stronger Authority</h4>
              <p className="improvement-item-desc">
                Replace weak introductory phrases ("Responsible for", "Worked on", "Assisted with") with assertive engineering verbs that convey ownership.
              </p>
              <div className="improvement-action-tip">
                <div className="verbs-comparison-table">
                  <div className="verb-col verb-avoid">
                    <span className="verb-header">❌ Avoid Weak:</span>
                    <span>"Worked on backend APIs"</span>
                    <span>"Helped fix database slow queries"</span>
                    <span>"Responsible for testing"</span>
                  </div>
                  <div className="verb-col verb-prefer">
                    <span className="verb-header">✅ Use High-Impact:</span>
                    <span><strong>"Architected</strong> REST microservices..."</span>
                    <span><strong>"Optimized</strong> SQL queries via indexing..."</span>
                    <span><strong>"Spearheaded</strong> unit test suite..."</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Before vs After Bullet Transformer */}
          <div className="star-transformer-box">
            <div className="star-transformer-header">
              <div>
                <span className="star-tag">📋 Recruiter STAR Transformation Template</span>
                <h3 className="star-title">Before vs. After: Upgrade Your Project Bullets</h3>
              </div>
              <span className="star-hint">Click "Copy" to use this high-impact structure in your resume</span>
            </div>

            <div className="star-examples-list">
              {starTransformations.map((item, idx) => (
                <div key={idx} className="star-example-row">
                  <div className="star-row-title">
                    <span className="star-role-pill">{item.role}</span>
                    <span className="star-highlight-pill">🎯 Focus: {item.highlight}</span>
                  </div>

                  <div className="star-comparison-grid">
                    <div className="star-block star-before">
                      <span className="star-block-badge badge-weak">❌ Standard / Weak Bullet</span>
                      <p className="star-bullet-text">"{item.before}"</p>
                      <span className="star-bullet-flaw">Lacks concrete scale, metrics, and architecture mechanisms.</span>
                    </div>

                    <div className="star-block star-after">
                      <div className="star-after-head">
                        <span className="star-block-badge badge-strong">✅ Recommended ATS & Recruiter Bullet</span>
                        <button
                          className="btn-copy-bullet"
                          onClick={() => handleCopyBullet(item.after, idx)}
                          title="Copy bullet to clipboard"
                        >
                          {copiedBulletIdx === idx ? (
                            <>
                              <IconCheck size={13} /> Copied!
                            </>
                          ) : (
                            <>📋 Copy</>
                          )}
                        </button>
                      </div>
                      <p className="star-bullet-text">"{item.after}"</p>
                      <span className="star-bullet-win">Quantified with metrics, Quartz schedulers, composite indexing, and 99.8% SLA.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
