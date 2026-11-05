import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/api';
import {
  IconCamera,
  IconCameraOff,
  IconAlertTriangle,
  IconShield,
  IconVolume,
  IconMic,
  IconSparkles,
  IconClock
} from './Icons';

/**
 * Calculates interview countdown time limit:
 * - Small / concise / skill-based questions: 90-120s (default 105s / 1m 45s)
 * - Long / in-depth / architectural / scenario / introduction questions: exactly 150s (2m 30s)
 */
function getQuestionDuration(q) {
  if (!q || !q.questionText) {
    return { seconds: 105, label: 'Concise / Direct Question (1m 45s)', isDeep: false };
  }
  const text = q.questionText.toLowerCase();
  const cat = (q.category || '').toLowerCase();

  // Self introduction question (Question 1)
  if (text.includes('introduce yourself') || text.includes('tell me about yourself') || text.includes('introduce about yourself') || cat.includes('intro')) {
    return { seconds: 150, label: 'Candidate Introduction (2m 30s)', isDeep: true };
  }

  // Explicit category tags set by backend
  if (cat.includes('(concise)') || cat.includes('concise') || cat.includes('short') || cat.includes('direct') || cat.includes('fundamentals')) {
    return { seconds: 105, label: 'Concise / Direct Question (1m 45s)', isDeep: false };
  }
  if (cat.includes('(in-depth)') || cat.includes('in-depth') || cat.includes('architect') || cat.includes('system design') || cat.includes('scenario') || cat.includes('troubleshoot')) {
    return { seconds: 150, label: 'In-Depth / Architectural Explanation (2m 30s)', isDeep: true };
  }

  // Fallback heuristics: short/concise questions (definitions, differences, annotations, syntax, under 18 words)
  const wordCount = text.split(/\s+/).length;
  const isShortConcept =
    text.includes('difference between') ||
    text.includes('what is the difference') ||
    text.includes('what is') ||
    text.includes('what are') ||
    text.includes('define') ||
    text.includes('purpose of') ||
    text.includes('why use') ||
    wordCount <= 16;

  if (isShortConcept) {
    return { seconds: 105, label: 'Concise / Direct Question (1m 45s)', isDeep: false };
  }

  return { seconds: 150, label: 'In-Depth / Architectural Explanation (2m 30s)', isDeep: true };
}

function formatCountdownTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function InterviewRoom({ session, onCompleteSession, onExit }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(session.questions?.length || 5);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState('');

  // Audio Speech Synthesis & Recognition
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // High-accuracy speech transcript persistence refs
  const baseAnswerRef = useRef('');
  const sessionFinalsRef = useRef('');

  // Question Answering Countdown Timer (Question 1 is always Candidate Introduction = 150s)
  const [timerTotal, setTimerTotal] = useState(150);
  const [timeRemaining, setTimeRemaining] = useState(150);
  const [timerLabel, setTimerLabel] = useState('Candidate Introduction (2m 30s)');
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeExpiredWarning, setTimeExpiredWarning] = useState(false);

  // -------------------------------------------------------------------------
  // CAMERA PROCTORING & ANTI-CHEAT ENGINE
  // -------------------------------------------------------------------------
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // 'requesting' | 'active' | 'denied' | 'error'
  const [cameraStatus, setCameraStatus] = useState('requesting');
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [startCountdown, setStartCountdown] = useState(null); // 2s pause buffer before asking question
  const [warnings, setWarnings] = useState([]);
  const [activeWarningPopup, setActiveWarningPopup] = useState(null);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');

  // Cooldown ref to avoid rapid-fire duplicate popups
  const lastWarningTimeRef = useRef(0);
  const warningsRef = useRef([]);
  warningsRef.current = warnings;

  // Head tracking and motion proctoring refs
  const prevFrameDataRef = useRef(null);
  const headMovementsRef = useRef([]);
  const turnedAwayCountRef = useRef(0);
  const [headTrackingStatus, setHeadTrackingStatus] = useState('Steady & Centered');

  // Immediate Interview Termination
  const terminateInterview = useCallback((reason) => {
    setIsTerminated(true);
    setStartCountdown(null);
    setActiveWarningPopup(null);
    setTerminationReason(reason);

    // Stop video stream
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {
        // ignore track stop error
      }
      streamRef.current = null;
    }

    // Cancel text-to-speech audio & speech recognition
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setWarnings((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        reason,
        timestamp
      }
    ]);
  }, []);

  // Callback ref to reliably bind and play video stream when DOM node mounts
  const bindVideoNode = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.play().catch(() => { });
    }
  }, []);

  // Initialize and Request Camera Stream
  const startCamera = async () => {
    setCameraStatus('requesting');
    setError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('error');
      terminateInterview('Webcam is not supported or permitted on this browser/device.');
      return;
    }

    let stream = null;

    // Try ideal resolution first, fallback to basic video
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
    } catch (err1) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err2) {
        console.warn('Camera access denied by user or blocked:', err2);
        // USER DID NOT ALLOW CAMERA -> TERMINATE INTERVIEW IMMEDIATELY
        setCameraStatus('denied');
        terminateInterview('Camera permission was not allowed. Live webcam proctoring is mandatory for all interviews on this platform.');
        return;
      }
    }

    if (!stream) {
      setCameraStatus('denied');
      terminateInterview('Camera stream could not be started.');
      return;
    }

    // User GAVE ACCESS -> Camera is now active!
    streamRef.current = stream;
    setCameraStatus('active');

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => { });
    }
  };

  // Request camera on initial mount
  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {
          // ignore
        }
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Candidate clicks 'Start Interview' -> initiate at least 2-second buffer before asking question
  const handleStartInterview = () => {
    if (startCountdown !== null || interviewStarted) return;
    setStartCountdown(2);
  };

  // 2-second pre-start countdown buffer before asking the opening question
  useEffect(() => {
    if (startCountdown === null) return;

    if (startCountdown > 0) {
      const timer = setTimeout(() => {
        setStartCountdown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (startCountdown === 0) {
      const timer = setTimeout(() => {
        setStartCountdown(null);
        setInterviewStarted(true);
        fetchNextQuestion();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [startCountdown]);

  // -------------------------------------------------------------------------
  // ANTI-CHEAT LISTENERS (Tab Switch, Focus Loss, Camera Obstructed)
  // Attached with a grace period so browser permission bar doesn't trigger false flags
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!interviewStarted || cameraStatus !== 'active' || isTerminated) return;

    let attached = false;

    const handleVisibilityChange = () => {
      if (document.hidden && !isTerminated) {
        triggerViolation('Tab Switch Detected: You switched browser tabs or minimized the interview.');
      }
    };

    const handleWindowBlur = () => {
      if (!isTerminated && !document.hidden) {
        triggerViolation('Window Focus Lost: An external application or window was selected.');
      }
    };

    // 2-second grace period after interview starts before monitoring focus loss
    const timer = setTimeout(() => {
      attached = true;
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (attached) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
      }
    };
  }, [interviewStarted, cameraStatus, isTerminated]);

  // Periodic Camera Frame Analysis (Head movement, looking away, obstruction)
  useEffect(() => {
    if (cameraStatus !== 'active' || !interviewStarted || isTerminated) return;

    const intervalId = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = 64;
        const h = 48;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const prevData = prevFrameDataRef.current;

        let totalBrightness = 0;
        let motionPixelCount = 0;
        let skinPixelCount = 0;
        let skinCenterX = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Brightness calculation
            totalBrightness += r * 0.299 + g * 0.587 + b * 0.114;

            // Skin tone proxy to detect face centroid (R > 60, G > 40, B > 20, R > G, R - G >= 8)
            if (r > 60 && g > 40 && b > 20 && r > g && (r - g) >= 8 && r > b) {
              skinPixelCount++;
              skinCenterX += x;
            }

            // Frame-to-frame motion delta
            if (prevData) {
              const diff = Math.abs(r - prevData[idx]) + Math.abs(g - prevData[idx + 1]) + Math.abs(b - prevData[idx + 2]);
              if (diff > 45) {
                motionPixelCount++;
              }
            }
          }
        }

        // Store copy of current frame for next comparison
        prevFrameDataRef.current = new Uint8ClampedArray(data);

        const totalPixels = w * h;
        const avgBrightness = totalBrightness / totalPixels;

        // 1. Camera Feed Obstructed Check
        if (avgBrightness < 8) {
          triggerViolation('Camera Feed Obstructed: The camera lens appears covered or completely black.');
          return;
        }

        const now = Date.now();
        const motionRatio = motionPixelCount / totalPixels;

        // 2. Horizontal Face Centroid & Head Direction Check
        let isTurnedAway = false;
        if (skinPixelCount > 40) {
          const normalizedCentroidX = (skinCenterX / skinPixelCount) / w;
          // Normalized between 0 (left edge) and 1 (right edge). Centered is ~0.50.
          if (normalizedCentroidX < 0.27 || normalizedCentroidX > 0.73) {
            isTurnedAway = true;
          }
        }

        // 3. Track Prolonged Looking Away
        if (isTurnedAway) {
          turnedAwayCountRef.current += 1;
          setHeadTrackingStatus('Looking Away');
          if (turnedAwayCountRef.current >= 4) { // ~3 seconds looking away
            turnedAwayCountRef.current = 0;
            triggerViolation('Looking Away Detected: Your face is turned away from the screen. Please look directly into the camera.');
            return;
          }
        } else {
          turnedAwayCountRef.current = Math.max(0, turnedAwayCountRef.current - 1);
        }

        // 4. Frequent Head Movement Detection (Sudden head jerks or turning)
        if (motionRatio > 0.13 || (motionRatio > 0.08 && isTurnedAway)) {
          headMovementsRef.current.push(now);
          setHeadTrackingStatus('Movement Detected');
        } else if (!isTurnedAway) {
          setHeadTrackingStatus('Steady & Centered');
        }

        // Keep movement events in the last 10 seconds
        headMovementsRef.current = headMovementsRef.current.filter((t) => now - t < 10000);

        // If candidate moved/turned head 4 or more times in 10 seconds -> VIOLATION!
        if (headMovementsRef.current.length >= 4) {
          headMovementsRef.current = [];
          triggerViolation('Frequent Head Movement Detected: Excessive head turning detected. Please face the screen directly and keep your head steady.');
        }

      } catch (e) {
        // Ignore canvas CORS or frame capture errors
      }
    }, 700);

    return () => clearInterval(intervalId);
  }, [cameraStatus, interviewStarted, isTerminated]);

  // Centralized Cheat Warning Trigger (Cooldown + Auto-Termination at 3)
  const triggerViolation = (reason) => {
    const now = Date.now();
    if (now - lastWarningTimeRef.current < 5000) {
      return; // Cooldown to avoid duplicate popups
    }
    lastWarningTimeRef.current = now;

    // Pause speaking while warning is handled
    stopSpeaking();

    const currentCount = warningsRef.current.length + 1;
    const newViolation = {
      id: currentCount,
      reason,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    const updated = [...warningsRef.current, newViolation];
    setWarnings(updated);

    if (currentCount >= 3) {
      // 3 Warnings -> TERMINATE SESSION IMMEDIATELY
      terminateInterview('Integrity Limit Exceeded: 3 proctoring warnings were recorded.');
    } else {
      // Show Warning Popup (Warning 1/3 or 2/3)
      setActiveWarningPopup({
        warningNumber: currentCount,
        reason
      });
    }
  };

  const handleDismissWarning = () => {
    setActiveWarningPopup(null);
  };

  // -------------------------------------------------------------------------
  // INTERVIEW Q&A LIFECYCLE
  // -------------------------------------------------------------------------
  const fetchNextQuestion = async () => {
    setError('');
    setEvaluation(null);
    setAnswer('');
    baseAnswerRef.current = '';
    sessionFinalsRef.current = '';

    try {
      const res = await api.getNextQuestion(session.id);
      if (res.data) {
        setCurrentQuestion(res.data);
        setQuestionNumber(res.data.questionOrder);
        const dur = getQuestionDuration(res.data);
        setTimerTotal(dur.seconds);
        setTimeRemaining(dur.seconds);
        setTimerLabel(dur.label);
        setTimeExpiredWarning(false);
        setIsTimerActive(true);
        speakText(res.data.questionText);
      } else {
        setIsTimerActive(false);
        onCompleteSession(session.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load next question.');
    }
  };

  // Question countdown timer interval
  useEffect(() => {
    if (!isTimerActive || !interviewStarted || isTerminated || evaluation || !currentQuestion) {
      return;
    }
    // Pause timer countdown while the coach reads question aloud
    if (isSpeaking) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimerActive(false);
          setTimeExpiredWarning(true);
          // If recording voice, stop cleanly so transcript is preserved
          if (isRecording && recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              // ignore
            }
            setIsRecording(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, interviewStarted, isTerminated, evaluation, currentQuestion, isSpeaking, isRecording]);

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Highly accurate non-overwriting Speech-to-Text
  const toggleRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please type your answer.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    stopSpeaking();

    // Preserve whatever was previously typed or spoken
    baseAnswerRef.current = answer ? answer.trim() : '';
    sessionFinalsRef.current = '';

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          currentFinal += result[0].transcript + ' ';
        } else {
          currentInterim += result[0].transcript;
        }
      }

      sessionFinalsRef.current = currentFinal.trim();

      const combinedParts = [];
      if (baseAnswerRef.current) combinedParts.push(baseAnswerRef.current);
      if (sessionFinalsRef.current) combinedParts.push(sessionFinalsRef.current);
      if (currentInterim.trim()) combinedParts.push(currentInterim.trim());

      setAnswer(combinedParts.join(' '));
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      const combinedParts = [];
      if (baseAnswerRef.current) combinedParts.push(baseAnswerRef.current);
      if (sessionFinalsRef.current) combinedParts.push(sessionFinalsRef.current);
      setAnswer(combinedParts.join(' ').trim());
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
      setIsRecording(false);
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    setIsTimerActive(false);
    if (isRecording) toggleRecording();
    stopSpeaking();

    if (!answer.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.submitAnswer(session.id, {
        questionId: currentQuestion.id,
        answer: answer.trim()
      });

      if (res.success && res.data) {
        setEvaluation(res.data);
      } else {
        throw new Error(res.message || 'Evaluation failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const warningCount = warnings.length;

  return (
    <div className="interview-room-container">
      {/* Hidden canvas for video analysis */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top Proctoring Bar & Session Status */}
      <div className="interview-proctor-bar">
        <div className="proctor-left-status">
          <div className="proctor-live-indicator">
            <span className={`live-pulsing-dot ${cameraStatus === 'active' ? 'dot-active' : 'dot-waiting'}`} />
            <span className="live-status-text">
              {cameraStatus === 'active' ? 'PROCTORING: ACTIVE' : 'PROCTORING: PENDING CAMERA'}
            </span>
          </div>

          <div className={`integrity-badge integrity-${warningCount === 0 ? 'safe' : warningCount === 1 ? 'warn' : 'danger'}`}>
            <IconShield size={14} />
            <span>Integrity Warnings: <strong>{warningCount}/3</strong></span>
          </div>
        </div>

        <div className="proctor-right-meta">
          <span className="session-progress-pill">
            Question <strong>{questionNumber}</strong> of {totalQuestions}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={onExit}>
            Exit
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ------------------------------------------------------------------- */}
      {/* MAIN STAGE: Left Question/Answer + Right Live Camera Feed          */}
      {/* ------------------------------------------------------------------- */}
      <div className="interview-stage-layout">
        {/* Left Column: Live AI Question & Answer Box */}
        <div className="interview-main-column">
          {cameraStatus !== 'active' && !isTerminated ? (
            /* 1. Camera permission prompt waiting state */
            <div className="card camera-gate-card" style={{ margin: 0, maxWidth: '100%' }}>
              <div className="camera-gate-icon-circle">
                <IconCamera size={44} />
              </div>

              <h2 className="camera-gate-title">Camera Permission Required</h2>
              <p className="camera-gate-desc">
                Please click <strong>Allow</strong> in your browser prompt to activate camera proctoring.
                If camera permission is not granted, this interview session will be terminated.
              </p>

              <div className="camera-verifying-pulse">
                <span className="spinner-sage" />
                <span>Waiting for camera permission...</span>
              </div>

              <div className="camera-gate-btn-row" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => terminateInterview('Camera permission was declined by the candidate.')}
                >
                  Decline & Cancel Interview
                </button>
              </div>
            </div>
          ) : !interviewStarted && !isTerminated ? (
            /* 2. Camera Access is Active -> Show 'Start Interview' button or 2s countdown buffer */
            <div className="card camera-ready-card">
              {startCountdown !== null ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div className="ready-pill-badge" style={{ margin: '0 auto 1.25rem auto' }}>
                    <IconSparkles size={15} /> Preparing Interview Session...
                  </div>
                  <h2 className="ready-heading" style={{ marginBottom: '0.5rem' }}>
                    Get Ready
                  </h2>
                  <p className="ready-subtext" style={{ maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
                    Please face your camera and look directly at the screen. The interviewer will begin asking the opening question shortly.
                  </p>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '68px',
                      height: '68px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(74, 107, 82, 0.12) 0%, rgba(74, 107, 82, 0.25) 100%)',
                      border: '2px solid rgba(74, 107, 82, 0.4)',
                      color: '#2d4a34',
                      fontSize: '1.85rem',
                      fontWeight: '800',
                      boxShadow: '0 4px 14px rgba(74, 107, 82, 0.15)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {startCountdown > 0 ? startCountdown : '✨'}
                  </div>
                  <div style={{ marginTop: '0.85rem', fontSize: '0.9rem', color: '#526958', fontWeight: '600' }}>
                    {startCountdown > 0 ? `Starting in ${startCountdown} second${startCountdown > 1 ? 's' : ''}...` : 'Starting now...'}
                  </div>
                </div>
              ) : (
                <>
                  <div className="ready-pill-badge">
                    <IconShield size={15} /> Camera Connected & Verified
                  </div>

                  <h2 className="ready-heading">Ready for Your Interview</h2>
                  <p className="ready-subtext">
                    Your webcam is live and proctoring is active. Frame yourself comfortably in the camera window on the right. When you are ready to begin, click <strong>Start Interview</strong> to receive your first question.
                  </p>

                  <div className="ready-actions-row">
                    <button
                      type="button"
                      className="btn btn-primary btn-lg start-session-btn"
                      onClick={handleStartInterview}
                    >
                      <IconSparkles size={20} />
                      <span>Start Interview</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* 3. Active Q&A Form once Start Interview is clicked */
            <>
              {currentQuestion && (
                <div className="card question-card">
                  <div className="question-header-row">
                    <div className="coach-avatar-badge">
                      <div className="coach-avatar-circle">
                        <IconSparkles size={18} />
                      </div>
                      <div>
                        <span className="coach-name">AI Interview Coach</span>
                        <span className="question-category-tag">{currentQuestion.category || 'Evaluation'}</span>
                      </div>
                    </div>

                    <div className="audio-controls-row">
                      {isSpeaking ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm speaking-pulse"
                          onClick={stopSpeaking}
                          title="Pause voice"
                        >
                          <IconVolume size={16} />
                          <span>Speaking...</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => speakText(currentQuestion.questionText)}
                          title="Listen to Question"
                        >
                          <IconVolume size={16} />
                          <span>Listen to Question</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h2 className="question-text-title">{currentQuestion.questionText}</h2>
                </div>
              )}

              {/* Dynamic Question Answer Countdown Timer (60-90s for skills, 120-180s for deep-dives) */}
              {currentQuestion && !evaluation && (
                <div
                  className={`card question-timer-card ${
                    timeRemaining <= 15
                      ? 'timer-urgent'
                      : timeRemaining <= 30
                      ? 'timer-warning'
                      : 'timer-normal'
                  }`}
                >
                  <div className="timer-header-row">
                    <div className="timer-info-left">
                      <IconClock size={16} />
                      <span className="timer-label-text">{timerLabel}</span>
                      {isSpeaking && (
                        <span className="timer-paused-pill">Paused while question is read</span>
                      )}
                    </div>
                    <div className="timer-digits-right">
                      <span className="timer-digits-value">
                        {formatCountdownTime(timeRemaining)}
                      </span>
                      <span className="timer-digits-sub">remaining</span>
                    </div>
                  </div>
                  <div className="timer-progress-track">
                    <div
                      className="timer-progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, (timeRemaining / timerTotal) * 100)
                        )}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Time Expired Notice Banner */}
              {timeExpiredWarning && !evaluation && (
                <div className="alert alert-warning timer-expired-alert">
                  <span>
                    ⏰ <strong>Time limit reached!</strong> Please submit your candidate answer now for evaluation.
                  </span>
                </div>
              )}

              {/* Answer Form or Evaluation */}
              {!evaluation ? (
                <div className="card answer-card">
                  <form onSubmit={handleSubmitAnswer}>
                    <div className="answer-header-row">
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        Candidate Response
                      </label>

                      <button
                        type="button"
                        className={`mic-toggle-btn ${isRecording ? 'mic-recording' : ''}`}
                        onClick={toggleRecording}
                      >
                        <IconMic size={16} />
                        <span>{isRecording ? 'Listening... Stop' : 'Speak Answer'}</span>
                      </button>
                    </div>

                    <textarea
                      className={`form-input answer-textarea ${isRecording ? 'textarea-recording' : ''}`}
                      rows={8}
                      placeholder="Type your response or click 'Speak Answer' to speak naturally..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={isSubmitting || isTerminated}
                    />

                    <div className="answer-footer-row">
                      <span className="word-count-badge">
                        {wordCount} {wordCount === 1 ? 'word' : 'words'}
                      </span>

                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={isSubmitting || !answer.trim() || isTerminated}
                      >
                        {isSubmitting ? (
                          <span className="loading-state-inline">
                            <span className="spinner-sage" />
                            Evaluating Response...
                          </span>
                        ) : (
                          '✨ Submit Answer'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Evaluation Result Card */
                <div className="card evaluation-result-card">
                  <div className="evaluation-score-header">
                    <div>
                      <span className="feedback-kicker">AI Evaluation</span>
                      <h3 className="feedback-heading">Scoring & Analysis</h3>
                    </div>
                    <div className="evaluation-score-badge">
                      <span className="eval-score-num">{evaluation.score}</span>
                      <span className="eval-score-denom">/ 10</span>
                    </div>
                  </div>

                  <div className="feedback-grid">
                    <div className="feedback-panel-strengths">
                      <div className="feedback-panel-title">✅ Strengths</div>
                      <p className="feedback-text">{evaluation.strengths || 'Direct response to question.'}</p>
                    </div>

                    <div className="feedback-panel-improvements">
                      <div className="feedback-panel-title">💡 Areas for Improvement</div>
                      <p className="feedback-text">{evaluation.areasToImprove || 'Elaborate on edge cases and concrete examples.'}</p>
                    </div>
                  </div>

                  {evaluation.feedback && (
                    <div className="coach-advice-box">
                      <strong>Coach Advice:</strong> {evaluation.feedback}
                    </div>
                  )}

                  <div className="feedback-action-row">
                    {evaluation.sessionCompleted ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        onClick={() => onCompleteSession(session.id)}
                      >
                        🎉 View Complete Summary &rarr;
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        onClick={fetchNextQuestion}
                      >
                        Next Question &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Live Camera Video Stream & Proctoring Rules */}
        <div className="interview-sidebar-column">
          <div className="camera-proctor-card">
            <div className="camera-feed-container">
              {cameraStatus === 'active' ? (
                <>
                  <video
                    ref={bindVideoNode}
                    autoPlay
                    playsInline
                    muted
                    className="proctor-video-stream"
                  />
                  <div className="face-oval-guide" title="Keep face centered" />
                  <div className="camera-overlay-badge">
                    <IconCamera size={14} /> Live Proctoring Feed
                  </div>
                  <div className={`camera-head-status-badge ${headTrackingStatus === 'Steady & Centered' ? 'status-steady' : 'status-warning'}`}>
                    {headTrackingStatus === 'Steady & Centered' ? '✓ Head: Centered' : `⚠️ Head: ${headTrackingStatus}`}
                  </div>
                </>
              ) : (
                <div className="camera-placeholder-box">
                  <IconCameraOff size={36} />
                  <span>
                    {cameraStatus === 'denied' ? 'Camera Blocked' : 'Waiting for Camera...'}
                  </span>
                </div>
              )}
            </div>

            <div className="proctor-rules-card">
              <div className="proctor-rules-title">
                <IconShield size={16} /> Proctoring Guidelines
              </div>
              <ul className="proctor-rules-list">
                <li>Keep your face centered inside the frame</li>
                <li>Avoid frequent head turning or looking away</li>
                <li>Do not switch tabs or minimize this window</li>
                <li>Receiving 3 warnings terminates the interview</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* CHEATING WARNING POPUP MODAL (1st and 2nd Warnings)                  */}
      {/* ------------------------------------------------------------------- */}
      {activeWarningPopup && (
        <div className="modal-backdrop warning-modal-backdrop">
          <div className="warning-popup-card">
            <div className="warning-icon-circle">
              <IconAlertTriangle size={36} />
            </div>

            <h3 className="warning-popup-title">
              Proctoring Integrity Warning
            </h3>

            <div className="warning-counter-pill">
              Warning <strong>{activeWarningPopup.warningNumber}</strong> of <strong>3</strong>
            </div>

            <p className="warning-reason-box">
              {activeWarningPopup.reason}
            </p>

            <p className="warning-explainer-text">
              Please stay focused on this window and ensure your face remains visible. Receiving <strong>3 warnings</strong> will automatically terminate the session.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={handleDismissWarning}
            >
              I Understand & Resume Interview
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TERMINATION MODAL (Camera Denied or 3 Cheat Warnings)                */}
      {/* ------------------------------------------------------------------- */}
      {isTerminated && (
        <div className="modal-backdrop termination-modal-backdrop">
          <div className="termination-card">
            <div className="termination-icon-circle">
              🛑
            </div>

            <h2 className="termination-title">
              Interview Terminated
            </h2>

            <p className="termination-subtitle">
              {terminationReason || 'This interview session has been terminated due to a proctoring violation.'}
            </p>

            <div className="termination-violations-list">
              <div className="violations-heading">Recorded Integrity Events:</div>
              {warnings.map((w) => (
                <div key={w.id} className="violation-record-item">
                  <span className="violation-id">#{w.id}</span>
                  <span className="violation-reason">{w.reason}</span>
                  <span className="violation-time">{w.timestamp}</span>
                </div>
              ))}
            </div>

            <div className="termination-actions">
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={onExit}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
