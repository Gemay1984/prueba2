import React, { useState, useEffect } from 'react';
import { FileText, Key, Camera, BarChart3, Sun, Moon, Sparkles, PlusCircle, Users, CheckCircle } from 'lucide-react';
import { OmrSheetGenerator } from './components/generator/OmrSheetGenerator';
import { AnswerKeyBuilder } from './components/key-builder/AnswerKeyBuilder';
import { StudentListManager } from './components/students/StudentListManager';
import { OmrScanner } from './components/scanner/OmrScanner';
import { ResultsDashboard } from './components/reports/ResultsDashboard';
import { getExams, DEFAULT_EXAM, saveExam } from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'key' | 'generator' | 'scanner' | 'results'
  const [theme, setTheme] = useState('dark');
  const [exams, setExams] = useState([]);
  const [activeExamId, setActiveExamId] = useState(DEFAULT_EXAM.id);
  const [cvLoaded, setCvLoaded] = useState(false);

  useEffect(() => {
    const list = getExams();
    setExams(list);
    if (list.length > 0) {
      setActiveExamId(list[0].id);
    }
  }, []);

  const activeExam = exams.find(e => e.id === activeExamId) || DEFAULT_EXAM;

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleExamUpdate = (updatedExam) => {
    saveExam(updatedExam);
    setExams(prev => {
      const idx = prev.findIndex(e => e.id === updatedExam.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedExam;
        return copy;
      }
      return [updatedExam, ...prev];
    });
  };

  const handleCreateNewExam = () => {
    const newId = 'exam-' + Date.now();
    const newExam = {
      ...DEFAULT_EXAM,
      id: newId,
      title: 'Nuevo Examen #' + (exams.length + 1),
      date: new Date().toISOString().split('T')[0]
    };
    saveExam(newExam);
    setExams(prev => [newExam, ...prev]);
    setActiveExamId(newId);
  };

  return (
    <div className="app-layout">
      {/* Top Header Navigation */}
      <header className="app-header no-print">
        <div className="header-container">
          <div className="brand-section">
            <div className="brand-logo">
              <Sparkles size={22} className="logo-sparkle" />
            </div>
            <div>
              <h1 className="brand-title">EVALUA <span>OMR</span></h1>
              <span className="brand-subtitle">Generación y Calificación ICFES</span>
            </div>
          </div>

          {/* Exam Selector */}
          <div className="header-controls">
            <div className="exam-selector-box">
              <label>Examen Activo:</label>
              <select
                className="form-control select-exam"
                value={activeExamId}
                onChange={e => setActiveExamId(e.target.value)}
              >
                {exams.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.title} ({ex.questionCount}q)</option>
                ))}
              </select>
              <button className="btn btn-secondary btn-icon" onClick={handleCreateNewExam} title="Crear Nuevo Examen">
                <PlusCircle size={18} />
              </button>
            </div>

            <button className="theme-toggle-btn" onClick={toggleTheme} title="Cambiar Tema">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Workflow Step Navigation */}
        <nav className="nav-tabs-bar">
          <div className="nav-tabs-container">
            <button
              className={`nav-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <Users size={18} /> 1. Cargar Estudiantes (Excel)
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'key' ? 'active' : ''}`}
              onClick={() => setActiveTab('key')}
            >
              <Key size={18} /> 2. Clave / Llave de Respuestas
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
              onClick={() => setActiveTab('generator')}
            >
              <FileText size={18} /> 3. Generar Hojas (Logo y PDF)
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
              onClick={() => setActiveTab('scanner')}
            >
              <Camera size={18} /> 4. Escanear con Celular
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              <BarChart3 size={18} /> 5. Resultados y Reportes
            </button>
          </div>
        </nav>
      </header>

      {/* Active Tab View */}
      <main className="app-main-content">
        {activeTab === 'students' && (
          <StudentListManager activeExam={activeExam} onExamUpdate={handleExamUpdate} />
        )}
        {activeTab === 'key' && (
          <AnswerKeyBuilder activeExam={activeExam} onExamUpdate={handleExamUpdate} />
        )}
        {activeTab === 'generator' && (
          <OmrSheetGenerator activeExam={activeExam} onExamUpdate={handleExamUpdate} />
        )}
        {activeTab === 'scanner' && (
          <OmrScanner activeExam={activeExam} />
        )}
        {activeTab === 'results' && (
          <ResultsDashboard activeExam={activeExam} />
        )}
      </main>

      <style>{`
        .app-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .app-header {
          background: rgba(11, 15, 25, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 0.9rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .brand-logo {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
        }

        .brand-title {
          font-size: 1.35rem;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .brand-title span {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: block;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .exam-selector-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-glass);
          padding: 0.35rem 0.6rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .exam-selector-box label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
          white-space: nowrap;
        }

        .select-exam {
          padding: 0.4rem 0.6rem;
          font-size: 0.85rem;
          max-width: 220px;
        }

        .btn-icon {
          padding: 0.4rem;
          border-radius: var(--radius-sm);
        }

        .theme-toggle-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: var(--bg-glass);
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .theme-toggle-btn:hover {
          border-color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.08);
        }

        .nav-tabs-bar {
          border-top: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.2);
        }

        .nav-tabs-container {
          max-width: 1300px;
          margin: 0 auto;
          padding: 0 1.5rem;
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
        }

        .nav-tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font-family-heading);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .nav-tab-btn:hover {
          color: var(--text-primary);
        }

        .nav-tab-btn.active {
          color: var(--accent-primary);
          border-bottom-color: var(--accent-primary);
        }

        .app-main-content {
          max-width: 1300px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          flex: 1;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
