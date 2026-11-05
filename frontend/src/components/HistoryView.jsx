import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { IconHistory, IconNewInterview, IconTrash } from './Icons';

export default function HistoryView({ onSelectSession, onStartNew }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getHistory();
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load interview history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this interview session? This cannot be undone.')) {
      return;
    }

    setDeletingId(sessionId);
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      alert('Failed to delete session: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading-state">
          <div className="spinner-sage" />
          <span>Loading interview history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container history-view-wrap">
      {/* Page Header */}
      <div className="history-header-card">
        <div className="history-header-left">
          <div className="view-badge">
            <IconHistory size={15} /> Practice Archives
          </div>
          <h1 className="history-heading">Interview History</h1>
          <p className="history-subheading">
            Review past mock interview evaluations, scores, and AI coaching feedback.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onStartNew}>
          <IconNewInterview size={18} />
          <span>New Interview</span>
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* SESSIONS LIST */}
      <div className="history-content-section">
        {sessions.length === 0 ? (
          <div className="card empty-history-card">
            <div className="empty-history-icon">
              <IconHistory size={42} />
            </div>
            <h3>No Mock Interviews Conducted Yet</h3>
            <p>Upload your resume to complete your first personalized AI interview session.</p>
            <button className="btn btn-primary" onClick={onStartNew} style={{ marginTop: '0.85rem' }}>
              <IconNewInterview size={16} />
              <span>Start Your First Session</span>
            </button>
          </div>
        ) : (
          <div className="history-table-container card">
            <div className="history-count-bar">
              <span>All Completed & In-Progress Sessions (<strong>{sessions.length}</strong>)</span>
            </div>

            {/* Desktop / Tablet Grid Table */}
            <div className="history-grid-table">
              <div className="history-table-head">
                <span className="th-role">Target Role & Difficulty</span>
                <span className="th-date">Date</span>
                <span className="th-questions">Questions</span>
                <span className="th-score">AI Score</span>
                <span className="th-actions">Actions</span>
              </div>

              <div className="history-table-rows">
                {sessions.map((s) => {
                  const score = s.overallScore !== null ? s.overallScore : null;
                  const diff = (s.difficultyLevel || s.difficulty || 'Medium');
                  const role = s.jobRole || 'Resume Interview';
                  const isCompleted = s.status === 'COMPLETED';

                  return (
                    <div
                      key={s.id}
                      className="history-row-item"
                      onClick={() => onSelectSession(s.id)}
                      role="button"
                      tabIndex={0}
                    >
                      {/* Role & Difficulty */}
                      <div className="td-role">
                        <div className="role-title-text">{role}</div>
                        <div className="role-meta-tags">
                          <span className={`diff-pill-badge diff-badge-${diff.toLowerCase()}`}>
                            {diff}
                          </span>
                          {s.resumeFileName && (
                            <span className="resume-tag-pill" title={s.resumeFileName}>
                              📄 {s.resumeFileName.length > 22 ? s.resumeFileName.substring(0, 20) + '...' : s.resumeFileName}
                            </span>
                          )}
                          <span className={`status-pill ${isCompleted ? 'status-pill-completed' : 'status-pill-progress'}`}>
                            {isCompleted ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="td-date">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'Recent'}
                      </div>

                      {/* Question Count */}
                      <div className="td-questions">
                        {s.totalQuestions || s.questions?.length || 5} Questions
                      </div>

                      {/* Score Badge */}
                      <div className="td-score">
                        {score !== null ? (
                          <div className="history-score-badge">
                            <span className="score-val">{score.toFixed(1)}</span>
                            <span className="score-denom">/10</span>
                          </div>
                        ) : (
                          <span className="score-pending-badge">In Progress</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="td-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onSelectSession(s.id)}
                        >
                          View Report &rarr;
                        </button>

                        <button
                          type="button"
                          className="delete-icon-btn"
                          disabled={deletingId === s.id}
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          title="Delete Session"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
