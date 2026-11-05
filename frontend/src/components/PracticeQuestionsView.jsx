import React, { useState, useMemo } from 'react';
import { api } from '../api/api';
import {
  IconSparkles,
  IconUpload,
  IconFileText
} from './Icons';

/**
 * Parses inline code (`code`) and bold (**text**) with high-contrast keyword emphasis.
 */
function formatDocumentationInline(text) {
  if (!text) return null;
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="doc-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="doc-bold-keyword">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Renders individual line inside documentation sections (bullet, numbered list, or text).
 */
function renderDocLine(line, lIdx) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Bullet items (- or • or *)
  if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
    return (
      <div key={lIdx} className="doc-bullet-item">
        <span className="doc-bullet-bullet">▸</span>
        <span className="doc-bullet-content">
          {formatDocumentationInline(trimmed.replace(/^[-•*]\s*/, ''))}
        </span>
      </div>
    );
  }

  // Numbered list items (1. 2. 3.)
  const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
  if (numMatch) {
    return (
      <div key={lIdx} className="doc-numbered-item">
        <span className="doc-number-badge">{numMatch[1]}</span>
        <span className="doc-numbered-content">
          {formatDocumentationInline(numMatch[2])}
        </span>
      </div>
    );
  }

  return (
    <p key={lIdx} className="doc-text-line">
      {formatDocumentationInline(line)}
    </p>
  );
}

/**
 * Renders documentation-grade benchmark answers with section headers,
 * code blocks, bold keywords, and callout blocks.
 */
function renderDocumentationAnswer(text) {
  if (!text) return null;
  const blocks = text.split('\n\n');

  return (
    <div className="documentation-answer-body">
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n');
        const firstLine = lines[0].trim();

        // 1. Heading Block (### or ##)
        if (firstLine.startsWith('###') || firstLine.startsWith('##')) {
          const headingText = firstLine.replace(/^#+\s*/, '');
          const remainingLines = lines.slice(1);
          return (
            <div key={bIdx} className="doc-section-block">
              <div className="doc-section-title">
                <span className="doc-heading-hash">§</span>
                <span>{formatDocumentationInline(headingText)}</span>
              </div>
              {remainingLines.length > 0 && (
                <div className="doc-section-content">
                  {remainingLines.map((line, lIdx) => renderDocLine(line, lIdx))}
                </div>
              )}
            </div>
          );
        }

        // 2. Callout / Note Block (> 💡 or > 📌 or > Note:)
        if (firstLine.startsWith('>')) {
          const cleanCallout = lines.map((l) => l.replace(/^>\s*/, '')).join(' ');
          return (
            <div key={bIdx} className="doc-callout-box">
              <span className="doc-callout-icon">💡</span>
              <div className="doc-callout-text">
                {formatDocumentationInline(cleanCallout)}
              </div>
            </div>
          );
        }

        // 3. Regular block with lines (lists or paragraphs)
        return (
          <div key={bIdx} className="doc-paragraph-block">
            {lines.map((line, lIdx) => renderDocLine(line, lIdx))}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Renders unified question metadata: deduplicated keywords & recruiter coaching tip.
 * Kept compactly as metadata so the question card remains sleek and space-efficient.
 */
function renderQuestionMetadata(keyTopics, mustMentionKeywords, tipForAnswering, questionText) {
  // Extract words from question text to filter out question vocabulary
  const qText = (questionText || '').toLowerCase();
  const questionWords = new Set(
    qText
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );

  // Deduplicate keywords from keyTopics and mustMentionKeywords
  const rawList = [];
  if (mustMentionKeywords) {
    rawList.push(...mustMentionKeywords.split(/[,;•|]+/));
  }
  if (keyTopics) {
    rawList.push(...keyTopics.split(/[,;•|]+/));
  }

  const seen = new Set();
  const uniqueKeywords = [];
  rawList.forEach((item) => {
    const clean = item.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (seen.has(lower) || lower.length < 3) return;

    // Filter out if the keyword is just words from the question text
    const kwWords = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3);
    const allWordsInQuestion = kwWords.length > 0 && kwWords.every((w) => questionWords.has(w));
    const isExactSubstring = qText.includes(lower) && lower.length < 20;

    if (allWordsInQuestion || isExactSubstring) {
      return;
    }

    seen.add(lower);
    uniqueKeywords.push(clean);
  });

  if (!tipForAnswering && uniqueKeywords.length === 0) return null;

  return (
    <div className="qa-metadata-panel">
      {/* Recruiter Coaching Strategy */}
      {tipForAnswering && (
        <div className="qa-meta-tip-row">
          <span className="qa-meta-tip-icon">💡</span>
          <div className="qa-meta-tip-content">
            <span className="qa-meta-tip-label">Recruiter Coaching Tip:</span>
            <span className="qa-meta-tip-text">{tipForAnswering}</span>
          </div>
        </div>
      )}

      {/* Target Concepts & Mandatory Answer Keywords Metadata */}
      {uniqueKeywords.length > 0 && (
        <div className="qa-meta-keywords-row">
          <div className="qa-meta-keywords-header">
            <span className="qa-meta-keywords-label">🎯 Mandatory Answer Keywords:</span>
            <span className="qa-meta-keywords-sub">(Recruiter benchmark — terms candidate should answer with)</span>
          </div>
          <div className="qa-meta-chips-wrap">
            {uniqueKeywords.map((kw, idx) => (
              <span key={idx} className="qa-meta-keyword-chip">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PracticeQuestionsView({ user, onGoNewInterview }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [anticipationData, setAnticipationData] = useState(null);

  // Filters & State
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllAnswers, setShowAllAnswers] = useState(true);
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // NOTE: We do NOT fetch questions automatically before the user uploads their resume!
  // Once the resume is uploaded, fetchAnticipatedQuestions is triggered and adds questions into the practice list.

  const fetchAnticipatedQuestions = async (file) => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      if (file) {
        formData.append('resumeFile', file);
      }
      const res = await api.getPracticeQuestions(formData);
      if (res.success && res.data) {
        setAnticipationData(res.data);
      } else {
        throw new Error(res.message || 'Failed to analyze resume for questions');
      }
    } catch (err) {
      setError(err.message || 'Could not generate practice questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      fetchAnticipatedQuestions(file);
    }
  };

  // Drag & drop state for gateway
  const [dragActive, setDragActive] = useState(false);

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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setResumeFile(file);
      fetchAnticipatedQuestions(file);
    }
  };

  const handleLoadSample = () => {
    fetchAnticipatedQuestions(null);
  };

  // Compile full questions list (from allQuestions or from categories)
  const fullQuestionsList = useMemo(() => {
    if (!anticipationData) return [];
    if (anticipationData.allQuestions && anticipationData.allQuestions.length > 0) {
      return anticipationData.allQuestions;
    }
    // Fallback: extract from categories
    const list = [];
    let counter = 1;
    anticipationData.categories?.forEach((cat) => {
      cat.sampleQuestions?.forEach((sq) => {
        list.push({
          id: sq.id || counter++,
          category: sq.category || cat.categoryName,
          questionType: sq.questionType || 'Concept & Fundamentals',
          questionText: sq.questionText,
          keyTopics: sq.keyTopics,
          mustMentionKeywords: sq.mustMentionKeywords,
          tipForAnswering: sq.tipForAnswering,
          detailedAnswer: sq.detailedAnswer || sq.sampleAnswerSummary,
          sampleAnswerSummary: sq.sampleAnswerSummary
        });
      });
    });
    return list;
  }, [anticipationData]);

  // Extract unique question types present in current set
  const availableTypes = useMemo(() => {
    const types = new Set();
    fullQuestionsList.forEach((q) => {
      if (q.questionType) types.add(q.questionType);
    });
    return Array.from(types);
  }, [fullQuestionsList]);

  // Filter questions based on category, type, and search query
  const filteredQuestions = useMemo(() => {
    return fullQuestionsList.filter((q) => {
      const matchesCategory =
        activeCategoryFilter === 'all' || q.category === activeCategoryFilter;

      const matchesType =
        activeTypeFilter === 'all' ||
        (q.questionType && q.questionType.toLowerCase() === activeTypeFilter.toLowerCase());

      const qSearch = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !qSearch ||
        q.questionText?.toLowerCase().includes(qSearch) ||
        q.keyTopics?.toLowerCase().includes(qSearch) ||
        q.mustMentionKeywords?.toLowerCase().includes(qSearch) ||
        q.detailedAnswer?.toLowerCase().includes(qSearch) ||
        q.category?.toLowerCase().includes(qSearch) ||
        q.questionType?.toLowerCase().includes(qSearch);

      return matchesCategory && matchesType && matchesSearch;
    });
  }, [fullQuestionsList, activeCategoryFilter, activeTypeFilter, searchQuery]);

  // Toggle single answer
  const toggleAnswer = (id) => {
    setExpandedAnswers((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : !showAllAnswers
    }));
  };

  const isAnswerVisible = (id) => {
    if (expandedAnswers[id] !== undefined) {
      return expandedAnswers[id];
    }
    return showAllAnswers;
  };

  // Global toggle for all answers
  const handleToggleAllAnswers = () => {
    const nextState = !showAllAnswers;
    setShowAllAnswers(nextState);
    const updated = {};
    fullQuestionsList.forEach((q) => {
      updated[q.id] = nextState;
    });
    setExpandedAnswers(updated);
  };

  // Copy Question & Answer to clipboard
  const handleCopyQA = (q) => {
    const answerText = q.detailedAnswer || q.sampleAnswerSummary || '';
    const content = `Question #${q.id}: ${q.questionText}\nType: ${q.questionType || 'Concept'}\nCategory: ${q.category}\n\nKey Concepts: ${q.keyTopics || 'N/A'}\n\nMandatory Keywords: ${q.mustMentionKeywords || q.keyTopics || 'N/A'}\n\nCoach Tip: ${q.tipForAnswering || 'N/A'}\n\nBenchmark Answer:\n${answerText}`;
    navigator.clipboard?.writeText(content).then(() => {
      setCopiedId(q.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="practice-questions-view-container">
      {/* Space-Efficient Header Card (Shown once resume has been uploaded & analyzed) */}
      {anticipationData && (
        <div className="card practice-header-card compact-card">
          <div className="practice-header-top-row">
            <div className="practice-header-meta">
              <span className="badge badge-primary">
                <IconSparkles size={13} /> Resume Practice Question Bank
              </span>
              <span className="badge badge-success">
                {fullQuestionsList.length} Curated Questions
              </span>
            </div>
          </div>

          <h1 className="practice-view-title">Anticipated Interview Questions & Benchmark Answers</h1>
          <p className="practice-view-subtitle">
            Curated questions mapped from your resume competencies, complete with documentation-grade benchmark answers and mandatory keywords.
          </p>

          {/* Top Upload / Switch Strip */}
          <div
            className="practice-upload-strip compact-upload-strip"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="upload-strip-icon">
              <IconUpload size={20} />
            </div>
            <div className="upload-strip-info">
              <span className="upload-strip-title">
                {resumeFile ? `Analyzing: ${resumeFile.name}` : 'Switch or Upload New Resume (PDF / DOCX)'}
              </span>
              <span className="upload-strip-desc">
                Drop a new resume to re-analyze candidate skills and generate new practice questions
              </span>
            </div>
            <label className="btn btn-secondary btn-sm upload-strip-btn">
              Browse File
              <input
                type="file"
                accept=".pdf,.docx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>
      )}

      {/* 1. INITIAL STATE: Single Unified, Perfectly Aligned Interactive Gateway */}
      {!anticipationData && !loading && (
        <div className="card practice-gateway-unified-card">
          {/* Header Row with Badges */}
          <div className="gateway-header-row">
            <div className="gateway-meta-badges">
              <span className="badge badge-primary">
                <IconSparkles size={13} /> Resume Practice Question Bank
              </span>
              <span className="badge badge-success">
                Ready to Analyze Resume
              </span>
            </div>
          </div>

          {/* Unified Title & Subtitle */}
          <div className="gateway-hero-text">
            <h1 className="gateway-main-title">Anticipated Interview Questions & Benchmark Answers</h1>
            <p className="gateway-main-subtitle">
              Upload your resume to extract candidate competencies, map recruiter expectations, and generate at least 10
              tailored interview questions paired with documentation-grade benchmark answers and mandatory keywords.
            </p>
          </div>

          {/* Interactive Dropzone Gateway */}
          <div
            className={`gateway-dropzone ${dragActive ? 'gateway-dropzone-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="dropzone-inner">
              <div className="dropzone-icon-ring">
                <IconUpload size={32} />
              </div>
              <div className="dropzone-text-group">
                <span className="dropzone-primary-text">
                  {dragActive ? 'Drop your resume file here to analyze' : 'Drag & drop your resume file here'}
                </span>
                <span className="dropzone-secondary-text">Supported formats: PDF (.pdf) or Microsoft Word (.docx)</span>
              </div>

              <div className="dropzone-actions-row">
                <label className="btn btn-primary btn-lg gateway-browse-btn">
                  <IconFileText size={18} />
                  <span>Browse Resume File</span>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>

                <button
                  type="button"
                  className="btn btn-secondary btn-lg gateway-sample-btn"
                  onClick={handleLoadSample}
                  title="Generate benchmark questions with sample full-stack Java developer profile"
                >
                  <IconSparkles size={16} />
                  <span>Try Sample Developer Profile</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Interactive Feature Highlights Cards */}
          <div className="gateway-features-grid">
            <div className="gateway-feature-card">
              <span className="feature-card-icon">✨</span>
              <div className="feature-card-info">
                <strong className="feature-card-title">10+ Tailored Questions</strong>
                <p className="feature-card-desc">Architecture, concurrency & database items mapped to your resume stack.</p>
              </div>
            </div>

            <div className="gateway-feature-card">
              <span className="feature-card-icon">🔑</span>
              <div className="feature-card-info">
                <strong className="feature-card-title">Mandatory Keywords</strong>
                <p className="feature-card-desc">Recruiter benchmark terms you must mention in your answers.</p>
              </div>
            </div>

            <div className="gateway-feature-card">
              <span className="feature-card-icon">📖</span>
              <div className="feature-card-info">
                <strong className="feature-card-title">Benchmark Answers</strong>
                <p className="feature-card-desc">Documentation-grade solutions with code snippets & trade-offs.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Card during Resume Analysis */}
      {loading && (
        <div className="card loading-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <span className="spinner"></span>
          <p style={{ marginTop: '1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Analyzing candidate resume skills and generating 10+ questions with documentation-grade answers...
          </p>
        </div>
      )}

      {error && (
        <div className="card alert alert-error">
          <p>{error}</p>
        </div>
      )}

      {/* 2. POPULATED PRACTICE LIST: Shown once resume is uploaded */}
      {!loading && anticipationData && (
        <>
          {/* Candidate Profile Summary Banner - Compact */}
          <div className="card practice-profile-summary compact-card">
            <div className="profile-summary-header">
              <div className="profile-role-group">
                <span className="profile-label">Target Role Identified from Resume</span>
                <h2 className="profile-role-title">💼 {anticipationData.candidateRole || 'Backend Java Developer'}</h2>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => (onGoNewInterview ? onGoNewInterview() : null)}
              >
                🚀 Start Live Mock Interview
              </button>
            </div>

            {/* Identified Skills */}
            {anticipationData.topSkillsIdentified?.length > 0 && (
              <div className="profile-skills-row">
                <span className="skills-row-label">Key Competencies:</span>
                <div className="skills-tags-wrap">
                  {anticipationData.topSkillsIdentified.map((skill, idx) => (
                    <span key={idx} className="skill-tag-pill">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Focus Tips */}
            {anticipationData.recommendedFocusAreas?.length > 0 && (
              <div className="focus-areas-box compact-focus-box">
                <span className="focus-box-title">💡 Strategic Interview Advice:</span>
                <ul className="focus-areas-list">
                  {anticipationData.recommendedFocusAreas.map((tip, idx) => (
                    <li key={idx}>
                      <span className="focus-dot">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Controls & Filter Bar */}
          <div className="practice-controls-card card compact-card">
            <div className="practice-controls-top">
              <div className="practice-search-box">
                <input
                  type="text"
                  className="form-input practice-search-input"
                  placeholder="🔍 Search questions, keywords (e.g. Heap vs Stack, GC Roots, Idempotency, SQL)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="btn btn-ghost btn-sm clear-search-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              <div className="practice-actions-right">
                <button
                  className="btn btn-secondary btn-sm toggle-all-answers-btn"
                  onClick={handleToggleAllAnswers}
                >
                  {showAllAnswers ? '🙈 Hide All Answers' : '📖 Show All Answers'}
                </button>
              </div>
            </div>

            {/* Category Navigation Pills */}
            <div className="practice-filter-group">
              <div className="filter-group-header">
                <span className="filter-group-label">Filter by Category:</span>
              </div>
              <div className="practice-category-pills">
                <button
                  className={`practice-cat-pill ${activeCategoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategoryFilter('all')}
                >
                  All Categories ({fullQuestionsList.length})
                </button>
                {anticipationData.categories?.map((cat, idx) => (
                  <button
                    key={idx}
                    className={`practice-cat-pill ${activeCategoryFilter === cat.categoryName ? 'active' : ''}`}
                    onClick={() => setActiveCategoryFilter(cat.categoryName)}
                  >
                    {cat.categoryName} ({cat.sampleQuestions?.length || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Question Type Filter Pills */}
            {availableTypes.length > 0 && (
              <div className="practice-filter-group" style={{ marginTop: '0.5rem' }}>
                <div className="filter-group-header">
                  <span className="filter-group-label">Filter by Question Kind:</span>
                </div>
                <div className="practice-type-pills">
                  <button
                    className={`practice-type-pill ${activeTypeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTypeFilter('all')}
                  >
                    All Types ({fullQuestionsList.length})
                  </button>
                  {availableTypes.map((type, idx) => {
                    const count = fullQuestionsList.filter((q) => q.questionType === type).length;
                    return (
                      <button
                        key={idx}
                        className={`practice-type-pill ${activeTypeFilter === type ? 'active' : ''}`}
                        onClick={() => setActiveTypeFilter(type)}
                      >
                        🏷️ {type} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Questions & Benchmark Answers Stream */}
          <div className="practice-questions-bank">
            <div className="bank-header-row">
              <h3 className="bank-heading">
                Practice Questions Bank ({filteredQuestions.length} Questions Available)
              </h3>
              <span className="bank-subtext">
                Documentation-grade benchmark answers with bold keywords & must-mention recruiter terms
              </span>
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="card empty-questions-box" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>No questions matched your search criteria.</p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategoryFilter('all');
                    setActiveTypeFilter('all');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="questions-stream-list">
                {filteredQuestions.map((q, idx) => {
                  const visible = isAnswerVisible(q.id);
                  const answerContent = q.detailedAnswer || q.sampleAnswerSummary;

                  return (
                    <div key={q.id || idx} className="card practice-qa-card space-optimized-card">
                      {/* Top Meta: Q-Number, Question Type Badge, Category, Copy Action */}
                      <div className="qa-card-meta">
                        <div className="qa-meta-left">
                          <span className="qa-number-badge">#{q.id || idx + 1}</span>
                          {q.questionType && (
                            <span className="qa-type-pill">
                              🏷️ {q.questionType}
                            </span>
                          )}
                          <span className="qa-category-pill">{q.category}</span>
                        </div>
                        <div className="qa-actions-right">
                          <button
                            className="btn btn-ghost btn-sm qa-copy-btn"
                            onClick={() => handleCopyQA(q)}
                            title="Copy Question & Benchmark Answer"
                          >
                            {copiedId === q.id ? '✓ Copied!' : '📋 Copy Q&A'}
                          </button>
                          <button
                            className={`btn btn-sm ${visible ? 'btn-secondary' : 'btn-primary'} qa-toggle-btn`}
                            onClick={() => toggleAnswer(q.id)}
                          >
                            {visible ? 'Hide Answer' : 'View Answer'}
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <h4 className="qa-question-text">{q.questionText}</h4>

                      {/* Question Metadata Panel (Recruiter Tip & Deduplicated Key Answer Keywords) */}
                      {renderQuestionMetadata(q.keyTopics, q.mustMentionKeywords, q.tipForAnswering, q.questionText)}

                      {/* Documentation-Grade Benchmark Answer */}
                      {visible && answerContent && (
                        <div className="qa-documentation-container">
                          <div className="qa-doc-header">
                            <span className="qa-doc-badge">
                              <span className="badge-dot">●</span> Documentation Reference Answer
                            </span>
                            <span className="qa-doc-note">
                              Engineering specification format • Key concepts bolded
                            </span>
                          </div>
                          <div className="qa-doc-content-wrap">
                            {renderDocumentationAnswer(answerContent)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
