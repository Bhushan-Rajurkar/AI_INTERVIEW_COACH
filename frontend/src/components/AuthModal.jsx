import React, { useState, useMemo, useRef } from 'react';
import { api, setToken, setUser } from '../api/api';
import {
  BrainAiLogo,
  IconUser,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconCamera,
  IconSparkles,
  IconKey,
  IconClose,
  IconCheck
} from './Icons';

export default function AuthModal({ initialMode = 'login', onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot' | 'reset' | 'activation-sent'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Activation & Reset states
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setProfileImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, text: '', class: '' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score: 1, text: 'Weak', class: 'pwd-weak' };
    if (score <= 4) return { score: 2, text: 'Medium', class: 'pwd-medium' };
    return { score: 3, text: 'Strong', class: 'pwd-strong' };
  }, [password]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.login({ usernameOrEmail: username || email, password });
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data);
        onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      if (profileImage) {
        formData.append('profileImage', profileImage);
      }

      const res = await api.register(formData);
      if (res.success) {
        setRegisteredEmail(email);
        setMode('activation-sent');
        setMessage(res.message || 'An activation link has been sent to your email.');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendActivation = async () => {
    const targetEmail = registeredEmail || email;
    if (!targetEmail) {
      setError('Please provide your email address to resend activation link.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.resendActivation(targetEmail);
      setMessage(res.message || 'A new activation link has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend activation email.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message || 'Password reset link sent to your email!');
      if (res.data) {
        setResetToken(res.data);
        setMode('reset');
      }
    } catch (err) {
      setError(err.message || 'Failed to process forgot password request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.resetPassword({ token: resetToken, newPassword });
      setMessage(res.message || 'Password reset successful! You can now log in.');
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setError('');
        setMessage('Password reset successful. Please log in.');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Password reset failed. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-card auth-modal-interactive ${mode === 'register' ? 'auth-modal-register' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek SVG Close Button */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <IconClose size={20} />
        </button>

        {/* Top Brand Logo */}
        <div className="auth-brand-header">
          <BrainAiLogo size={38} className="auth-brand-logo" />
        </div>

        {/* Interactive Segmented Switcher for Sign In / Create Account */}
        {(mode === 'login' || mode === 'register') && (
          <div className="auth-tab-nav">
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
                setMessage('');
              }}
            >
              <IconKey size={16} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
                setMessage('');
              }}
            >
              <IconSparkles size={16} />
              <span>Create Account</span>
            </button>
          </div>
        )}

        <div className="modal-header">
          <h2>
            {mode === 'login' && 'Sign In'}
            {mode === 'register' && 'Create Candidate Account'}
            {mode === 'activation-sent' && 'Verify Your Email'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset' && 'Set New Password'}
          </h2>
          <p className="modal-subtitle">
            {mode === 'login' && 'Welcome back! Enter your credentials to access your interview sessions.'}
            {mode === 'register' && 'Set up your candidate profile to practice mock interviews and track progress.'}
            {mode === 'activation-sent' && 'We have dispatched a verification link to your email address.'}
            {mode === 'forgot' && 'Enter your registered email to receive password reset instructions.'}
            {mode === 'reset' && 'Enter your reset token and new password to restore account access.'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {/* ACTIVATION SENT NOTIFICATION SCREEN */}
        {mode === 'activation-sent' && (
          <div className="activation-screen-wrap">
            <div className="activation-icon-circle">
              <IconMail size={36} />
            </div>
            <h3 className="activation-title">Check Your Email Inbox</h3>
            <p className="activation-desc">
              We sent an activation link to <strong>{registeredEmail}</strong>.<br />
              Please click the link in your email to activate your account.
            </p>

            <div className="activation-actions-list">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setMessage('');
                }}
              >
                Go to Sign In
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResendActivation}
                disabled={loading}
              >
                {loading ? 'Resending...' : "Didn't receive email? Resend activation link"}
              </button>
            </div>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon">
                  <IconUser size={18} />
                </span>
                <input
                  type="text"
                  className="form-input form-input-with-icon"
                  placeholder="e.g. alex_developer or alex@company.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">Password</label>
                <button
                  type="button"
                  className="link-btn forgot-link"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setMessage('');
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon">
                  <IconLock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input form-input-with-icon form-input-with-trailing"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((p) => !p)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            {error && error.toLowerCase().includes('activate') && (
              <div className="activation-nag-box">
                <button
                  type="button"
                  className="link-btn resend-btn"
                  onClick={handleResendActivation}
                >
                  Account unverified: Click here to resend activation email
                </button>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block btn-auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="auth-switch-text">
              Don't have an account?{' '}
              <button
                type="button"
                className="link-btn strong-link"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setMessage('');
                }}
              >
                Sign up free
              </button>
            </div>
          </form>
        )}

        {/* REGISTER FORM (SHORT, COMPACT & HORIZONTALLY PROPORTIONED) */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form register-form-compact">
            {/* Top Horizontal Row: Profile Photo + Username & Email */}
            <div className="register-horizontal-row">
              {/* Compact Avatar Column */}
              <div className="register-avatar-cell">
                <label className="form-label center-label">Photo</label>
                <div
                  className="interactive-avatar-circle compact-avatar"
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to choose profile picture"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Candidate Avatar" className="avatar-preview-img" />
                      <div className="avatar-hover-overlay">
                        <IconCamera size={14} />
                        <span>Edit</span>
                      </div>
                    </>
                  ) : (
                    <div className="avatar-placeholder-content">
                      <IconCamera size={20} className="avatar-camera-svg" />
                      <span className="avatar-upload-prompt">Upload</span>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                </div>

                {imagePreview && (
                  <button
                    type="button"
                    className="avatar-clear-link"
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Username & Email Fields (Horizontal 2-Column Grid) */}
              <div className="register-creds-grid">
                <div className="form-group-compact">
                  <label className="form-label">Username</label>
                  <div className="input-with-icon-wrap">
                    <span className="input-leading-icon">
                      <IconUser size={16} />
                    </span>
                    <input
                      type="text"
                      className="form-input form-input-with-icon"
                      placeholder="e.g. alex_dev"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="form-group-compact">
                  <label className="form-label">Email Address</label>
                  <div className="input-with-icon-wrap">
                    <span className="input-leading-icon">
                      <IconMail size={16} />
                    </span>
                    <input
                      type="email"
                      className="form-input form-input-with-icon"
                      placeholder="alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Password Row */}
            <div className="form-group" style={{ marginBottom: '0.65rem' }}>
              <label className="form-label">Password (min. 6 characters)</label>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon">
                  <IconLock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input form-input-with-icon form-input-with-trailing"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((p) => !p)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="password-strength-container compact-strength">
                  <div className="strength-bars">
                    <span className={`strength-bar ${passwordStrength.score >= 1 ? passwordStrength.class : ''}`} />
                    <span className={`strength-bar ${passwordStrength.score >= 2 ? passwordStrength.class : ''}`} />
                    <span className={`strength-bar ${passwordStrength.score >= 3 ? passwordStrength.class : ''}`} />
                  </div>
                  <span className={`strength-label ${passwordStrength.class}`}>
                    {passwordStrength.score >= 3 && <IconCheck size={12} />}
                    {passwordStrength.text} Password
                  </span>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small" /> Creating Account...
                </>
              ) : (
                'Create Candidate Account'
              )}
            </button>

            <div className="auth-switch-text compact-switch">
              Already have an account?{' '}
              <button
                type="button"
                className="link-btn strong-link"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setMessage('');
                }}
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">Registered Email</label>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon">
                  <IconMail size={18} />
                </span>
                <input
                  type="email"
                  className="form-input form-input-with-icon"
                  placeholder="Enter your registered email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small" /> Sending Reset Token...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <div className="auth-switch-text">
              Back to{' '}
              <button
                type="button"
                className="link-btn strong-link"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setMessage('');
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD FORM */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">Reset Token</label>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon">
                  <IconKey size={18} />
                </span>
                <textarea
                  className="form-input form-input-with-icon"
                  rows={2}
                  placeholder="Paste the reset token sent to your email"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password (min. 6 characters)</label>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon">
                  <IconLock size={18} />
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input form-input-with-icon form-input-with-trailing"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword((p) => !p)}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-small" /> Resetting Password...
                </>
              ) : (
                'Confirm New Password'
              )}
            </button>

            <div className="auth-switch-text">
              Remember your password?{' '}
              <button
                type="button"
                className="link-btn strong-link"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setMessage('');
                }}
              >
                Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
