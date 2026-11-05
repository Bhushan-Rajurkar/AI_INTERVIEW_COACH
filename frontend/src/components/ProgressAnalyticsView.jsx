import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { IconAnalytics, IconSparkles, IconHistory, IconNewInterview, IconShield } from './Icons';

export default function ProgressAnalyticsView({ onStartNew }) {
  const [trend, setTrend] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'Easy' | 'Medium' | 'Hard'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      api.getScoreTrend(),
      api.getHistory()
    ]).then(([trendRes, historyRes]) => {
      if (trendRes.status === 'fulfilled' && trendRes.value?.success && trendRes.value.data) {
        setTrend(trendRes.value.data);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value?.success && historyRes.value.data) {
        setSessions(historyRes.value.data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
  const total = completedSessions.length;

  const avgOverall = total > 0
    ? (completedSessions.reduce((acc, s) => acc + (s.overallScore || 0), 0) / total).toFixed(1)
    : '0';

  // Filter trend points by active difficulty filter
  const filteredTrend = trend.filter(item => {
    if (activeFilter === 'ALL') return true;
    const diff = item.difficulty || item.difficultyLevel || '';
    return diff.toLowerCase() === activeFilter.toLowerCase();
  });

  const scores = completedSessions.map(s => s.overallScore || 0);
  const bestScore = scores.length > 0 ? Math.max(...scores).toFixed(1) : 'N/A';

  // Readiness Tier
  const readinessRating = total === 0 ? 'Not Evaluated' : Number(avgOverall) >= 8.5 ? 'Elite Candidate' : Number(avgOverall) >= 7.0 ? 'Interview Ready' : 'Developing';

  // SVG Chart Geometry calculations
  const chartWidth = 660;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const points = filteredTrend.map((item, idx) => {
    const score = Math.max(0, Math.min(10, item.overallScore || 0));
    const divisor = Math.max(1, filteredTrend.length - 1);
    const x = paddingX + (idx / divisor) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (score / 10) * (chartHeight - paddingY * 2);
    return { x, y, score, item, idx };
  });

  // Construct SVG Area and Line Paths
  let linePath = '';
  let areaPath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth cubic bezier
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    const lastPoint = points[points.length - 1];
    areaPath = `${linePath} L ${lastPoint.x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;
  }

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div className="view-title-group">
          <div className="view-badge">
            <IconAnalytics size={16} /> Performance & Visual Analytics
          </div>
          <h1>Progress & Performance Analytics</h1>
          <p className="view-subtitle">
            Interactive chart progression, difficulty mastery metrics, and competency tracking analyzed by Gemini AI across all mock interviews.
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="dashboard-stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Average AI Score</span>
            <div className="stat-icon-badge">
              <IconAnalytics size={18} />
            </div>
          </div>
          <div className="stat-value">{avgOverall !== '0' ? `${avgOverall} / 10` : '—'}</div>
          <span className="stat-subtext">Across {total} completed drill{total === 1 ? '' : 's'}</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Personal Best</span>
            <div className="stat-icon-badge">
              <IconSparkles size={18} />
            </div>
          </div>
          <div className="stat-value">{bestScore !== 'N/A' ? `${bestScore} / 10` : '—'}</div>
          <span className="stat-subtext">Highest evaluated score</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Readiness Assessment</span>
            <div className="stat-icon-badge">
              <IconShield size={18} />
            </div>
          </div>
          <div className="stat-value">{readinessRating}</div>
          <span className="stat-subtext">Industry hiring benchmark</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Total Questions Practiced</span>
            <div className="stat-icon-badge">
              <IconHistory size={18} />
            </div>
          </div>
          <div className="stat-value">
            {completedSessions.reduce((sum, s) => sum + (s.totalQuestions || 0), 0)}
          </div>
          <span className="stat-subtext">Evaluated technical responses</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* INTERACTIVE SVG SCORE TREND CHART                                    */}
      {/* ------------------------------------------------------------------- */}
      <div className="analytics-card chart-card">
        <div className="chart-header-row">
          <div>
            <h3>Score Progression Curve</h3>
            <p className="card-subtext">Continuous performance trajectory over completed practice sessions</p>
          </div>

          <div className="chart-filter-pills">
            {['ALL', 'Easy', 'Medium', 'Hard'].map((filter) => (
              <button
                key={filter}
                type="button"
                className={`chart-filter-btn ${activeFilter === filter ? 'chart-filter-active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === 'ALL' ? 'All Sessions' : filter}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner-sage" />
            <span>Generating performance trajectory...</span>
          </div>
        ) : filteredTrend.length === 0 ? (
          <div className="empty-chart-box">
            <IconAnalytics size={40} />
            <h4>No Sessions Found for {activeFilter} Difficulty</h4>
            <p>Complete a mock interview under this difficulty to generate real-time curve trends.</p>
            <button className="btn btn-primary btn-sm" onClick={onStartNew} style={{ marginTop: '0.75rem' }}>
              <IconNewInterview size={16} /> Start Mock Session
            </button>
          </div>
        ) : (
          <div className="svg-chart-container">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="interactive-svg-chart"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="sageAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Benchmark Reference Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <text x={paddingX - 10} y={paddingY + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">10.0</text>

              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <text x={paddingX - 10} y={chartHeight / 2 + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">5.0</text>

              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="var(--border-color)" />
              <text x={paddingX - 10} y={chartHeight - paddingY + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">0.0</text>

              {/* Gradient Area under Curve */}
              {areaPath && (
                <path d={areaPath} fill="url(#sageAreaGrad)" />
              )}

              {/* Stroke Line */}
              {linePath && (
                <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Interactive Data Points */}
              {points.map((pt) => {
                const isHovered = hoveredPoint?.idx === pt.idx;
                return (
                  <g key={pt.idx} className="chart-data-node" onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 7 : 4.5}
                      fill="var(--bg-card)"
                      stroke="var(--primary)"
                      strokeWidth={isHovered ? 3.5 : 2.5}
                      style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Interactive Tooltip Card */}
            {hoveredPoint && (
              <div
                className="chart-interactive-tooltip"
                style={{
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartHeight) * 100}%`
                }}
              >
                <div className="tooltip-score">
                  {hoveredPoint.score.toFixed(1)} <small>/ 10</small>
                </div>
                <div className="tooltip-meta">
                  Session #{hoveredPoint.item.sessionId} &bull; {hoveredPoint.item.difficulty || hoveredPoint.item.difficultyLevel || 'Medium'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
