import React from 'react';
import {
  IconDashboard,
  IconNewInterview,
  IconHistory,
  IconProfile,
  IconMenu
} from './Icons';

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onToggleSidebar
}) {
  const handleNav = (tab, requiresAuth = false) => {
    if (requiresAuth && !user) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    setActiveTab(tab);
  };

  return (
    <nav className="mobile-bottom-nav">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'dashboard' ? 'bottom-nav-active' : ''}`}
        onClick={() => handleNav('dashboard')}
      >
        <IconDashboard size={20} />
        <span className="bottom-nav-label">Dashboard</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'upload' || activeTab === 'interview' ? 'bottom-nav-active' : ''}`}
        onClick={() => handleNav('upload')}
      >
        <IconNewInterview size={20} />
        <span className="bottom-nav-label">Interview</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'history' ? 'bottom-nav-active' : ''}`}
        onClick={() => handleNav('history', true)}
      >
        <IconHistory size={20} />
        <span className="bottom-nav-label">History</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'profile' ? 'bottom-nav-active' : ''}`}
        onClick={() => handleNav('profile', true)}
      >
        <IconProfile size={20} />
        <span className="bottom-nav-label">Profile</span>
      </button>

      <button
        type="button"
        className="bottom-nav-item"
        onClick={onToggleSidebar}
      >
        <IconMenu size={20} />
        <span className="bottom-nav-label">Menu</span>
      </button>
    </nav>
  );
}

