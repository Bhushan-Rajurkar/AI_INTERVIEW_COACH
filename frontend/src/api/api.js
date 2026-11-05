/**
 * Centralized API service for AI Coach Interview
 */

const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('jwt_token');
}

export function setToken(token) {
  localStorage.setItem('jwt_token', token);
}

export function getUser() {
  const u = localStorage.getItem('user_data');
  return u ? JSON.parse(u) : null;
}

export function setUser(user) {
  localStorage.setItem('user_data', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_data');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = options.headers || {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  options.headers = headers;

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.message || `Request failed with status ${res.status}`;
    if (res.status === 401) {
      clearAuth();
    }
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  register: (formData) => request('/auth/register', { method: 'POST', body: formData }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  activateAccount: (token) => request('/auth/activate', { method: 'POST', body: JSON.stringify({ token }) }),
  resendActivation: (email) => request('/auth/resend-activation', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  verifyResetToken: (token) => request(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`),

  // User
  getProfile: () => request('/user/me'),
  updateProfileImage: (formData) => request('/user/profile-image', { method: 'POST', body: formData }),

  // Interview Sessions
  startWithResume: (formData) => request('/interview/start-with-resume', { method: 'POST', body: formData }),
  startRoleSpecificInterview: (formData) => request('/interview/start-role-specific', { method: 'POST', body: formData }),
  getPracticeQuestions: (formData) => request('/interview/practice-questions', { method: 'POST', body: formData }),
  extractResume: (formData) => request('/interview/extract-resume', { method: 'POST', body: formData }),
  startInterview: (payload) => request('/interview/start', { method: 'POST', body: JSON.stringify(payload) }),
  getNextQuestion: (sessionId) => request(`/interview/${sessionId}/next-question`),
  submitAnswer: (sessionId, payload) => request(`/interview/${sessionId}/submit-answer`, { method: 'POST', body: JSON.stringify(payload) }),
  getSessionSummary: (sessionId) => request(`/interview/${sessionId}/summary`),
  getHistory: () => request('/interview/history'),
  deleteSession: (sessionId) => request(`/interview/session/${sessionId}`, { method: 'DELETE' }),
  getScoreTrend: () => request('/interview/trend'),
};

