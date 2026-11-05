import React, { useState } from 'react';
import { api, setUser } from '../api/api';
import { IconProfile, IconUpload, IconCheck } from './Icons';

export default function ProfileView({ user, onProfileUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) {
    return (
      <div className="view-container">
        <div className="empty-state-card">
          <IconProfile size={48} />
          <h3>Please Log In</h3>
          <p>You need to be logged in to view and manage your profile.</p>
        </div>
      </div>
    );
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be under 10MB.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.updateProfileImage(formData);
      if (res.success && res.data) {
        setSuccess('Profile photo updated successfully!');
        setUser(res.data);
        if (onProfileUpdated) onProfileUpdated(res.data);
      } else {
        setError(res.message || 'Failed to update profile photo.');
      }
    } catch (err) {
      setError(err.message || 'Error uploading profile photo.');
    } finally {
      setUploading(false);
    }
  };

  const avatar = user.profileImageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username || 'user'}`;

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-group">
          <div className="view-badge">
            <IconProfile size={16} /> Candidate Profile
          </div>
          <h1>Candidate Profile</h1>
          <p className="view-subtitle">
            Manage your candidate account details and profile photo.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="profile-layout-grid">
        {/* Unified Clean Avatar & Overview Card */}
        <div className="profile-avatar-card">
          <div className="avatar-wrapper">
            <img src={avatar} alt={user.username} className="profile-large-avatar" />
            <div className="avatar-status-dot" title="Account Active" />
          </div>

          <h2 className="profile-display-name">{user.username}</h2>
          <span className="profile-status-chip">
            <IconCheck size={13} /> Active Candidate
          </span>

          <label className="btn btn-secondary btn-sm avatar-upload-label">
            <IconUpload size={16} />
            <span>{uploading ? 'Uploading...' : 'Change Photo'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Clean Profile Details Card */}
        <div className="profile-details-card">
          <h3>Account Information</h3>
          <p className="card-subtext">Your verified candidate account credentials</p>

          <div className="profile-fields-list">
            <div className="profile-field-item">
              <span className="profile-field-label">Candidate Name</span>
              <span className="profile-field-value">{user.username}</span>
            </div>

            <div className="profile-field-item">
              <span className="profile-field-label">Email Address</span>
              <div className="profile-email-row">
                <span className="profile-field-value">{user.email}</span>
                <span className="verified-chip">
                  <IconCheck size={12} /> Verified
                </span>
              </div>
            </div>

            <div className="profile-field-item">
              <span className="profile-field-label">Account Status</span>
              <span className="status-badge-active">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
