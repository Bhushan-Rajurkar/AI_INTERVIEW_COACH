import React, { useState } from 'react';
import { api } from '../api/api';
import {
  IconNewInterview,
  IconSparkles,
  IconUpload,
  IconCheck,
  IconFileText,
  IconShield
} from './Icons';

export default function JobRoleInterviewView({ user, onStartSession, onRequireAuth }) {
  const [jobRole, setJobRole] = useState('Backend Java Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickRoles = [
    'Backend Java Engineer',
    'Full Stack Developer',
    'Frontend React Engineer',
    'DevOps & Cloud Engineer',
    'Python & Data Engineer',
    'AI / Machine Learning Engineer'
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setResumeFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobRole.trim()) {
      setError('Please provide a target job role.');
      return;
    }

    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('jobRole', jobRole.trim());
      if (jobDescription.trim()) {
        formData.append('jobDescription', jobDescription.trim());
      }
      if (resumeFile) {
        formData.append('resumeFile', resumeFile);
      }
      formData.append('difficulty', difficulty);
      formData.append('questionCount', questionCount);

      const res = await api.startRoleSpecificInterview(formData);
      if (res.success && res.data) {
        onStartSession(res.data);
      } else {
        throw new Error(res.message || 'Failed to start job-tailored interview');
      }
    } catch (err) {
      setError(err.message || 'Error generating role-tailored questions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-interview-container">
      {/* Header Banner */}
      <div className="card role-header-card">
        <div className="role-header-meta">
          <span className="badge badge-primary">
            <IconSparkles size={14} /> Job-Tailored Mock Interview
          </span>
          <span className="badge badge-success">Target Role Specific</span>
        </div>
        <h1 className="role-view-title">Target Job Role & JD Interview</h1>
        <p className="role-view-subtitle">
          Define your target job title and paste the job description (JD). Our AI coach parses the required
          technologies, seniority level, and key duties to generate highly relevant interview questions.
        </p>
      </div>

      {error && (
        <div className="card alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <p>{error}</p>
        </div>
      )}

      {/* Main Form Setup Card */}
      <div className="card role-form-card">
        <form onSubmit={handleSubmit}>
          {/* 1. Target Job Role Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="jobRoleInput">
              🎯 Target Job Role / Title <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="jobRoleInput"
              type="text"
              className="form-input"
              placeholder="e.g. Senior Backend Java Engineer, Cloud Architect..."
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              required
            />

            {/* Quick role pills */}
            <div className="quick-role-pills">
              <span className="quick-role-label">Popular Roles:</span>
              {quickRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={`role-select-pill ${jobRole === role ? 'active' : ''}`}
                  onClick={() => setJobRole(role)}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Job Description Textarea */}
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <div className="label-with-counter">
              <label className="form-label" htmlFor="jdInput">
                📋 Job Description (JD) & Key Requirements
              </label>
              <span className="jd-counter">
                {jobDescription.length} characters
              </span>
            </div>
            <textarea
              id="jdInput"
              className="form-textarea"
              rows={6}
              placeholder="Paste the job description, key responsibilities, required skills, or tech stack from LinkedIn, Indeed, etc..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <span className="form-helper-text">
              The AI will extract tools, architectural paradigms, and expectations mentioned in this JD to formulate tailored questions.
            </span>
          </div>

          {/* 3. Optional Resume Attachment */}
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label">
              📄 Candidate Resume <span className="optional-tag">(Optional)</span>
            </label>
            <div
              className={`optional-resume-dropzone ${resumeFile ? 'has-file' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="dropzone-icon">
                {resumeFile ? <IconCheck size={28} /> : <IconUpload size={28} />}
              </div>
              <div className="dropzone-text-group">
                <span className="dropzone-title">
                  {resumeFile ? resumeFile.name : 'Upload your resume to cross-reference with this JD'}
                </span>
                <span className="dropzone-subtitle">
                  Supports PDF or DOCX format (Optional). If skipped, interview questions focus strictly on the Job Description.
                </span>
              </div>
              <div className="dropzone-actions">
                <label className="btn btn-secondary btn-sm">
                  {resumeFile ? 'Replace File' : 'Browse File'}
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
                {resumeFile && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setResumeFile(null)}
                    title="Remove file"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4. Difficulty & Question Count Grid */}
          <div className="role-options-grid" style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">⚡ Difficulty Level</label>
              <div className="difficulty-pills-row">
                {['Easy', 'Medium', 'Hard'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`diff-pill-btn ${difficulty === lvl ? 'active' : ''}`}
                    onClick={() => setDifficulty(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">🔢 Number of Questions</label>
              <div className="question-count-pills-row">
                {[3, 5, 7, 10].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    className={`count-pill-btn ${questionCount === cnt ? 'active' : ''}`}
                    onClick={() => setQuestionCount(cnt)}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="role-submit-bar" style={{ marginTop: '2rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg start-role-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Crafting Job-Tailored Questions with Gemini AI...
                </>
              ) : (
                <>
                  <IconNewInterview size={19} />
                  Start Job-Tailored Interview ({questionCount} Questions)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

