import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api/api';
import { IconDownload } from './Icons';

/**
 * Parses bold markdown (**bold**) safely into <strong> elements.
 */
function formatInlineMarkdown(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/**
 * Splits lines and formats bullet points systematically.
 */
function formatBulletLines(text) {
  if (!text) return null;
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  return lines.map((line, idx) => {
    const cleanLine = line.replace(/^[-*•]\s*/, '');
    return (
      <div key={idx} className="bullet-point-line">
        <span className="bullet-dot">•</span>
        <span className="bullet-text">{formatInlineMarkdown(cleanLine)}</span>
      </div>
    );
  });
}

// Comprehensive rulebook of technical ANSWER terms required for candidate answers (NOT question repetition)
const ANSWER_KEYWORD_RULES = [
  {
    regex: /introduce|yourself|background|about you/i,
    keywords: [
      'Production Architecture & Scalability',
      'REST APIs & Microservices',
      'Database Modeling & Indexing',
      'Latency & Throughput Metrics',
      'Engineering Ownership & Leadership'
    ]
  },
  {
    regex: /abstract\s*class|interface/i,
    keywords: [
      'Multiple Inheritance',
      'Default & Static Methods (Java 8+)',
      'Instance State & Constructors',
      'Contract vs Implementation Blueprint',
      'Polymorphism & Loose Coupling'
    ]
  },
  {
    regex: /heap|stack|garbage\s*collect|gc\b|memory\s*management|object\s*lifecycle/i,
    keywords: [
      'GC Roots & Reachability Tracing',
      'Eden, Survivor & Tenured Generations',
      'Mark-Sweep-Compact Algorithm',
      'Stack Frames & Method Primitives',
      'OutOfMemoryError (Heap Leak Prevention)'
    ]
  },
  {
    regex: /usestate|hook|react|component|virtual\s*dom/i,
    keywords: [
      'Virtual DOM Diffing & Reconciliation',
      'State Immutability Principle',
      'Component Re-render Trigger',
      'Batch State Updates',
      'Functional State Updaters'
    ]
  },
  {
    regex: /idempotent|idempotency/i,
    keywords: [
      'Client-Generated Idempotency Keys',
      'TTL Expiration in Redis',
      'HTTP Verbs (Safe vs Idempotent)',
      'Database Unique Constraints',
      'Distributed Lock Mechanics (Redlock)'
    ]
  },
  {
    regex: /primary\s*key|foreign\s*key/i,
    keywords: [
      'Referential Integrity Enforcement',
      'Unique & NOT NULL Constraint',
      'Cascading Deletes (ON DELETE CASCADE)',
      'Clustered vs Non-Clustered Index',
      'Parent-Child Table Relationships'
    ]
  },
  {
    regex: /n\+1|hibernate|jpa|entity\s*graph|lazy\s*load/i,
    keywords: [
      'JOIN FETCH Queries',
      'Hibernate Entity Graphs (@NamedEntityGraph)',
      'LazyInitializationException',
      'Batch Size Configuration (default_batch_fetch_size)',
      'Second-Level Cache'
    ]
  },
  {
    regex: /optimistic|pessimistic|locking|lock\b/i,
    keywords: [
      '@Version Column & Timestamp',
      'SELECT ... FOR UPDATE',
      'OptimisticLockException',
      'High vs Low Write Contention',
      'Deadlock Risk & Timeout'
    ]
  },
  {
    regex: /concurrency|multithread|thread|synchroniz|volatile|race\s*condition|deadlock|reentrantlock/i,
    keywords: [
      'Happens-Before Relationship',
      'ReentrantLock vs Synchronized Monitor',
      'CPU L1/L2 Cache Flushing & Visibility',
      'Deadlock Avoidance & Timeouts',
      'ExecutorService Thread Pools',
      'Atomic Variables (CAS - Compare-And-Swap)'
    ]
  },
  {
    regex: /transactional|transaction\s*management|rollback/i,
    keywords: [
      'Spring AOP Dynamic Proxy',
      'Unchecked RuntimeException Rollback',
      'Propagation (REQUIRED / REQUIRES_NEW)',
      'Isolation Levels (READ_COMMITTED / SERIALIZABLE)',
      'Self-Invocation Proxy Bypass'
    ]
  },
  {
    regex: /dependency\s*injection|inversion\s*of\s*control|\bioc\b|@component|@service|@repository|autowired/i,
    keywords: [
      'Constructor Injection vs Field Injection',
      'Inversion of Control (IoC) Container',
      'ApplicationContext Bean Lifecycle',
      'DataAccessException Hierarchy',
      'Loose Coupling & Unit Mocking'
    ]
  },
  {
    regex: /acid|base\b|relational\s*vs\s*nosql|sharding|cap\s*theorem/i,
    keywords: [
      'Atomicity & Durability',
      'Transaction Isolation Levels',
      'Write-Ahead Logging (WAL)',
      'Horizontal Sharding & Partitioning',
      'Eventual Consistency (BASE)'
    ]
  },
  {
    regex: /cache|caching|redis/i,
    keywords: [
      'Cache-Aside (Lazy Loading) Pattern',
      'TTL Expiration & Eviction Policies',
      'Cache Stampede Prevention',
      'Distributed Mutex Locking',
      'Write-Through vs Write-Behind'
    ]
  },
  {
    regex: /index|b-tree|query\s*optimization|full\s*table\s*scan/i,
    keywords: [
      'Logarithmic O(log N) Lookup',
      'Full Table Scan Elimination',
      'Composite Index Column Cardinality',
      'Tree Rebalancing Write Overhead',
      'Index Scan vs Range Scan'
    ]
  },
  {
    regex: /docker|container|virtual\s*machine|\bvm\b/i,
    keywords: [
      'Linux Namespaces (Process Isolation)',
      'Control Groups (cgroups Resource Limits)',
      'Shared Host Kernel',
      'OCI Image Layers & Dockerfile',
      'Hypervisor Overhead Elimination'
    ]
  },
  {
    regex: /python|tuple|list\b|\bgil\b/i,
    keywords: [
      'Mutability vs Immutability',
      'Memory Over-allocation & Resizing',
      'Hashable Dictionary Keys',
      'Global Interpreter Lock (GIL)',
      'O(1) Element Lookup'
    ]
  },
  {
    regex: /debug|troubleshoot|bottleneck|error|bug\b|slow/i,
    keywords: [
      'Correlation IDs & Distributed Tracing',
      'Heap Dump Analysis (OOM Prevention)',
      'Regression Unit Test Reproduction',
      'APM Profiler (VisualVM/Async-Profiler)',
      'Slow Query Execution Plans (EXPLAIN)'
    ]
  },
  {
    regex: /microservice|circuit\s*breaker|resilience|distributed|kafka|queue/i,
    keywords: [
      'Circuit Breaker (CLOSED / OPEN / HALF-OPEN)',
      'Event-Driven Asynchronous Messaging',
      'Service Discovery & Health Check',
      'Idempotent Event Consumers',
      'Distributed Tracing & Correlation IDs'
    ]
  },
  {
    regex: /rest|http|status\s*code|cors|endpoint/i,
    keywords: [
      'Standard HTTP Status Codes (400/401/403/404/422)',
      'CORS Preflight Headers (OPTIONS)',
      'Stateless Bearer Tokens (JWT)',
      'JSON Payload Validation',
      'Rate Limiting (429 Too Many Requests)'
    ]
  },
  {
    regex: /project|resume|built|architecture|scalable/i,
    keywords: [
      'Layered Architecture (Controller-Service-Repo)',
      'STAR Quantified Production Metrics',
      'Database Concurrency & Locking',
      'Error Handling Middleware',
      'Throughput & Latency Optimization'
    ]
  }
];

/**
 * Extracts candidate ANSWER keywords that the user should speak in their interview.
 * Intelligently filters out trivial words that already appear in the question itself.
 */
function getTargetKeywords(q) {
  if (!q) return [];

  // Extract question tokens to filter out words from the question prompt
  const questionText = (q.questionText || '').toLowerCase();
  const questionWords = new Set(
    questionText
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );

  const rawKeywords = [];

  // If question has explicitly populated keywords, include them
  if (Array.isArray(q.mustMentionKeywords) && q.mustMentionKeywords.length > 0) {
    rawKeywords.push(...q.mustMentionKeywords);
  } else if (typeof q.mustMentionKeywords === 'string' && q.mustMentionKeywords.trim()) {
    rawKeywords.push(...q.mustMentionKeywords.split(/[,;•|]+/).map((s) => s.trim()));
  }

  if (Array.isArray(q.keywords) && q.keywords.length > 0) {
    rawKeywords.push(...q.keywords);
  } else if (typeof q.keywords === 'string' && q.keywords.trim()) {
    rawKeywords.push(...q.keywords.split(/[,;•|]+/).map((s) => s.trim()));
  }

  // Extract bold technical terms from model answer if available
  if (q.modelAnswer) {
    const boldMatches = q.modelAnswer.match(/\*\*([^*]+)\*\*/g);
    if (boldMatches) {
      boldMatches.forEach((m) => {
        const cleaned = m.replace(/\*\*/g, '').trim();
        if (
          cleaned.length >= 4 &&
          cleaned.length <= 40 &&
          !cleaned.toLowerCase().includes('section') &&
          !cleaned.toLowerCase().includes('recruiter')
        ) {
          rawKeywords.push(cleaned);
        }
      });
    }
  }

  // Match answer keyword rulebook based on question content
  const content = `${q.questionText || ''} ${q.category || ''} ${q.modelAnswer || ''}`.toLowerCase();
  for (const r of ANSWER_KEYWORD_RULES) {
    if (r.regex.test(content)) {
      rawKeywords.push(...r.keywords);
    }
  }

  // Filter: strictly keep keywords that are ANSWER keywords, NOT trivial question words
  const cleanKeywords = [];
  const seen = new Set();

  for (const kw of rawKeywords) {
    if (!kw || typeof kw !== 'string') continue;
    const trimmed = kw.trim();
    const lower = trimmed.toLowerCase();

    if (lower.length < 3 || seen.has(lower)) continue;

    // Check if every meaningful word in this keyword was already in the question text
    const kwWords = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3);
    const allWordsInQuestion = kwWords.length > 0 && kwWords.every((w) => questionWords.has(w));
    const isExactQuestionSubstring = questionText.includes(lower) && lower.length < 20;

    // Filter out keywords that only repeat the question's own vocabulary
    if (allWordsInQuestion || isExactQuestionSubstring) {
      continue;
    }

    seen.add(lower);
    cleanKeywords.push(trimmed);
  }

  if (cleanKeywords.length >= 3) {
    return cleanKeywords.slice(0, 5);
  }

  return [
    'System Architecture & Flow',
    'Concrete Code Mechanisms',
    'STAR Quantified Production Metrics',
    'Concurrency & Edge Cases',
    'Engineering Trade-off Justifications'
  ];
}

export default function SessionSummaryView({ sessionId, onStartNew, onViewHistory }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toggle state to control display of questions & answers breakdown
  const [showQuestions, setShowQuestions] = useState(false);
  // Filter tab for systematic question inspection: 'all' or index
  const [selectedQuestionTab, setSelectedQuestionTab] = useState('all');

  const questionsSectionRef = useRef(null);

  useEffect(() => {
    if (sessionId) {
      loadSummary();
    }
  }, [sessionId]);

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSessionSummary(sessionId);
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        throw new Error(res.message || 'Could not load session summary');
      }
    } catch (err) {
      setError(err.message || 'Failed to load session summary.');
    } finally {
      setLoading(false);
    }
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleToggleQuestions = () => {
    setShowQuestions((prev) => {
      const nextState = !prev;
      if (nextState) {
        setTimeout(() => {
          questionsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
      return nextState;
    });
  };

  // Triggers clean 1-page executive summary PDF export
  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    const originalTitle = document.title;
    const cleanRole = (summary?.jobRole || 'Interview').replace(/[^a-zA-Z0-9_-]/g, '_');
    const formattedScore = score.toFixed(1);
    const dateStr = new Date().toISOString().slice(0, 10);
    document.title = `AI_Coach_1Page_Report_${cleanRole}_Score_${formattedScore}_${dateStr}`;

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
        setIsExportingPdf(false);
      }, 800);
    }, 150);
  };

  // Filter out redundant metadata bullets from Gemini feedback
  const cleanCoachAdvice = useMemo(() => {
    if (!summary?.summaryFeedback) return '';
    return summary.summaryFeedback
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => {
        if (!l) return false;
        if (l.startsWith('- **Total Questions') || l.startsWith('- Total Questions')) return false;
        if (l.startsWith('- **Difficulty Level') || l.startsWith('- Difficulty Level')) return false;
        if (l.startsWith('- **Overall Score') || l.startsWith('- Overall Score')) return false;
        if (l.startsWith('- **Target Resume') || l.startsWith('- Target Resume')) return false;
        return true;
      })
      .join(' ')
      .trim();
  }, [summary?.summaryFeedback]);

  // Extract resume filename from DTO or feedback
  const targetResume = useMemo(() => {
    if (summary?.resumeFileName) return summary.resumeFileName;
    const match = summary?.summaryFeedback?.match(/- \*\*Target Resume:\*\*\s*(.+)/i);
    return match ? match[1].trim() : null;
  }, [summary]);

  // Extract top areas for improvement across session questions
  const sessionAreasToImprove = useMemo(() => {
    if (!summary?.questions) return [];
    const list = [];
    summary.questions.forEach((q) => {
      if (q.areasToImprove && q.areasToImprove.trim()) {
        const lines = q.areasToImprove
          .split('\n')
          .map((l) => l.replace(/^[-•*]\s*/, '').trim())
          .filter(Boolean);
        lines.forEach((line) => {
          if (!list.includes(line)) list.push(line);
        });
      }
    });
    return list.slice(0, 3);
  }, [summary?.questions]);

  // Extract top demonstrated strengths across session questions
  const sessionStrengths = useMemo(() => {
    if (!summary?.questions) return [];
    const list = [];
    summary.questions.forEach((q) => {
      if (q.strengths && q.strengths.trim()) {
        const lines = q.strengths
          .split('\n')
          .map((l) => l.replace(/^[-•*]\s*/, '').trim())
          .filter(Boolean);
        lines.forEach((line) => {
          if (!list.includes(line)) list.push(line);
        });
      }
    });
    return list.slice(0, 3);
  }, [summary?.questions]);

  if (loading) {
    return (
      <div className="card loading-card" style={{ padding: '3.5rem', textAlign: 'center' }}>
        <span className="spinner"></span>
        <p style={{ marginTop: '1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Compiling final performance report with Gemini AI...
        </p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="card alert alert-error">
        <p>{error || 'Session summary not available.'}</p>
        <button className="btn btn-primary" onClick={onStartNew} style={{ marginTop: '1rem' }}>
          Start New Interview
        </button>
      </div>
    );
  }

  const score = summary.overallScore !== null ? summary.overallScore : 0.0;
  const questionsList = summary.questions || [];
  const totalQuestions = questionsList.length;
  const answeredQuestions = questionsList.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length;

  // Determine Tier and class
  let tierInfo = {
    label: 'Needs Practice',
    tierClass: 'tier-practice',
    scoreClass: 'score-low',
    icon: '💡'
  };
  if (score >= 8.5) {
    tierInfo = { label: 'Elite Mastery', tierClass: 'tier-elite', scoreClass: 'score-high', icon: '🌟' };
  } else if (score >= 7.0) {
    tierInfo = { label: 'Interview Ready', tierClass: 'tier-ready', scoreClass: 'score-mid', icon: '👍' };
  } else if (score >= 5.0) {
    tierInfo = { label: 'Developing Baseline', tierClass: 'tier-developing', scoreClass: 'score-mid', icon: '📈' };
  }

  // Calculate SVG stroke offset for circular gauge
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(Math.max(score, 0), 10) / 10) * circumference;

  // Filter questions based on selected tab
  const displayedQuestions =
    selectedQuestionTab === 'all'
      ? questionsList
      : questionsList.filter((_, idx) => idx === selectedQuestionTab);

  return (
    <div className="session-summary-container">
      {/* ------------------------------------------------------------- */}
      {/* EXCLUSIVE 1-PAGE EXECUTIVE PDF REPORT (STRICTLY PRINT-ONLY)  */}
      {/* ------------------------------------------------------------- */}
      <div className="one-page-pdf-document">
        {/* Header */}
        <div className="pdf-doc-header">
          <div className="pdf-brand-col">
            <h1 className="pdf-doc-title">AI Interview Coach — Executive Report</h1>
            <p className="pdf-doc-subtitle">Candidate Performance Evaluation & Gap Analysis</p>
          </div>
          <div className="pdf-meta-col">
            <div className="pdf-meta-item"><strong>Target Role:</strong> {summary.jobRole || 'Software Engineer'}</div>
            <div className="pdf-meta-item"><strong>Date:</strong> {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            <div className="pdf-meta-item"><strong>Difficulty:</strong> {summary.difficulty || 'Medium'} Level</div>
          </div>
        </div>

        {/* Top KPI & Score Strip */}
        <div className="pdf-kpi-score-strip">
          <div className="pdf-score-box">
            <div className="pdf-score-main">
              <span className="pdf-score-val">{score.toFixed(1)}</span>
              <span className="pdf-score-denom">/ 10</span>
            </div>
            <span className={`pdf-tier-pill ${tierInfo.tierClass}`}>
              {tierInfo.icon} {tierInfo.label}
            </span>
          </div>

          <div className="pdf-metrics-summary">
            <div className="pdf-metric-row">
              <span className="metric-name">Questions Evaluated:</span>
              <strong className="metric-val">{totalQuestions} Questions ({answeredQuestions} completed)</strong>
            </div>
            {targetResume && (
              <div className="pdf-metric-row">
                <span className="metric-name">Analyzed Resume:</span>
                <strong className="metric-val">{targetResume}</strong>
              </div>
            )}
            {cleanCoachAdvice && (
              <div className="pdf-coach-summary-box">
                <strong>Executive Assessment:</strong> {cleanCoachAdvice}
              </div>
            )}
          </div>
        </div>

        {/* 2-Column: Key Strengths vs Priority Areas to Improve */}
        <div className="pdf-strengths-improvements-grid">
          {/* Demonstrated Strengths */}
          <div className="pdf-panel pdf-strengths-panel">
            <div className="pdf-panel-title">
              <span>✅</span> Candidate Strengths
            </div>
            <ul className="pdf-panel-list">
              {sessionStrengths.length > 0 ? (
                sessionStrengths.map((str, idx) => <li key={idx}>{str}</li>)
              ) : (
                <li>Demonstrated fundamental understanding of core technical concepts.</li>
              )}
            </ul>
          </div>

          {/* Priority Areas for Improvement */}
          <div className="pdf-panel pdf-improvements-panel">
            <div className="pdf-panel-title">
              <span>💡</span> Priority Areas for Improvement
            </div>
            <ul className="pdf-panel-list">
              {sessionAreasToImprove.length > 0 ? (
                sessionAreasToImprove.map((imp, idx) => <li key={idx}>{imp}</li>)
              ) : (
                <li>Elaborate with deeper architectural trade-offs, code mechanisms, and concrete edge cases.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Question Scorecard Matrix (Compact Table) */}
        <div className="pdf-scorecard-section">
          <div className="pdf-scorecard-header">
            <span>Session Question Scorecard & Specific Feedback</span>
          </div>
          <table className="pdf-scorecard-table">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>#</th>
                <th style={{ width: '28%' }}>Topic / Question Prompt</th>
                <th style={{ width: '12%' }}>Score</th>
                <th style={{ width: '52%' }}>Key Evaluation & Improvement Advice</th>
              </tr>
            </thead>
            <tbody>
              {questionsList.map((q, idx) => {
                const qScore = q.score !== null ? q.score : 0.0;
                const feedbackSummary = q.areasToImprove
                  ? q.areasToImprove.replace(/^[-•*]\s*/, '').split('\n')[0]
                  : (q.feedback || 'Review reference answer patterns.');
                const targetKws = getTargetKeywords(q);

                return (
                  <tr key={q.id || idx}>
                    <td className="center-cell"><strong>Q{q.questionOrder}</strong></td>
                    <td>
                      <div className="table-topic-tag">{q.category || 'Core Technical'}</div>
                      <div className="table-question-short">
                        {q.questionText?.length > 65 ? q.questionText.substring(0, 63) + '...' : q.questionText}
                      </div>
                      <div className="table-keywords-row">
                        <span className="table-kw-label">Target Answer Keywords:</span> {targetKws.slice(0, 3).join(', ')}
                      </div>
                    </td>
                    <td className="center-cell">
                      <span className="table-score-badge">
                        {qScore.toFixed(1)} / 10
                      </span>
                    </td>
                    <td className="table-feedback-cell">
                      {feedbackSummary}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pdf-doc-footer">
          <span>AI Interview Coach • 1-Page Executive Summary Performance Report</span>
          <span>Confidential Assessment • Generated {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Systematic Hero Performance Card (On-Screen Interactive) */}
      <div className="card summary-hero-card">
        <div className="summary-hero-content">
          <div className="summary-badge-row">
            <span className="summary-pill role-pill">💼 {summary.jobRole || 'Resume Interview'}</span>
            <span className={`summary-pill diff-pill diff-${(summary.difficulty || 'medium').toLowerCase()}`}>
              ⚡ {summary.difficulty || 'Medium'} Level
            </span>
            <span className="summary-pill status-pill">✓ Completed</span>
          </div>

          <h1 className="summary-title">Interview Performance Report</h1>

          {cleanCoachAdvice && (
            <div className="summary-coach-assessment">
              {formatInlineMarkdown(cleanCoachAdvice)}
            </div>
          )}

          {/* Systematic Space-Efficient KPI Grid */}
          <div className="summary-kpi-grid">
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Total Questions</span>
              <span className="kpi-mini-value">{totalQuestions} Questions</span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Completed Answers</span>
              <span className="kpi-mini-value">{answeredQuestions} of {totalQuestions}</span>
            </div>
            <div className="kpi-mini-card">
              <span className="kpi-mini-label">Overall Score</span>
              <span className="kpi-mini-value">{score.toFixed(1)} / 10.0</span>
            </div>
            {targetResume && (
              <div className="kpi-mini-card kpi-mini-card-wide" title={targetResume}>
                <span className="kpi-mini-label">Target Resume</span>
                <span className="kpi-mini-value">
                  📄 {targetResume.length > 28 ? targetResume.substring(0, 26) + '...' : targetResume}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Circular Score Gauge & Tier */}
        <div className="summary-score-hero">
          <div className="score-circular-gauge">
            <svg className="score-gauge-svg" viewBox="0 0 110 110">
              <circle
                className="score-gauge-track"
                cx="55"
                cy="55"
                r={radius}
              />
              <circle
                className={`score-gauge-indicator ${tierInfo.tierClass}`}
                cx="55"
                cy="55"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="score-gauge-inner">
              <span className="score-gauge-num">{score.toFixed(1)}</span>
              <span className="score-gauge-denom">/ 10</span>
            </div>
          </div>

          <span className={`score-tier-badge ${tierInfo.tierClass}`}>
            {tierInfo.icon} {tierInfo.label}
          </span>
        </div>
      </div>

      {/* Systematic Action Bar with PDF Download & Q&A Toggle */}
      <div className="summary-actions-bar">
        {/* 1-PAGE SUMMARY PDF DOWNLOAD BUTTON */}
        <button
          className="btn btn-primary btn-lg download-pdf-btn"
          onClick={handleDownloadPdf}
          disabled={isExportingPdf}
          title="Download the 1-page executive summary and areas to improve as a PDF"
        >
          <IconDownload size={18} />
          <span>{isExportingPdf ? 'Preparing 1-Page PDF...' : '📥 Download 1-Page Summary PDF'}</span>
        </button>

        {/* REPORT BUTTON TO DISPLAY QUESTIONS & ANSWERS */}
        <button
          className={`btn ${showQuestions ? 'btn-secondary' : 'btn-primary'} btn-lg toggle-questions-btn`}
          onClick={handleToggleQuestions}
        >
          {showQuestions ? (
            <>▲ Hide Questions & Answers</>
          ) : (
            <>📋 View Questions & Answers ({totalQuestions})</>
          )}
        </button>

        <button className="btn btn-secondary btn-lg" onClick={onStartNew}>
          🚀 Practice Another Interview
        </button>
        <button className="btn btn-secondary btn-lg" onClick={onViewHistory}>
          📊 View All Sessions & Trends
        </button>
      </div>

      {/* Systematic Question-by-Question Section (Displayed when button is clicked) */}
      {showQuestions && (
        <div className="questions-breakdown-section" ref={questionsSectionRef}>
          <div className="breakdown-section-header">
            <div>
              <h2 className="breakdown-section-title">
                Detailed Question & Answer Review
              </h2>
              <p className="breakdown-section-subtitle">
                Inspect question prompts, candidate transcribed answers, AI strengths, and improvement suggestions.
              </p>
            </div>

            {/* Systematic Question Navigator Pills */}
            {totalQuestions > 1 && (
              <div className="question-nav-pills">
                <button
                  className={`question-nav-btn ${selectedQuestionTab === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedQuestionTab('all')}
                >
                  All Questions ({totalQuestions})
                </button>
                {questionsList.map((q, idx) => (
                  <button
                    key={q.id || idx}
                    className={`question-nav-btn ${selectedQuestionTab === idx ? 'active' : ''}`}
                    onClick={() => setSelectedQuestionTab(idx)}
                  >
                    Q{q.questionOrder}
                    <span className="nav-btn-score">
                      {q.score !== null ? q.score.toFixed(1) : '—'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Question Cards List */}
          <div className="breakdown-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {displayedQuestions.map((q) => {
              const qScore = q.score !== null ? q.score : 0.0;
              const qScoreClass = qScore >= 8.0 ? 'score-high' : qScore >= 5.0 ? 'score-mid' : 'score-low';

              return (
                <div key={q.id} className="card breakdown-card">
                  {/* Card Header Row */}
                  <div className="breakdown-card-header">
                    <div className="breakdown-header-meta">
                      <span className="breakdown-order-badge">Question {q.questionOrder}</span>
                      <span className="breakdown-category-badge">{q.category || 'Core Technical'}</span>
                    </div>
                    <div className={`breakdown-score-pill ${qScoreClass}`}>
                      <span className="breakdown-score-num">{qScore.toFixed(1)}</span>
                      <span className="breakdown-score-denom">/ 10</span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <h3 className="breakdown-question-text">{q.questionText}</h3>

                  {/* Candidate Transcribed Answer */}
                  <div className="breakdown-candidate-answer">
                    <span className="candidate-answer-tag">💬 Candidate Response</span>
                    <p className="candidate-answer-quote">
                      {q.userAnswer && q.userAnswer.trim().length > 0 ? (
                        `“${q.userAnswer.trim()}”`
                      ) : (
                        <em className="no-answer-text">No voice or typed answer was recorded for this question.</em>
                      )}
                    </p>
                  </div>

                  {/* Recruiter Expected Keywords */}
                  <div className="breakdown-keywords-bar">
                    <div className="keywords-bar-header">
                      <span className="keywords-bar-icon">🔑</span>
                      <strong className="keywords-bar-title">Target Technical Terms for Candidate Answer:</strong>
                    </div>
                    <div className="keywords-chip-list">
                      {getTargetKeywords(q).map((kw, i) => (
                        <span key={i} className="target-keyword-chip">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Systematic 2-Column Side-by-Side Feedback */}
                  <div className="breakdown-feedback-columns">
                    <div className="feedback-col feedback-col-strengths">
                      <div className="feedback-col-header">
                        <span className="feedback-col-icon">✅</span>
                        <span className="feedback-col-title">Key Strengths</span>
                      </div>
                      <div className="feedback-col-body">
                        {formatBulletLines(q.strengths || q.feedback || 'Demonstrated foundational concepts.')}
                      </div>
                    </div>

                    <div className="feedback-col feedback-col-improvements">
                      <div className="feedback-col-header">
                        <span className="feedback-col-icon">💡</span>
                        <span className="feedback-col-title">Areas to Improve</span>
                      </div>
                      <div className="feedback-col-body">
                        {formatBulletLines(
                          q.areasToImprove || 'Elaborate with concrete architectural trade-offs and code mechanisms.'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reference Model Answer Accordion */}
                  {q.modelAnswer && (
                    <details className="breakdown-model-accordion">
                      <summary className="model-accordion-summary">
                        <span className="model-summary-icon">📖</span>
                        <span>View Reference Model Answer</span>
                        <span className="model-accordion-chevron">▾</span>
                      </summary>
                      <div className="model-accordion-content">
                        <p>{q.modelAnswer}</p>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Back-to-Top / Collapse Button */}
          <div className="breakdown-footer-controls">
            <button className="btn btn-secondary btn-sm" onClick={handleToggleQuestions}>
              ▲ Collapse Questions Section
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
