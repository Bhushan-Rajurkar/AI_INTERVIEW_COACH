/**
 * AI Interview Coach - Frontend Client Library
 */

const API_BASE = '/api';

// Toast Notification Utility
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span><span style="flex:1;">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Token & Session Storage Helpers
function getToken() {
  return localStorage.getItem('jwt_token');
}

function setToken(token) {
  localStorage.setItem('jwt_token', token);
}

function getUser() {
  const data = localStorage.getItem('user_data');
  return data ? JSON.parse(data) : null;
}

function setUser(user) {
  localStorage.setItem('user_data', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_data');
}

function logout() {
  clearSession();
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 500);
}

// Authenticated API Fetch
async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = options.headers || {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  options.headers = headers;

  const response = await fetch(url, options);

  if (response.status === 401) {
    clearSession();
    // Redirect to login if on protected page
    if (!window.location.pathname.includes('login.html') &&
        !window.location.pathname.includes('register.html') &&
        !window.location.pathname.includes('forgot-password.html') &&
        !window.location.pathname.includes('reset-password.html') &&
        window.location.pathname !== '/' &&
        !window.location.pathname.includes('index.html')) {
      window.location.href = '/login.html?expired=true';
    }
    throw new Error('Unauthorized or session expired.');
  }

  return response;
}

// Initialize Global Navbar if present
function setupNavbar() {
  const navContainer = document.getElementById('navbar-auth-section');
  if (!navContainer) return;

  const token = getToken();
  const user = getUser();

  if (token && user) {
    const avatar = user.profileImageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`;
    navContainer.innerHTML = `
      <div class="user-menu">
        <a href="/dashboard.html" style="display:flex;align-items:center;gap:0.6rem;text-decoration:none;">
          <img src="${avatar}" alt="${user.username}" class="user-avatar-sm" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}'" />
          <span style="font-weight:600;color:#fff;">${user.username}</span>
        </a>
        <a href="/dashboard.html" class="btn btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.85rem;">Dashboard</a>
        <button onclick="logout()" class="btn btn-danger" style="padding:0.4rem 0.8rem;font-size:0.85rem;">Logout</button>
      </div>
    `;
  } else {
    navContainer.innerHTML = `
      <div style="display:flex;gap:0.75rem;">
        <a href="/login.html" class="btn btn-secondary">Log In</a>
        <a href="/register.html" class="btn btn-primary">Sign Up Free</a>
      </div>
    `;
  }
}

// Execute on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
});

