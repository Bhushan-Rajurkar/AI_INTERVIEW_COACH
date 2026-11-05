import React from 'react';
import { BrainAiLogo, IconMenu, IconProfile, IconNewInterview, IconSun, IconMoon } from './Icons';

export default function Navbar({
  user,
  onOpenAuth,
  onLogout,
  activeTab,
  setActiveTab,
  onToggleSidebar,
  theme = 'dark',
  toggleTheme
}) {
  const avatar = user?.profileImageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'user'}`;

  const getPageTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'upload': return 'New Interview';
      case 'role-interview': return 'Target Role Interview';
      case 'practice-questions': return 'Practice Questions';
      case 'interview': return 'Live Interview Room';
      case 'summary': return 'Interview Evaluation';
      case 'resume': return 'My Resume Profile';
      case 'history': return 'Interview History';
      case 'analytics': return 'Progress & Analytics';
      case 'profile': return 'My Profile';
      case 'settings': return 'Settings';
      default: return 'Interview AI';
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        {/* Hamburger Toggle button for Mobile/Tablet/Foldables */}
        <button
          className="navbar-menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
        >
          <IconMenu size={22} />
        </button>

        {/* Mobile/Tablet Brand Display */}
        <div
          className="navbar-brand-mobile"
          onClick={() => setActiveTab('dashboard')}
          role="button"
          tabIndex={0}
        >
          <BrainAiLogo size={32} />
          <span className="navbar-brand-name">Interview AI</span>
        </div>

        {/* Desktop Active Page Indicator */}
        <div className="navbar-breadcrumb-desktop">
          <span className="breadcrumb-sub">Workspace</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{getPageTitle(activeTab)}</span>
        </div>
      </div>

      <div className="navbar-actions">
        {/* Quick Theme Toggle Button (Light/Dark) */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <span className="theme-toggle-inner">
              <IconSun size={18} className="theme-icon-sun" />
              <span className="theme-label-desktop">Light</span>
            </span>
          ) : (
            <span className="theme-toggle-inner">
              <IconMoon size={18} className="theme-icon-moon" />
              <span className="theme-label-desktop">Dark</span>
            </span>
          )}
        </button>

        {user ? (
          <>
            <button
              className="btn btn-primary btn-sm desktop-only-btn"
              onClick={() => setActiveTab('upload')}
            >
              <IconNewInterview size={16} />
              <span>New Session</span>
            </button>

            <div
              className="user-profile-badge"
              onClick={() => setActiveTab('profile')}
              role="button"
              tabIndex={0}
              title="View Profile"
            >
              <img src={avatar} alt={user.username} className="user-avatar-tiny" />
              <div className="user-info-text desktop-only-text">
                <span className="user-name-label">{user.username}</span>
                <span className="user-badge-tag">Verified</span>
              </div>
            </div>
          </>
        ) : (
          <div className="auth-buttons-group">
            <button className="btn btn-secondary btn-sm" onClick={() => onOpenAuth('login')}>
              Log In
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => onOpenAuth('register')}>
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
