import React, { useState } from 'react';
import { api } from '../api/api';
import { IconUpload, IconSparkles, IconMyResume } from './Icons';

export default function ResumeUploadView({ user, onSessionStarted, onRequireAuth }) {
  const [file, setFile] = useState(null);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState('');
  const [extractedPreview, setExtractedPreview] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      validateAndSetFile(selected);
    }
  };

  const validateAndSetFile = (selected) => {
    const ext = selected.name.toLowerCase();
    if (!ext.endsWith('.pdf') && !ext.endsWith('.docx') && !ext.endsWith('.txt')) {
      setError('Please upload a valid PDF (.pdf) or Word document (.docx).');
      setFile(null);
      return;
    }
    setError('');
    setFile(selected);
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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleExtractPreview = async () => {
    if (!file) {
      setError('Please select a resume file first.');
      return;
    }
    setError('');
    setLoading(true);
    setLoadingStatus('Extracting content from your resume...');

    try {
      const formData = new FormData();
      formData.append('resumeFile', file);
      const res = await api.extractResume(formData);
      if (res.success && res.data) {
        setExtractedPreview(res.data.extractedText);
      }
    } catch (err) {
      setError(err.message || 'Failed to extract text from resume.');
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }

    if (!file) {
      setError('Please upload your resume (PDF or DOCX) to start the interview.');
      return;
    }

    setError('');
    setLoading(true);
    setLoadingStatus('Gemini AI is analyzing your background & crafting questions...');

    try {
      const formData = new FormData();
      formData.append('resumeFile', file);
      formData.append('difficulty', difficulty);
      formData.append('questionCount', questionCount);

      const res = await api.startWithResume(formData);

      if (res.success && res.data) {
        onSessionStarted(res.data);
      } else {
        throw new Error(res.message || 'Could not start interview.');
      }
    } catch (err) {
      setError(err.message || 'Failed to start interview session. Ensure file format is valid.');
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="setup-view-container">
      {/* Calm & Minimal Header */}
      <div className="setup-hero-section">
        <div className="setup-pill">
          <IconSparkles size={14} /> Mock Interview Setup
        </div>
        <h1 className="setup-main-title">Tailored Interview from Your Resume</h1>
        <p className="setup-subtitle">
          Upload your resume in PDF or DOCX format. Gemini AI analyzes your background and crafts realistic interview questions.
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="setup-card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="setup-form">
          {/* 1. Resume Upload Zone */}
          <div className="setup-section-block">
            <div className="setup-section-label">
              <span className="step-num">1</span>
              <span>Upload Resume (PDF or DOCX)</span>
            </div>

            <div
              className={`minimal-dropzone ${dragActive ? 'dropzone-drag' : ''} ${file ? 'dropzone-has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="resumeUploadInput"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="file-hidden-input"
              />

              {file ? (
                <div className="file-ready-box">
                  <div className="file-ready-icon">
                    <IconMyResume size={28} />
                  </div>
                  <div className="file-ready-info">
                    <span className="file-ready-name">{file.name}</span>
                    <span className="file-ready-size">
                      {(file.size / 1024).toFixed(1)} KB &bull; Verified Format
                    </span>
                  </div>
                  <label htmlFor="resumeUploadInput" className="file-replace-btn" title="Replace file">
                    Change
                  </label>
                </div>
              ) : (
                <label htmlFor="resumeUploadInput" className="dropzone-clickable-label">
                  <div className="dropzone-sage-icon">
                    <IconUpload size={32} />
                  </div>
                  <div className="dropzone-prompt-title">Drop your resume here, or click to browse</div>
                  <div className="dropzone-prompt-hint">Supports PDF and Word (.docx)</div>
                </label>
              )}
            </div>

            {file && (
              <div className="file-actions-row">
                <button
                  type="button"
                  className="preview-toggle-btn"
                  onClick={handleExtractPreview}
                  disabled={loading}
                >
                  <IconMyResume size={14} />
                  <span>Preview Extracted Skills & Text</span>
                </button>
              </div>
            )}

            {/* Extracted Preview Accordion */}
            {extractedPreview && (
              <div className="extracted-accordion">
                <div className="extracted-accordion-header">
                  <span>AI Extracted Resume Content</span>
                  <button
                    type="button"
                    className="close-link-btn"
                    onClick={() => setExtractedPreview('')}
                  >
                    Hide
                  </button>
                </div>
                <pre className="extracted-accordion-body">{extractedPreview}</pre>
              </div>
            )}
          </div>

          {/* 2. Difficulty Level */}
          <div className="setup-section-block">
            <div className="setup-section-label">
              <span className="step-num">2</span>
              <span>Select Difficulty Level</span>
            </div>

            <div className="difficulty-cards-grid">
              {[
                {
                  id: 'Easy',
                  badge: 'Core Basics',
                  desc: 'Fundamentals, core syntax, and clear conceptual explanations.'
                },
                {
                  id: 'Medium',
                  badge: 'Recommended',
                  desc: 'System architecture, practical trade-offs, and design.'
                },
                {
                  id: 'Hard',
                  badge: 'Deep Dive',
                  desc: 'Concurrency, edge cases, scalability, and distributed systems.'
                }
              ].map((diff) => {
                const isActive = difficulty === diff.id;
                return (
                  <div
                    key={diff.id}
                    className={`difficulty-choice-card ${isActive ? 'difficulty-choice-active' : ''}`}
                    onClick={() => setDifficulty(diff.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="diff-card-top">
                      <span className="diff-choice-name">{diff.id}</span>
                      <span className={`diff-pill-badge diff-badge-${diff.id.toLowerCase()}`}>
                        {diff.badge}
                      </span>
                    </div>
                    <p className="diff-choice-desc">{diff.desc}</p>
                    <div className="diff-card-indicator">
                      <span className={`radio-dot ${isActive ? 'radio-dot-checked' : ''}`} />
                      <span className="diff-level-text">{isActive ? 'Selected' : 'Select'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Number of Interview Questions */}
          <div className="setup-section-block">
            <div className="setup-section-label">
              <span className="step-num">3</span>
              <span>Number of Interview Questions</span>
            </div>

            <div className="question-count-pills">
              {[
                { count: 3, label: '3 Questions', hint: 'Quick' },
                { count: 5, label: '5 Questions', hint: 'Standard' },
                { count: 7, label: '7 Questions', hint: 'In-Depth' },
                { count: 10, label: '10 Questions', hint: 'Comprehensive' }
              ].map((item) => {
                const isActive = questionCount === item.count;
                return (
                  <button
                    key={item.count}
                    type="button"
                    className={`count-choice-pill ${isActive ? 'count-choice-active' : ''}`}
                    onClick={() => setQuestionCount(item.count)}
                  >
                    <span className="count-main-label">{item.label}</span>
                    <span className="count-sub-hint">{item.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit CTA Button */}
          <div className="setup-submit-wrap">
            <button
              type="submit"
              className="setup-launch-btn"
              disabled={loading || !file}
            >
              {loading ? (
                <span className="loading-state-inline">
                  <span className="spinner-sage"></span>
                  <span>{loadingStatus || 'Analyzing resume with Gemini AI...'}</span>
                </span>
              ) : (
                <>
                  <IconSparkles size={20} />
                  <span>Start AI Mock Interview</span>
                </>
              )}
            </button>
            {!file && (
              <p className="setup-submit-note">
                Please attach your resume above to proceed.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
