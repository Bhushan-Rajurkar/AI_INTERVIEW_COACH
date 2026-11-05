import React, { useState, useEffect } from 'react';
import { IconSettings, IconVolume, IconMic, IconSparkles, IconSun, IconMoon } from './Icons';

export default function SettingsView({ theme = 'dark', setTheme }) {
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    return localStorage.getItem('pref_tts_enabled') !== 'false';
  });
  const [strictness, setStrictness] = useState(() => {
    return localStorage.getItem('pref_strictness') || 'balanced';
  });
  const [speechRate, setSpeechRate] = useState(() => {
    return localStorage.getItem('pref_speech_rate') || '1';
  });
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    localStorage.setItem('pref_tts_enabled', ttsEnabled);
  }, [ttsEnabled]);

  useEffect(() => {
    localStorage.setItem('pref_strictness', strictness);
  }, [strictness]);

  useEffect(() => {
    localStorage.setItem('pref_speech_rate', speechRate);
  }, [speechRate]);

  const handleTestVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        "Welcome to your AI Interview Coach. Can you describe an engineering challenge you solved recently?"
      );
      utterance.rate = parseFloat(speechRate);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Speech synthesis is not supported on this browser.");
    }
  };

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-group">
          <div className="view-badge">
            <IconSettings size={16} /> Preferences
          </div>
          <h1>Settings & Configuration</h1>
          <p className="view-subtitle">
            Configure appearance theme, speech synthesis, microphone input, and AI evaluation feedback parameters.
          </p>
        </div>
      </div>

      {savedNotice && (
        <div className="alert alert-success">
          Settings saved successfully!
        </div>
      )}

      <div className="settings-cards-list">
        {/* Appearance & Theme (Dark / Light) */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-pill">
              {theme === 'dark' ? <IconMoon size={20} /> : <IconSun size={20} />}
            </div>
            <div>
              <h3>Appearance & Theme</h3>
              <p className="card-subtext">Choose your preferred visual mode for all devices</p>
            </div>
          </div>

          <div className="theme-selector-grid">
            <div
              className={`theme-option-card ${theme === 'dark' ? 'theme-option-active' : ''}`}
              onClick={() => setTheme && setTheme('dark')}
              role="button"
              tabIndex={0}
            >
              <div className="theme-option-preview theme-preview-dark">
                <div className="preview-nav" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-line line-1" />
                    <div className="preview-line line-2" />
                  </div>
                </div>
              </div>
              <div className="theme-option-info">
                <div className="theme-option-title">
                  <IconMoon size={16} /> Dark Theme
                </div>
                <div className="theme-option-desc">
                  Deep obsidian palette designed for low-light focus and reduced eye strain.
                </div>
              </div>
              {theme === 'dark' && <span className="theme-selected-badge">Active</span>}
            </div>

            <div
              className={`theme-option-card ${theme === 'light' ? 'theme-option-active' : ''}`}
              onClick={() => setTheme && setTheme('light')}
              role="button"
              tabIndex={0}
            >
              <div className="theme-option-preview theme-preview-light">
                <div className="preview-nav" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-line line-1" />
                    <div className="preview-line line-2" />
                  </div>
                </div>
              </div>
              <div className="theme-option-info">
                <div className="theme-option-title">
                  <IconSun size={16} /> Light Theme
                </div>
                <div className="theme-option-desc">
                  Crisp clean daylight palette with soft shadows and high-contrast typography.
                </div>
              </div>
              {theme === 'light' && <span className="theme-selected-badge">Active</span>}
            </div>
          </div>
        </div>

        {/* Audio & Speech Settings */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-pill">
              <IconVolume size={20} />
            </div>
            <div>
              <h3>AI Voice & Audio Synthesis</h3>
              <p className="card-subtext">Manage text-to-speech question narration</p>
            </div>
          </div>

          <div className="settings-options-list">
            <div className="settings-option-row">
              <div>
                <div className="option-title">Auto-Read Questions Aloud</div>
                <div className="option-desc">Automatically speak each interview question using browser speech synthesis</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="settings-option-row">
              <div>
                <div className="option-title">Speech Rate</div>
                <div className="option-desc">Adjust speaking speed for voice questions</div>
              </div>
              <div className="speed-selector">
                {['0.8', '1', '1.2'].map((rate) => (
                  <button
                    key={rate}
                    className={`btn btn-sm ${speechRate === rate ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSpeechRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-action-row">
              <button className="btn btn-secondary btn-sm" onClick={handleTestVoice}>
                <IconVolume size={16} /> Test AI Question Voice
              </button>
            </div>
          </div>
        </div>

        {/* AI Evaluation Strictness */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-pill">
              <IconSparkles size={20} />
            </div>
            <div>
              <h3>AI Feedback Strictness</h3>
              <p className="card-subtext">Control the tone and rigor of Gemini AI score grading</p>
            </div>
          </div>

          <div className="strictness-selector-grid">
            <div
              className={`strictness-card ${strictness === 'constructive' ? 'strictness-card-active' : ''}`}
              onClick={() => setStrictness('constructive')}
            >
              <div className="strictness-card-title">Encouraging</div>
              <div className="strictness-card-desc">Gentle scoring emphasizing core strengths with helpful encouragement.</div>
            </div>

            <div
              className={`strictness-card ${strictness === 'balanced' ? 'strictness-card-active' : ''}`}
              onClick={() => setStrictness('balanced')}
            >
              <div className="strictness-card-title">Standard (Balanced)</div>
              <div className="strictness-card-desc">Realistic scoring matching standard corporate engineering interviews.</div>
            </div>

            <div
              className={`strictness-card ${strictness === 'rigorous' ? 'strictness-card-active' : ''}`}
              onClick={() => setStrictness('rigorous')}
            >
              <div className="strictness-card-title">FAANG / Strict</div>
              <div className="strictness-card-desc">High rigor scrutiny on edge cases, architecture, and STAR precision.</div>
            </div>
          </div>
        </div>

        {/* Microphone & Dictation Info */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-pill">
              <IconMic size={20} />
            </div>
            <div>
              <h3>Microphone Dictation</h3>
              <p className="card-subtext">Web Speech API speech-to-text configuration</p>
            </div>
          </div>

          <div className="microphone-info-box">
            <p>
              Your browser's native Web Speech Recognition engine is utilized during interview Q&A. You can either speak your answers aloud or type them manually in the response box.
            </p>
          </div>
        </div>

        <div className="settings-footer-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            Save All Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
