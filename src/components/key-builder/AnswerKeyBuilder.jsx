import React, { useState } from 'react';
import { Key, CheckCircle2, Save, AlertCircle, HelpCircle } from 'lucide-react';
import { saveExam } from '../../utils/storage';

export function AnswerKeyBuilder({ activeExam, onExamUpdate }) {
  const [exam, setExam] = useState(activeExam);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleKeyChange = (questionNum, option) => {
    setExam(prev => ({
      ...prev,
      answerKey: {
        ...prev.answerKey,
        [questionNum]: option
      }
    }));
    setSavedStatus(false);
  };

  const handleScoringChange = (field, value) => {
    setExam(prev => ({
      ...prev,
      scoringRules: {
        ...prev.scoringRules,
        [field]: parseFloat(value) || 0
      }
    }));
    setSavedStatus(false);
  };

  const handleSaveKey = () => {
    saveExam(exam);
    if (onExamUpdate) onExamUpdate(exam);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const options = ['A', 'B', 'C', 'D'];
  const filledCount = Object.keys(exam.answerKey || {}).filter(k => k <= exam.questionCount && exam.answerKey[k]).length;
  const isComplete = filledCount === exam.questionCount;

  return (
    <div className="key-builder-container animate-fade-in">
      <div className="glass-panel key-toolbar">
        <div className="toolbar-main">
          <div>
            <h2><Key className="inline-icon" /> Clave de Respuestas Correctas</h2>
            <p className="text-secondary">Selecciona la opción correcta para cada pregunta y establece la escala de puntos.</p>
          </div>
          <div className="toolbar-stats">
            <span className={`badge ${isComplete ? 'badge-green' : 'badge-orange'}`}>
              {filledCount} / {exam.questionCount} Respuestas Configuradas
            </span>
            <button className="btn btn-primary" onClick={handleSaveKey}>
              {savedStatus ? <CheckCircle2 /> : <Save />}
              {savedStatus ? '¡Clave Guardada!' : 'Guardar Clave'}
            </button>
          </div>
        </div>

        {/* Scoring Settings */}
        <div className="scoring-config-grid">
          <div className="form-group">
            <label>Puntos por Acierto (+)</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              value={exam.scoringRules?.correctPoints ?? 1}
              onChange={e => handleScoringChange('correctPoints', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Puntos por Error (-)</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              value={exam.scoringRules?.incorrectPoints ?? 0}
              onChange={e => handleScoringChange('incorrectPoints', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Puntos por Respuesta en Blanco</label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              value={exam.scoringRules?.blankPoints ?? 0}
              onChange={e => handleScoringChange('blankPoints', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Answer Key Matrix */}
      <div className="glass-panel answers-matrix-panel">
        <h3>Matriz de Respuestas para "{exam.title}"</h3>
        <div className="matrix-grid">
          {Array.from({ length: exam.questionCount }).map((_, idx) => {
            const qNum = idx + 1;
            const currentSelected = exam.answerKey?.[qNum];

            return (
              <div key={`key_q_${qNum}`} className="matrix-item">
                <span className="q-number">Pregunta {qNum.toString().padStart(2, '0')}</span>
                <div className="options-selector">
                  {options.map(opt => (
                    <button
                      key={`opt_${qNum}_${opt}`}
                      type="button"
                      className={`btn-opt ${currentSelected === opt ? 'selected' : ''}`}
                      onClick={() => handleKeyChange(qNum, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .key-builder-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .key-toolbar {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .toolbar-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .toolbar-stats {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .scoring-config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .answers-matrix-panel {
          padding: 1.5rem;
        }

        .answers-matrix-panel h3 {
          margin-bottom: 1.25rem;
          font-size: 1.1rem;
        }

        .matrix-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.9rem;
        }

        .matrix-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 0.8rem;
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }

        .q-number {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .options-selector {
          display: flex;
          gap: 0.35rem;
        }

        .btn-opt {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-primary);
          font-family: var(--font-family-heading);
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-opt:hover {
          border-color: var(--accent-primary);
          background: rgba(59, 130, 246, 0.1);
        }

        .btn-opt.selected {
          background: var(--gradient-primary);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </div>
  );
}
