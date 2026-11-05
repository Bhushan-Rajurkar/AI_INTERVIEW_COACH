import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import {
  BrainAiLogo,
  IconNewInterview,
  IconMyResume,
  IconHistory,
  IconAnalytics,
  IconSparkles
} from './Icons';

export default function DashboardView({
  user,
  onStartNew,
  onGoRoleInterview,
  onGoPracticeQuestions,
  onGoResume,
  onGoHistory,
  onGoAnalytics,
  onRequireAuth
}) {
  const [sessions, setSessions] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.allSettled([
        api.getHistory(),
        api.getScoreTrend()
      ]).then(([historyRes, trendRes]) => {
        if (historyRes.status === 'fulfilled' && historyRes.value?.success && historyRes.value.data) {
          setSessions(historyRes.value.data);
        }
        if (trendRes.status === 'fulfilled' && trendRes.value?.success && trendRes.value.data) {
          setTrend(trendRes.value.data);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
  const totalInterviews = completedSessions.length;
  const avgScore = totalInterviews > 0
    ? (completedSessions.reduce((acc, s) => acc + (s.overallScore || 0), 0) / totalInterviews).toFixed(1)
    : 'N/A';

  const readinessPercent = totalInterviews === 0
    ? 0
    : Math.min(100, Math.round((Number(avgScore) / 10) * 100));

  const recentSessions = completedSessions.slice(0, 3);

  return (
    <div className="dashboard-container">
      {/* Hero Welcome Banner */}
      <div className="dashboard-hero-card">
        <div className="dashboard-hero-content">
          <div className="hero-pill">
            <IconSparkles size={14} /> AI-Powered Interview Preparation
          </div>
          <h1 className="dashboard-hero-title">
            Welcome back, <span className="gradient-text">{user ? user.username : 'Candidate'}</span>!
          </h1>
          <p className="dashboard-hero-subtitle">
            Master your technical and behavioral interviews with real-time AI audio questions, custom difficulty levels, and instant speech evaluation.
          </p>
          <div className="dashboard-hero-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={user ? onStartNew : onRequireAuth}
            >
              <IconNewInterview size={20} />
              Start New Interview
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={user ? onGoResume : onRequireAuth}
            >
              <IconMyResume size={20} />
              Manage Resume
            </button>
          </div>
        </div>
        <div className="dashboard-hero-graphic">
          <div className="hero-circle-glow">
            <BrainAiLogo size={72} />
          </div>
          <div className="hero-status-pill">
            <span className="live-dot" /> AI Audio Coach Ready
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="dashboard-stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Total Interviews</span>
            <div className="stat-icon-badge badge-indigo">
              <IconHistory size={18} />
            </div>
          </div>
          <div className="stat-value">{totalInterviews}</div>
          <span className="stat-subtext">Completed practice sessions</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Average AI Score</span>
            <div className="stat-icon-badge badge-green">
              <IconAnalytics size={18} />
            </div>
          </div>
          <div className="stat-value">{avgScore !== 'N/A' ? `${avgScore} / 10` : '—'}</div>
          <span className="stat-subtext">Across evaluated answers</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Readiness Index</span>
            <div className="stat-icon-badge badge-purple">
              <IconSparkles size={18} />
            </div>
          </div>
          <div className="stat-value">{readinessPercent}%</div>
          <div className="stat-progress-bar">
            <div className="stat-progress-fill" style={{ width: `${readinessPercent}%` }} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Questions Practiced</span>
            <div className="stat-icon-badge badge-amber">
              <IconNewInterview size={18} />
            </div>
          </div>
          <div className="stat-value">
            {completedSessions.reduce((sum, s) => sum + (s.totalQuestions || 0), 0)}
          </div>
          <span className="stat-subtext">Technical & behavioral items</span>
        </div>
      </div>

      {/* Quick Launch Features Grid */}
      <div className="dashboard-features-section">
        <h2 className="section-heading">Quick Actions</h2>
        <div className="quick-actions-grid">
          <div
            className="action-tile"
            onClick={user ? onStartNew : onRequireAuth}
            role="button"
            tabIndex={0}
          >
            <div className="action-tile-icon-box bg-gradient-purple">
              <IconNewInterview size={24} />
            </div>
            <div className="action-tile-text">
              <div className="action-tile-title">Resume Mock Interview</div>
              <div className="action-tile-desc">Upload resume or choose difficulty to practice instant Q&A with Gemini voice coach.</div>
            </div>
          </div>

          <div
            className="action-tile"
            onClick={user ? onGoRoleInterview : onRequireAuth}
            role="button"
            tabIndex={0}
          >
            <div className="action-tile-icon-box bg-gradient-blue">
              <IconSparkles size={24} />
            </div>
            <div className="action-tile-text">
              <div className="action-tile-title">Target Role & JD Interview</div>
              <div className="action-tile-desc">Tailor questions strictly to a target job role, job description (JD), and optional resume.</div>
            </div>
          </div>

          <div
            className="action-tile"
            onClick={onGoPracticeQuestions}
            role="button"
            tabIndex={0}
          >
            <div className="action-tile-icon-box bg-gradient-green">
              <IconMyResume size={24} />
            </div>
            <div className="action-tile-text">
              <div className="action-tile-title">Practice Questions Blueprint</div>
              <div className="action-tile-desc">Explore what question categories recruiters will ask based on your uploaded resume.</div>
            </div>
          </div>

          <div
            className="action-tile"
            onClick={user ? onGoHistory : onRequireAuth}
            role="button"
            tabIndex={0}
          >
            <div className="action-tile-icon-box bg-gradient-green">
              <IconHistory size={24} />
            </div>
            <div className="action-tile-text">
              <div className="action-tile-title">Interview History</div>
              <div className="action-tile-desc">Review previous mock interview answers, AI feedback, strengths, and areas to improve.</div>
            </div>
          </div>

          <div
            className="action-tile"
            onClick={user ? onGoAnalytics : onRequireAuth}
            role="button"
            tabIndex={0}
          >
            <div className="action-tile-icon-box bg-gradient-amber">
              <IconAnalytics size={24} />
            </div>
            <div className="action-tile-text">
              <div className="action-tile-title">Progress & Analytics</div>
              <div className="action-tile-desc">Track score trends over time, difficulty performance, and growth metrics.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions & Coaching Tips Side-by-Side */}
      <div className="dashboard-two-column">
        {/* Recent Interviews Card */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Recent Interviews</h3>
            {totalInterviews > 0 && (
              <button className="link-btn" onClick={onGoHistory}>View All &rarr;</button>
            )}
          </div>

          {loading ? (
            <div className="empty-state-small">Loading your interview sessions...</div>
          ) : recentSessions.length === 0 ? (
            <div className="empty-state-small">
              <p>No completed interviews yet.</p>
              <button className="btn btn-primary btn-sm" onClick={user ? onStartNew : onRequireAuth} style={{ marginTop: '0.75rem' }}>
                Take Your First Interview
              </button>
            </div>
          ) : (
            <div className="recent-sessions-list">
              {recentSessions.map((s) => (
                <div key={s.id} className="recent-session-item" onClick={onGoHistory}>
                  <div className="session-item-left">
                    <span className={`difficulty-badge difficulty-${(s.difficultyLevel || 'medium').toLowerCase()}`}>
                      {s.difficultyLevel}
                    </span>
                    <div>
                      <div className="session-date-label">
                        {new Date(s.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="session-sub-info">{s.totalQuestions} Questions</div>
                    </div>
                  </div>
                  <div className="session-score-pill">
                    <span className="score-num">{s.overallScore?.toFixed(1) || '0'}</span>
                    <span className="score-denom">/10</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Coaching Tips & STAR Method Card */}
        <div className="dashboard-card coaching-card">
          <div className="dashboard-card-header">
            <h3>Interview Pro Tips</h3>
            <span className="tip-badge">AI Advice</span>
          </div>

          <div className="tips-list">
            <div className="tip-item">
              <div className="tip-bullet">S</div>
              <div>
                <strong>Situation:</strong> Set the context with specific project constraints or problem details.
              </div>
            </div>
            <div className="tip-item">
              <div className="tip-bullet">T</div>
              <div>
                <strong>Task:</strong> Explain what you specifically were responsible for achieving.
              </div>
            </div>
            <div className="tip-item">
              <div className="tip-bullet">A</div>
              <div>
                <strong>Action:</strong> Describe the exact architectural steps, algorithms, or tools you applied.
              </div>
            </div>
            <div className="tip-item">
              <div className="tip-bullet">R</div>
              <div>
                <strong>Result:</strong> Conclude with measurable outcomes (latency dropped 40%, revenue rose 20%).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

