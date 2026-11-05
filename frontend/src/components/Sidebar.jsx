import React from 'react';
import {
  BrainAiLogo,
  IconDashboard,
  IconNewInterview,
  IconMyResume,
  IconSparkles,
  IconFileText,
  IconHistory,
  IconAnalytics,
  IconProfile,
  IconSettings,
  IconLogout,
  IconClose,
  IconSun,
  IconMoon
} from './Icons';

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onOpenAuth,
  isOpen,
  onClose,
  theme = 'dark',
  toggleTheme
}) {
  const handleNavClick = (tabKey, requiresAuth = false) => {
    if (requiresAuth && !user) {
      if (onOpenAuth) onOpenAuth('login');
      if (onClose) onClose();
      return;
    }
    setActiveTab(tabKey);
    if (onClose) onClose();
  };

  const isTabActive = (key) => {
    if (key === 'upload') {
      return activeTab === 'upload' || activeTab === 'interview' || activeTab === 'summary';
    }
    return activeTab === key;
  };

  return (
    <>
      {/* Mobile/Tablet backdrop overlay */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'sidebar-backdrop-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`app-sidebar ${isOpen ? 'app-sidebar-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div
            className="sidebar-brand"
            onClick={() => handleNavClick('dashboard')}
            role="button"
            tabIndex={0}
          >
            <BrainAiLogo size={36} />
            <span className="sidebar-brand-title">Interview AI</span>
          </div>

          {/* Close button visible only on mobile/tablet drawer */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-nav-container">
          {/* MAIN MENU */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">MAIN MENU</div>
            <nav className="sidebar-nav-list">
              <button
                type="button"
                className={`sidebar-item ${isTabActive('dashboard') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleNavClick('dashboard')}
              >
                <span className="sidebar-item-icon">
                  <IconDashboard size={19} />
                </span>
                <span className="sidebar-item-label">Dashboard</span>
              </button>

              <button
                type="button"
                className={`sidebar-item ${isTabActive('upload') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleNavClick('upload')}
              >
                <span className="sidebar-item-icon">
                  <IconNewInterview size={19} />
                </span>
                <span className="sidebar-item-label">New Interview</span>
              </button>

              <button
                type="button"
                className={`sidebar-item ${isTabActive('role-interview') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleNavClick('role-interview')}
              >
                <span className="sidebar-item-icon">
                  <IconSparkles size={19} />
                </span>
                <span className="sidebar-item-label">Target Role Interview</span>
              </button>

              <button
                type="button"
                className={`sidebar-item ${isTabActive('practice-questions') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleNavClick('practice-questions')}
              >
                <span className="sidebar-item-icon">
                  <IconFileText size={19} />
                </span>
                <span className="sidebar-item-label">Practice Questions</span>
              </button>

              <button
                type="button"
                className={`sidebar-item ${isTabActive('resume') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleNavClick('resume', true)}
              >
                <span className="sidebar-item-icon">
                  <IconMyResume size={19} />
                </span>
                <span className="sidebar-item-label">My Resume</span>
              </button>
            </nav>
          </div>

          {/* PERFORMANCE */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">PERFORMANCE</div>
            <nav className="sidebar-nav-list">
              <button
                type="button"
                className={`sidebar-item ${isTabActive('history') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleNavClick('history', true)}
              >
                <span className="sidebar-item-icon">
                  <IconHistory size={19} />
                </span>
                <span className="sidebar-item-label">Interview History</span>
              </button>

              <button
                type="button"
                className={`sidebar-item ${isTabActive('analytics') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleNavClick('analytics', true)}
              >
                <span className="sidebar-item-icon">
                  <IconAnalytics size={19} />
                </span>
                <span className="sidebar-item-label">Progress & Analytics</span>
              </button>
            </nav>
          </div>

          {/* ACCOUNT */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">ACCOUNT</div>
            <nav className="sidebar-nav-list">
              {user ? (
                <>
                  <button
                    type="button"
                    className={`sidebar-item ${isTabActive('profile') ? 'sidebar-item-active' : ''}`}
                    onClick={() => handleNavClick('profile', true)}
                  >
                    <span className="sidebar-item-icon">
                      <IconProfile size={19} />
                    </span>
                    <span className="sidebar-item-label">My Profile</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-item ${isTabActive('settings') ? 'sidebar-item-active' : ''}`}
                    onClick={() => handleNavClick('settings')}
                  >
                    <span className="sidebar-item-icon">
                      <IconSettings size={19} />
                    </span>
                    <span className="sidebar-item-label">Settings</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-item"
                    onClick={toggleTheme}
                    title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                  >
                    <span className="sidebar-item-icon">
                      {theme === 'dark' ? <IconSun size={19} /> : <IconMoon size={19} />}
                    </span>
                    <span className="sidebar-item-label">
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-item sidebar-item-logout"
                    onClick={() => {
                      if (onClose) onClose();
                      if (onLogout) onLogout();
                    }}
                  >
                    <span className="sidebar-item-icon sidebar-icon-danger">
                      <IconLogout size={19} />
                    </span>
                    <span className="sidebar-item-label">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="sidebar-item"
                    onClick={() => {
                      if (onClose) onClose();
                      onOpenAuth('login');
                    }}
                  >
                    <span className="sidebar-item-icon">
                      <IconProfile size={19} />
                    </span>
                    <span className="sidebar-item-label">Log In</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-item"
                    onClick={() => {
                      if (onClose) onClose();
                      onOpenAuth('register');
                    }}
                  >
                    <span className="sidebar-item-icon">
                      <IconNewInterview size={19} />
                    </span>
                    <span className="sidebar-item-label">Sign Up Free</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-item"
                    onClick={toggleTheme}
                    title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                  >
                    <span className="sidebar-item-icon">
                      {theme === 'dark' ? <IconSun size={19} /> : <IconMoon size={19} />}
                    </span>
                    <span className="sidebar-item-label">
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* User Footer Card if logged in */}
        {user && (
          <div
            className="sidebar-user-footer"
            onClick={() => handleNavClick('profile')}
            role="button"
            tabIndex={0}
            title="View Profile"
          >
            <img
              src={user.profileImageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username || 'user'}`}
              alt={user.username}
              className="sidebar-user-avatar"
            />
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{user.username}</span>
              <span className="sidebar-user-email">{user.email}</span>
            </div>
            <span className="sidebar-user-badge">PRO</span>
          </div>
        )}
      </aside>
    </>
  );
}

