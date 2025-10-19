import React, { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onAudioReady: (audioFile: File, voiceName: string) => void;
  isLoading?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/flac'];

export function VoiceRecorder({ onAudioReady, isLoading }: VoiceRecorderProps) {
  const [recordingMode, setRecordingMode] = useState<'record' | 'upload'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Stop timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Failed to access microphone. Please grant permission and try again.');
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }

    // Validate file type
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setError('Invalid file type. Please upload MP3, WAV, M4A, or FLAC.');
      return;
    }

    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const handleSubmit = () => {
    if (!audioBlob) {
      setError('Please record or upload audio first.');
      return;
    }

    if (!voiceName.trim()) {
      setError('Please enter a name for your voice.');
      return;
    }

    // Convert blob to File with proper name
    const audioFile = new File([audioBlob], `${voiceName}.mp3`, { type: 'audio/mp3' });
    onAudioReady(audioFile, voiceName);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-tabs">
        <button
          type="button"
          className={`tab ${recordingMode === 'record' ? 'active' : ''}`}
          onClick={() => setRecordingMode('record')}
          disabled={isLoading}
        >
          Record Audio
        </button>
        <button
          type="button"
          className={`tab ${recordingMode === 'upload' ? 'active' : ''}`}
          onClick={() => setRecordingMode('upload')}
          disabled={isLoading}
        >
          Upload File
        </button>
      </div>

      <div className="recorder-content">
        {recordingMode === 'record' ? (
          <div className="record-section">
            <div className="recording-info">
              <p>Record a clear audio sample of your voice (1-2 minutes recommended)</p>
              <ul>
                <li>Speak clearly in a quiet environment</li>
                <li>Avoid background noise</li>
                <li>Use natural speech patterns</li>
              </ul>
            </div>

            <div className="recording-controls">
              {!isRecording && !audioBlob && (
                <button
                  type="button"
                  className="btn-record"
                  onClick={startRecording}
                  disabled={isLoading}
                >
                  Start Recording
                </button>
              )}

              {isRecording && (
                <div className="recording-active">
                  <div className="recording-indicator">
                    <span className="pulse"></span>
                    Recording... {formatTime(recordingTime)}
                  </div>
                  <button
                    type="button"
                    className="btn-stop"
                    onClick={stopRecording}
                  >
                    Stop Recording
                  </button>
                </div>
              )}

              {audioUrl && !isRecording && (
                <div className="recording-preview">
                  <audio controls src={audioUrl} className="audio-player" />
                  <button
                    type="button"
                    className="btn-rerecord"
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioUrl(null);
                      setRecordingTime(0);
                    }}
                    disabled={isLoading}
                  >
                    Re-record
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="upload-section">
            <div className="upload-info">
              <p>Upload an audio file of your voice</p>
              <ul>
                <li>Accepted formats: MP3, WAV, M4A, FLAC</li>
                <li>Maximum file size: 10MB</li>
                <li>1-2 minutes of clear speech recommended</li>
              </ul>
            </div>

            <div className="upload-controls">
              <input
                type="file"
                id="audio-upload"
                accept=".mp3,.wav,.m4a,.flac,audio/*"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="file-input"
              />
              <label htmlFor="audio-upload" className="file-label">
                Choose Audio File
              </label>

              {audioUrl && (
                <div className="upload-preview">
                  <audio controls src={audioUrl} className="audio-player" />
                  <button
                    type="button"
                    className="btn-reupload"
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioUrl(null);
                    }}
                    disabled={isLoading}
                  >
                    Choose Different File
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {audioBlob && (
          <div className="voice-name-section">
            <label htmlFor="voice-name">Name your voice:</label>
            <input
              type="text"
              id="voice-name"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="e.g., My Voice, Dad's Voice"
              maxLength={100}
              disabled={isLoading}
              className="voice-name-input"
            />
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {audioBlob && voiceName && (
          <button
            type="button"
            className="btn-submit"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Cloning Voice...' : 'Clone Voice'}
          </button>
        )}
      </div>

      <style>{`
        .voice-recorder {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-top: 16px;
        }

        .recorder-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 2px solid #eee;
        }

        .tab {
          padding: 10px 20px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          transition: all 0.2s;
        }

        .tab:hover:not(:disabled) {
          color: #333;
        }

        .tab.active {
          color: #6366f1;
          border-bottom-color: #6366f1;
        }

        .tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .recorder-content {
          padding: 20px 0;
        }

        .recording-info, .upload-info {
          margin-bottom: 20px;
        }

        .recording-info p, .upload-info p {
          font-weight: 500;
          margin-bottom: 10px;
        }

        .recording-info ul, .upload-info ul {
          list-style: disc;
          padding-left: 20px;
          color: #666;
          font-size: 14px;
        }

        .recording-info li, .upload-info li {
          margin-bottom: 4px;
        }

        .recording-controls, .upload-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .btn-record, .btn-stop, .btn-rerecord, .btn-reupload, .btn-submit {
          padding: 12px 24px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-record {
          background: #ef4444;
          color: white;
        }

        .btn-record:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-stop {
          background: #666;
          color: white;
        }

        .btn-stop:hover:not(:disabled) {
          background: #555;
        }

        .btn-rerecord, .btn-reupload {
          background: #f3f4f6;
          color: #666;
        }

        .btn-rerecord:hover:not(:disabled), .btn-reupload:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .btn-submit {
          background: #6366f1;
          color: white;
          width: 100%;
          margin-top: 20px;
        }

        .btn-submit:hover:not(:disabled) {
          background: #4f46e5;
        }

        .btn-record:disabled, .btn-stop:disabled, .btn-rerecord:disabled,
        .btn-reupload:disabled, .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .recording-active {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          color: #ef4444;
        }

        .pulse {
          width: 12px;
          height: 12px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .recording-preview, .upload-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .audio-player {
          width: 100%;
          max-width: 400px;
        }

        .file-input {
          display: none;
        }

        .file-label {
          padding: 12px 24px;
          background: #6366f1;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .file-label:hover {
          background: #4f46e5;
        }

        .voice-name-section {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .voice-name-section label {
          font-weight: 500;
          font-size: 14px;
        }

        .voice-name-input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .voice-name-input:focus {
          outline: none;
          border-color: #6366f1;
        }

        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
}
