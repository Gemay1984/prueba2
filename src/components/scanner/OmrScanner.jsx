import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle2, AlertTriangle, RefreshCw, Save, Sparkles, User, Award, Eye, Sliders, Image as ImageIcon } from 'lucide-react';
import { processOmrCanvas } from '../../utils/omrEngine';
import { saveResult } from '../../utils/storage';
import confetti from 'canvas-confetti';

export function OmrScanner({ activeExam }) {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [savedNotification, setSavedNotification] = useState(false);
  const [darknessThreshold, setDarknessThreshold] = useState(0.35); // Sensitivity slider
  const [viewAnnotated, setViewAnnotated] = useState(true); // Toggle annotated sheet view (rbaron/omr style)

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('No se pudo acceder a la cámara. Asegúrate de dar permisos en tu navegador.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  const handleCaptureAndGrade = () => {
    if (!videoRef.current && activeTab === 'camera') return;
    setIsProcessing(true);

    setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (activeTab === 'camera' && videoRef.current) {
        canvas.width = videoRef.current.videoWidth || 1280;
        canvas.height = videoRef.current.videoHeight || 720;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }

      const result = processOmrCanvas(canvas, activeExam, { darknessThreshold });
      setLastResult(result);
      setIsProcessing(false);

      playBeep();
      if (result && result.percentage >= 70) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    }, 400);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        setIsProcessing(true);
        setTimeout(() => {
          const result = processOmrCanvas(canvas, activeExam, { darknessThreshold });
          setLastResult(result);
          setIsProcessing(false);
          playBeep();
        }, 300);
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveResult = () => {
    if (!lastResult) return;
    const saved = saveResult({
      ...lastResult,
      examId: activeExam.id,
      examTitle: activeExam.title,
      institution: activeExam.institution
    });

    if (saved) {
      setSavedNotification(true);
      if (lastResult.percentage >= 70) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      setTimeout(() => setSavedNotification(false), 3000);
    }
  };

  const handleManualOverride = (qNum, newAnswer) => {
    if (!lastResult) return;

    const newDetails = lastResult.details.map(item => {
      if (item.question === qNum) {
        const isCorrect = newAnswer === item.correct;
        return { ...item, detected: newAnswer, isCorrect };
      }
      return item;
    });

    const newAnswers = { ...lastResult.answers, [qNum]: newAnswer };
    let correctCount = 0;
    let incorrectCount = 0;
    let blankCount = 0;
    let doubleMarkCount = 0;

    newDetails.forEach(d => {
      if (d.isCorrect) correctCount++;
      else if (d.detected === 'BLANK') blankCount++;
      else if (d.detected === 'MULTIPLE') doubleMarkCount++;
      else incorrectCount++;
    });

    const correctPts = activeExam.scoringRules?.correctPoints ?? 1;
    const totalPossible = lastResult.totalQuestions * correctPts;
    const rawScore = Math.max(0, correctCount * correctPts);
    const percentage = Math.round((rawScore / totalPossible) * 100);

    setLastResult(prev => ({
      ...prev,
      answers: newAnswers,
      details: newDetails,
      correctCount,
      incorrectCount,
      blankCount,
      doubleMarkCount,
      score: rawScore,
      percentage
    }));
  };

  return (
    <div className="scanner-container animate-fade-in">
      {/* Scanner Mode Tabs & Sensitivity Toolbar */}
      <div className="glass-panel scanner-toolbar">
        <div>
          <h2><Camera className="inline-icon" /> Escáner de Hojas OMR (Estilo rbaron/omr)</h2>
          <p className="text-secondary">Visión artificial en tiempo real con resaltado visual de aciertos (verde), errores (rojo) y respuestas correctas (azul).</p>
        </div>
        <div className="toolbar-controls-flex">
          {/* Threshold Slider */}
          <div className="threshold-box" title="Ajusta la sensibilidad para marcas de lápiz claro u obscuro">
            <Sliders size={15} />
            <label>Sensibilidad Tinta:</label>
            <input
              type="range"
              min="0.20"
              max="0.55"
              step="0.05"
              value={darknessThreshold}
              onChange={e => setDarknessThreshold(parseFloat(e.target.value))}
            />
            <span>{Math.round(darknessThreshold * 100)}%</span>
          </div>

          <div className="tab-switcher">
            <button
              className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
              onClick={() => setActiveTab('camera')}
            >
              <Camera size={18} /> Cámara Celular
            </button>
            <button
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={18} /> Subir Imagen
            </button>
          </div>
        </div>
      </div>

      <div className="scanner-main-layout">
        {/* Viewfinder or Annotated Sheet Display */}
        <div className="glass-panel viewfinder-panel">
          {lastResult && viewAnnotated ? (
            <div className="annotated-image-box animate-fade-in">
              <div className="annotated-header">
                <span>🟢 Acierto | 🔴 Error | 🔵 Respuesta Correcta Esperada</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewAnnotated(false)}>
                  <Camera size={14} /> Volver a Cámara
                </button>
              </div>
              <img src={lastResult.annotatedCanvasDataUrl} alt="Hoja OMR Anotada" className="annotated-sheet-img" />
            </div>
          ) : activeTab === 'camera' ? (
            <div className="viewfinder-wrapper">
              <video ref={videoRef} className="video-feed" playsInline muted></video>
              <div className="viewfinder-overlay">
                <div className="corner-target top-left"></div>
                <div className="corner-target top-right"></div>
                <div className="corner-target bottom-left"></div>
                <div className="corner-target bottom-right"></div>
                <div className="overlay-guide-text">
                  Alinea las 4 esquinas de la hoja en el recuadro
                </div>
              </div>

              {/* Floating Action Button inside camera view */}
              <div className="floating-scan-btn-box">
                <button
                  className="btn btn-success btn-floating-scan"
                  onClick={handleCaptureAndGrade}
                  disabled={isProcessing}
                >
                  {isProcessing ? <RefreshCw className="spin" size={18} /> : <Eye size={18} />}
                  {isProcessing ? 'Procesando Visión OMR...' : '📸 CALIFICAR HOJA AHORA'}
                </button>
              </div>

              {cameraError && (
                <div className="camera-error-overlay">
                  <AlertTriangle size={36} color="var(--accent-warning)" />
                  <p>{cameraError}</p>
                  <button className="btn btn-secondary" onClick={startCamera}>Reintentar Cámara</button>
                </div>
              )}
            </div>
          ) : (
            <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
              <Upload size={48} className="upload-icon" />
              <h3>Haz clic para seleccionar o arrastra una imagen de la hoja OMR</h3>
              <p className="text-secondary">Soporta formatos JPG, PNG o WebP</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden-file-input"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Action Trigger Button */}
          {(!lastResult || !viewAnnotated) && activeTab === 'camera' && isCameraActive && (
            <div className="scanner-actions">
              <button
                className="btn btn-success btn-lg"
                onClick={handleCaptureAndGrade}
                disabled={isProcessing}
              >
                {isProcessing ? <RefreshCw className="spin" /> : <Eye />}
                {isProcessing ? 'Procesando Visión OMR...' : 'Calcular Nota Ahora'}
              </button>
            </div>
          )}
        </div>

        {/* Results Card Panel */}
        <div className="glass-panel results-card-panel">
          <h3><Award className="inline-icon" /> Resultado OMR</h3>

          {lastResult ? (
            <div className="result-details animate-fade-in">
              <div className="score-header-badge">
                <div className="student-id-tag">
                  <User size={16} /> ID: <strong>{lastResult.studentId}</strong>
                </div>
                <div className="percentage-circle" style={{
                  background: lastResult.percentage >= 60 ? 'var(--gradient-success)' : 'var(--gradient-primary)'
                }}>
                  <span className="percentage-val">{lastResult.percentage}%</span>
                  <span className="percentage-lbl">CALIFICACIÓN</span>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-box green">
                  <span className="metric-num">{lastResult.correctCount}</span>
                  <span className="metric-lbl">Aciertos</span>
                </div>
                <div className="metric-box red">
                  <span className="metric-num">{lastResult.incorrectCount}</span>
                  <span className="metric-lbl">Errores</span>
                </div>
                <div className="metric-box gray">
                  <span className="metric-num">{lastResult.blankCount}</span>
                  <span className="metric-lbl">En Blanco</span>
                </div>
                <div className="metric-box blue">
                  <span className="metric-num">{lastResult.score} / {lastResult.totalPossible}</span>
                  <span className="metric-lbl">Puntos</span>
                </div>
              </div>

              <div className="result-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn btn-primary w-full" onClick={handleSaveResult}>
                  {savedNotification ? <CheckCircle2 /> : <Save />}
                  {savedNotification ? '¡Resultado Guardado!' : 'Guardar Calificación'}
                </button>
                {lastResult.annotatedCanvasDataUrl && (
                  <button
                    className="btn btn-secondary w-full"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = lastResult.annotatedCanvasDataUrl;
                      a.download = `Calificacion_OMR_${lastResult.studentId || 'Estudiante'}.png`;
                      a.click();
                    }}
                  >
                    <Download size={16} /> Descargar Imagen Anotada (PNG)
                  </button>
                )}
              </div>

              {/* Questions Breakdown List */}
              <div className="questions-breakdown">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4>Desglose y Corrección Manual ({lastResult.totalQuestions})</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Selecciona para corregir</span>
                </div>
                <div className="breakdown-list">
                  {lastResult.details.map(item => (
                    <div
                      key={`det_${item.question}`}
                      className={`breakdown-chip ${item.isCorrect ? 'correct' : item.detected === 'BLANK' ? 'blank' : 'incorrect'}`}
                    >
                      <span className="chip-q">P{item.question}.</span>
                      <select
                        value={item.detected}
                        onChange={(e) => handleManualOverride(item.question, e.target.value)}
                        style={{
                          background: 'transparent',
                          color: 'inherit',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          outline: 'none',
                          padding: '0 2px'
                        }}
                        title="Haz clic para corregir manualmente esta respuesta"
                      >
                        <option value="A" style={{ color: '#000' }}>A</option>
                        <option value="B" style={{ color: '#000' }}>B</option>
                        <option value="C" style={{ color: '#000' }}>C</option>
                        <option value="D" style={{ color: '#000' }}>D</option>
                        {activeExam.optionsPerQuestion >= 5 && <option value="E" style={{ color: '#000' }}>E</option>}
                        <option value="BLANK" style={{ color: '#000' }}>BLANK</option>
                        <option value="MULTIPLE" style={{ color: '#000' }}>MULTIPLE</option>
                      </select>
                      {item.isCorrect ? <CheckCircle2 size={12} /> : <span className="correct-hint">(Clave: {item.correct})</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-results-state">
              <Sparkles size={40} className="text-secondary" />
              <p>Apunta la cámara a la hoja OMR o sube una foto para generar el mapa de corrección anotado en pantalla.</p>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

      <style>{`
        .scanner-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .scanner-toolbar {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .toolbar-controls-flex {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .threshold-box {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--bg-glass);
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .threshold-box input[type="range"] {
          width: 80px;
          cursor: pointer;
        }

        .tab-switcher {
          display: flex;
          background: var(--bg-glass);
          padding: 4px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn.active {
          background: var(--accent-primary);
          color: #ffffff;
        }

        .scanner-main-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .scanner-main-layout {
            grid-template-columns: 1fr;
          }
        }

        .viewfinder-panel {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 480px;
        }

        .annotated-image-box {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .annotated-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 600;
          background: var(--bg-glass);
          padding: 0.5rem 0.8rem;
          border-radius: var(--radius-sm);
        }

        .annotated-sheet-img {
          width: 100%;
          max-height: 520px;
          object-fit: contain;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-md);
        }

        .viewfinder-wrapper {
          position: relative;
          width: 100%;
          max-width: 640px;
          aspect-ratio: 4 / 3;
          background: #000;
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .floating-scan-btn-box {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 25;
        }

        .btn-floating-scan {
          padding: 0.75rem 1.6rem;
          font-size: 1rem;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5);
          backdrop-filter: blur(8px);
          white-space: nowrap;
          border-radius: var(--radius-full);
        }

        .video-feed {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .viewfinder-overlay {
          position: absolute;
          inset: 8%;
          border: 2px dashed rgba(59, 130, 246, 0.6);
          border-radius: var(--radius-sm);
          pointer-events: none;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 1rem;
        }

        .corner-target {
          position: absolute;
          width: 28px;
          height: 28px;
          border: 3px solid var(--accent-secondary);
        }
        .corner-target.top-left { top: -2px; left: -2px; border-right: none; border-bottom: none; }
        .corner-target.top-right { top: -2px; right: -2px; border-left: none; border-bottom: none; }
        .corner-target.bottom-left { bottom: -2px; left: -2px; border-right: none; border-top: none; }
        .corner-target.bottom-right { bottom: -2px; right: -2px; border-left: none; border-top: none; }

        .overlay-guide-text {
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          padding: 0.4rem 0.9rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
          backdrop-filter: blur(4px);
        }

        .camera-error-overlay {
          position: absolute;
          inset: 0;
          background: rgba(11, 15, 25, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
          text-align: center;
        }

        .upload-dropzone {
          width: 100%;
          height: 380px;
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          padding: 2rem;
        }

        .upload-dropzone:hover {
          border-color: var(--accent-primary);
          background: var(--bg-glass);
        }

        .upload-icon {
          color: var(--accent-primary);
        }

        .hidden-file-input {
          display: none;
        }

        .scanner-actions {
          margin-top: 1rem;
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .btn-lg {
          padding: 0.85rem 2rem;
          font-size: 1.05rem;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* RESULTS CARD */
        .results-card-panel {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .score-header-badge {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }

        .student-id-tag {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .percentage-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }

        .percentage-val {
          font-family: var(--font-family-heading);
          font-size: 1.4rem;
          font-weight: 800;
          line-height: 1;
        }

        .percentage-lbl {
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
          margin: 0.5rem 0;
        }

        .metric-box {
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
        }

        .metric-num {
          font-family: var(--font-family-heading);
          font-size: 1.25rem;
          font-weight: 700;
        }

        .metric-lbl {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .metric-box.green .metric-num { color: var(--accent-success); }
        .metric-box.red .metric-num { color: var(--accent-danger); }
        .metric-box.gray .metric-num { color: var(--text-muted); }
        .metric-box.blue .metric-num { color: var(--accent-primary); }

        .w-full {
          width: 100%;
        }

        .questions-breakdown {
          margin-top: 1rem;
        }

        .questions-breakdown h4 {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.6rem;
        }

        .breakdown-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          max-height: 160px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .breakdown-chip {
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .breakdown-chip.correct {
          background: rgba(16, 185, 129, 0.15);
          color: var(--accent-success);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .breakdown-chip.incorrect {
          background: rgba(239, 68, 68, 0.15);
          color: var(--accent-danger);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .breakdown-chip.blank {
          background: rgba(107, 114, 128, 0.15);
          color: var(--text-muted);
          border: 1px solid rgba(107, 114, 128, 0.3);
        }

        .correct-hint {
          font-size: 0.7rem;
          opacity: 0.8;
        }

        .empty-results-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 1rem;
          padding: 3rem 1rem;
        }
      `}</style>
    </div>
  );
}
