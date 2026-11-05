import React, { useState, useEffect } from 'react';
import { api, getUser, clearAuth } from './api/api';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import AuthModal from './components/AuthModal';
import DashboardView from './components/DashboardView';
import ResumeUploadView from './components/ResumeUploadView';
import JobRoleInterviewView from './components/JobRoleInterviewView';
import PracticeQuestionsView from './components/PracticeQuestionsView';
import InterviewRoom from './components/InterviewRoom';
import SessionSummaryView from './components/SessionSummaryView';
import MyResumeView from './components/MyResumeView';
import HistoryView from './components/HistoryView';
import ProgressAnalyticsView from './components/ProgressAnalyticsView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import './App.css';

export default function App() {
  const [user, setUser] = useState(getUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [globalNotice, setGlobalNotice] = useState('');

  // Navigation tab state: 'dashboard' | 'upload' | 'interview' | 'summary' | 'resume' | 'history' | 'analytics' | 'profile' | 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentSession, setCurrentSession] = useState(null);
  const [summarySessionId, setSummarySessionId] = useState(null);

  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

  // Mobile/Tablet Sidebar Drawer open state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync theme to root DOM element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Sync user profile on mount
  useEffect(() => {
    if (user) {
      api.getProfile()
        .then((res) => {
          if (res.success && res.data) {
            setUser(res.data);
          }
        })
        .catch(() => {
          // Token might be expired
          clearAuth();
          setUser(null);
        });
    }

    // Check for email activation parameters in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('activateToken') || params.get('token');
    const isActivated = params.get('activated');

    if (token && window.location.search.includes('token=')) {
      api.activateAccount(token)
        .then((res) => {
          setGlobalNotice('🎉 ' + (res.message || 'Account activated successfully! Please log in.'));
          setAuthModalMode('login');
          setAuthModalOpen(true);
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          setGlobalNotice('⚠️ Activation note: ' + err.message);
          setAuthModalMode('login');
          setAuthModalOpen(true);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (isActivated === 'true') {
      setGlobalNotice('🎉 Your account has been activated! Please log in with your email and password.');
      setAuthModalMode('login');
      setAuthModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setAuthModalOpen(false);
    setGlobalNotice('');
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setCurrentSession(null);
    setSummarySessionId(null);
    setActiveTab('dashboard');
  };

  const handleSessionStarted = (sessionData) => {
    setCurrentSession(sessionData);
    setActiveTab('interview');
  };

  const handleCompleteSession = (sessionId) => {
    setSummarySessionId(sessionId);
    setActiveTab('summary');
  };

  const handleSelectSession = (sessionId) => {
    setSummarySessionId(sessionId);
    setActiveTab('summary');
  };

  const handleStartWithResume = (file, extractedText) => {
    // Switch to upload / new interview tab
    setActiveTab('upload');
  };

  return (
    <div className="app-shell">
      {/* Sidebar matching the uploaded image */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main App Content Viewport */}
      <div className="app-viewport">
        {/* Top Navbar */}
        <Navbar
          user={user}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* Global Notice Banner */}
        {globalNotice && (
          <div className="app-global-notice">
            <span>{globalNotice}</span>
            <button
              className="notice-dismiss-btn"
              onClick={() => setGlobalNotice('')}
              aria-label="Dismiss notice"
            >
              &times;
            </button>
          </div>
        )}

        {/* Dynamic Route / Tab View Container */}
        <main className="app-main-content">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={user}
              onStartNew={() => setActiveTab('upload')}
              onGoRoleInterview={() => setActiveTab('role-interview')}
              onGoPracticeQuestions={() => setActiveTab('practice-questions')}
              onGoResume={() => setActiveTab('resume')}
              onGoHistory={() => setActiveTab('history')}
              onGoAnalytics={() => setActiveTab('analytics')}
              onRequireAuth={() => handleOpenAuth('login')}
            />
          )}

          {activeTab === 'upload' && (
            <ResumeUploadView
              user={user}
              onSessionStarted={handleSessionStarted}
              onRequireAuth={() => handleOpenAuth('login')}
            />
          )}

          {activeTab === 'role-interview' && (
            <JobRoleInterviewView
              user={user}
              onStartSession={handleSessionStarted}
              onRequireAuth={() => handleOpenAuth('login')}
            />
          )}

          {activeTab === 'practice-questions' && (
            <PracticeQuestionsView
              user={user}
              onGoNewInterview={() => setActiveTab('upload')}
            />
          )}

          {activeTab === 'interview' && currentSession && (
            <InterviewRoom
              session={currentSession}
              onCompleteSession={handleCompleteSession}
              onExit={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'summary' && summarySessionId && (
            <SessionSummaryView
              sessionId={summarySessionId}
              onStartNew={() => setActiveTab('upload')}
              onViewHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'resume' && (
            <MyResumeView
              onStartWithResume={handleStartWithResume}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              onSelectSession={handleSelectSession}
              onStartNew={() => setActiveTab('upload')}
            />
          )}

          {activeTab === 'analytics' && (
            <ProgressAnalyticsView
              onStartNew={() => setActiveTab('upload')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              user={user}
              onProfileUpdated={(updated) => setUser(updated)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              theme={theme}
              setTheme={setTheme}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div>
            &copy; {new Date().getFullYear()} Interview AI &bull; All Rights Reserved.
          </div>
        </footer>

        {/* Bottom Mobile Navigation for Phones and Foldable Folded Screens */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          onOpenAuth={handleOpenAuth}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
      </div>

      {/* Auth Modal */}
      {authModalOpen && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
