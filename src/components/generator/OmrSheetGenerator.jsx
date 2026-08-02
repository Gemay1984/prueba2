import React, { useState, useRef } from 'react';
import { Printer, Settings, CheckCircle2, FileText, Upload, Image as ImageIcon, Users, User, Download, RefreshCw } from 'lucide-react';
import { saveExam } from '../../utils/storage';
import { downloadOmrSheetsAsPDF } from '../../utils/pdfGenerator';

export function OmrSheetGenerator({ activeExam, onExamUpdate }) {
  const [examConfig, setExamConfig] = useState(activeExam);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [printMode, setPrintMode] = useState(activeExam?.studentsList?.length > 0 ? 'batch' : 'generic'); // 'generic' | 'batch'
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const logoInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setExamConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setSavedSuccess(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      handleInputChange('logo', evt.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfig = () => {
    saveExam(examConfig);
    if (onExamUpdate) onExamUpdate(examConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setTimeout(async () => {
      let targetNodes = [];
      if (printMode === 'batch' && (examConfig.studentsList || []).length > 0) {
        targetNodes = Array.from(document.querySelectorAll('.print-only .omr-sheet-container'));
      } else {
        targetNodes = Array.from(document.querySelectorAll('.no-print .omr-sheet-container, .omr-sheet-wrapper > .omr-sheet-container'));
      }

      if (targetNodes.length === 0) {
        targetNodes = Array.from(document.querySelectorAll('.omr-sheet-container'));
      }

      await downloadOmrSheetsAsPDF(targetNodes, `Hojas_OMR_${(examConfig.title || 'Examen').replace(/\s+/g, '_')}`);
      setIsDownloadingPdf(false);
    }, 100);
  };

  const getOptions = (count = 4) => {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    return labels.slice(0, count);
  };

  const columnsCount = examConfig.questionCount > 60 ? 3 : examConfig.questionCount > 25 ? 2 : 1;
  const questionsPerCol = Math.ceil(examConfig.questionCount / columnsCount);

  const renderQuestionColumn = (startIdx, endIdx) => {
    const questions = [];
    for (let q = startIdx; q <= Math.min(endIdx, examConfig.questionCount); q++) {
      const options = getOptions(examConfig.optionsPerQuestion);
      questions.push(
        <div key={`q_${q}`} className="omr-q-row">
          <span className="omr-q-num">{q.toString().padStart(2, '0')}.</span>
          <div className="omr-bubbles-group">
            {options.map(opt => (
              <div key={`q_${q}_${opt}`} className="omr-bubble-wrapper">
                <span className="omr-bubble">{opt}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return questions;
  };

  const students = examConfig.studentsList || [];

  const renderSingleSheet = (student = null, index = 0) => {
    const studentIdDigits = (student?.id || '').padStart(examConfig.idLength || 6, '0').split('');

    return (
      <div key={student ? `sheet_${student.id}_${index}` : 'sheet_generic'} className="omr-sheet-container">
        {/* FIDUCIAL ALIGNMENT CORNER MARKERS */}
        <div className="fiducial-marker top-left"></div>
        <div className="fiducial-marker top-right"></div>
        <div className="fiducial-marker bottom-left"></div>
        <div className="fiducial-marker bottom-right"></div>

        {/* OMR Header with School Logo */}
        <header className="sheet-header">
          <div className="header-brand-flex">
            {examConfig.logo ? (
              <img src={examConfig.logo} alt="Logo Colegio" className="school-logo-img" />
            ) : (
              <div className="school-logo-placeholder">LOGO COLEGIO</div>
            )}
            <div>
              <h1 className="institution-title">{examConfig.institution || 'INSTITUCIÓN EDUCATIVA'}</h1>
              <h2 className="exam-title">{examConfig.title || 'EXAMEN DE OPCIÓN MÚLTIPLE'}</h2>
              <span className="exam-subject">ÁREA / ASIGNATURA: {examConfig.area || examConfig.subject}</span>
            </div>
          </div>
          <div className="exam-code-box">
            <span className="code-label">CÓDIGO DE EXAMEN</span>
            <span className="code-value">{examConfig.id}</span>
          </div>
        </header>

        <hr className="sheet-divider" />

        {/* Student Information and Document Grid Section */}
        <div className="student-section">
          <div className="student-info-fields">
            <div className="field-row">
              <span className="field-label">ESTUDIANTE:</span>
              <div className="field-line">
                {student && <strong className="prefilled-name">{student.name}</strong>}
              </div>
            </div>
            <div className="field-row">
              <span className="field-label">GRADO / CURSO:</span>
              <div className="field-line short">
                {student && <strong>{student.grade}</strong>}
              </div>
              <span className="field-label">FECHA:</span>
              <div className="field-line short">
                <strong>{examConfig.date}</strong>
              </div>
            </div>

            {/* Instructions Box */}
            <div className="instructions-box">
              <span className="instructions-title">INSTRUCCIONES DE LLENADO:</span>
              <ul>
                <li>Rellene completamente el círculo de la opción elegida con lápiz o esfero negro.</li>
                <li>Ejemplo correcto: <span className="sample-bubble filled">A</span> / Incorrecto: <span className="sample-bubble stroke">X</span></li>
                <li>No manche las marcas de las esquinas ni realice trazos fuera de los círculos.</li>
              </ul>
            </div>
          </div>

          {/* Student ID OMR Grid */}
          <div className="student-id-grid-container">
            <div className="id-grid-header">DÓCUMENTO DE IDENTIDAD</div>
            <div className="id-columns-wrapper">
              {Array.from({ length: examConfig.idLength || 6 }).map((_, colIdx) => {
                const prefilledDigit = studentIdDigits[colIdx];

                return (
                  <div key={`id_col_${colIdx}`} className="id-column">
                    <div className="id-digit-box">
                      {prefilledDigit ? <strong>{prefilledDigit}</strong> : ''}
                    </div>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
                      const isDigitFilled = prefilledDigit !== undefined && prefilledDigit === digit.toString();

                      return (
                        <span
                          key={`id_dig_${colIdx}_${digit}`}
                          className={`id-bubble ${isDigitFilled ? 'filled' : ''}`}
                        >
                          {digit}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <hr className="sheet-divider" />

        {/* Answer Columns Grid */}
        <div className="answers-section">
          <div className="answers-columns-grid" style={{ gridTemplateColumns: `repeat(${columnsCount}, 1fr)` }}>
            {Array.from({ length: columnsCount }).map((_, cIdx) => {
              const start = cIdx * questionsPerCol + 1;
              const end = (cIdx + 1) * questionsPerCol;
              return (
                <div key={`col_${cIdx}`} className="answers-column">
                  <div className="col-header">PREGUNTAS {start} A {Math.min(end, examConfig.questionCount)}</div>
                  {renderQuestionColumn(start, end)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sheet Footer */}
        <footer className="sheet-footer">
          <span>SISTEMA DE EVALUACIÓN OMR ICFES</span>
          <span>HOJA OFICIAL DE RESPUESTAS</span>
        </footer>
      </div>
    );
  };

  return (
    <div className="generator-container animate-fade-in">
      {/* Control Toolbar - Hidden in Print */}
      <div className="glass-panel control-toolbar no-print">
        <div className="toolbar-header">
          <div>
            <h2><FileText className="inline-icon" /> Diseñador e Impresor de Hojas OMR</h2>
            <p className="text-secondary">Configura el área, número de preguntas, logo de tu colegio e imprime o descarga en PDF.</p>
          </div>
          <div className="toolbar-actions">
            <button className="btn btn-secondary" onClick={handleSaveConfig}>
              {savedSuccess ? <CheckCircle2 className="text-success" /> : <Settings />}
              {savedSuccess ? '¡Guardado!' : 'Guardar Ajustes'}
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
              {isDownloadingPdf ? <RefreshCw className="spin" size={16} /> : <Download size={16} />}
              {isDownloadingPdf ? 'Generando PDF...' : 'Descargar Archivo PDF'}
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} /> Imprimir {printMode === 'batch' && students.length > 0 ? `Lote de ${students.length} Hojas` : 'Hoja Genérica'} (PDF)
            </button>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="config-grid">
          <div className="form-group">
            <label>Nombre del Colegio / Institución</label>
            <input
              type="text"
              className="form-control"
              value={examConfig.institution}
              onChange={e => handleInputChange('institution', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Logo del Colegio</label>
            <div className="logo-upload-btn-box">
              <button className="btn btn-secondary btn-sm" onClick={() => logoInputRef.current?.click()}>
                <ImageIcon size={16} /> {examConfig.logo ? 'Cambiar Logo' : 'Subir Logo PNG/JPG'}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              {examConfig.logo && (
                <button className="btn btn-danger btn-sm" onClick={() => handleInputChange('logo', null)}>
                  Quitar
                </button>
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Título del Examen</label>
            <input
              type="text"
              className="form-control"
              value={examConfig.title}
              onChange={e => handleInputChange('title', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Área o Asignatura</label>
            <input
              type="text"
              className="form-control"
              value={examConfig.area || examConfig.subject}
              onChange={e => handleInputChange('area', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Número de Preguntas</label>
            <select
              className="form-control"
              value={examConfig.questionCount}
              onChange={e => handleInputChange('questionCount', parseInt(e.target.value))}
            >
              <option value={10}>10 Preguntas</option>
              <option value={20}>20 Preguntas</option>
              <option value={30}>30 Preguntas (ICFES)</option>
              <option value={50}>50 Preguntas</option>
              <option value={60}>60 Preguntas</option>
              <option value={80}>80 Preguntas</option>
              <option value={100}>100 Preguntas</option>
            </select>
          </div>
        </div>

        {/* Print Mode Selector */}
        <div className="print-mode-bar">
          <span className="mode-label">Modo de Generación:</span>
          <button
            className={`btn-mode ${printMode === 'generic' ? 'active' : ''}`}
            onClick={() => setPrintMode('generic')}
          >
            <FileText size={16} /> Hoja Genérica (Llenar a Mano)
          </button>
          <button
            className={`btn-mode ${printMode === 'batch' ? 'active' : ''}`}
            onClick={() => setPrintMode('batch')}
          >
            <Users size={16} /> Hojas Personalizadas ({students.length} Estudiantes Cargados)
          </button>

          {printMode === 'batch' && students.length > 0 && (
            <div className="student-selector">
              <label>Vista previa alumno:</label>
              <select
                className="form-control select-student"
                value={selectedStudentIndex}
                onChange={e => setSelectedStudentIndex(parseInt(e.target.value))}
              >
                {students.map((st, idx) => (
                  <option key={`opt_st_${idx}`} value={idx}>{st.name} ({st.id})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="omr-sheet-wrapper">
        {printMode === 'batch' && students.length > 0 ? (
          <>
            <div className="no-print">
              {renderSingleSheet(students[selectedStudentIndex], selectedStudentIndex)}
            </div>
            <div className="print-only">
              {students.map((st, idx) => renderSingleSheet(st, idx))}
            </div>
          </>
        ) : (
          renderSingleSheet(null)
        )}
      </div>

      <style>{`
        .generator-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .control-toolbar {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .toolbar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .toolbar-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .logo-upload-btn-box {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .btn-sm {
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
        }

        .print-mode-bar {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
          flex-wrap: wrap;
        }

        .mode-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .btn-mode {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-color);
          background: var(--bg-glass);
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-mode.active {
          background: var(--accent-primary);
          color: #fff;
          border-color: var(--accent-primary);
        }

        .student-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-left: auto;
        }

        .select-student {
          padding: 0.35rem 0.6rem;
          font-size: 0.85rem;
        }

        /* OMR SHEET STYLING FOR DISPLAY & PRINT */
        .omr-sheet-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem 0;
        }

        .omr-sheet-container {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          background: #ffffff;
          color: #000000;
          padding: 14mm;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: 'Arial', 'Helvetica', sans-serif;
          user-select: none;
          page-break-after: always;
        }

        .fiducial-marker {
          position: absolute;
          width: 24px;
          height: 24px;
          background-color: #000000;
        }
        .fiducial-marker.top-left { top: 8mm; left: 8mm; }
        .fiducial-marker.top-right { top: 8mm; right: 8mm; }
        .fiducial-marker.bottom-left { bottom: 8mm; left: 8mm; }
        .fiducial-marker.bottom-right { bottom: 8mm; right: 8mm; }

        .sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 4mm;
        }

        .header-brand-flex {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .school-logo-img {
          max-width: 65px;
          max-height: 65px;
          object-fit: contain;
        }

        .school-logo-placeholder {
          width: 60px;
          height: 60px;
          border: 1.5px dashed #666;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 6pt;
          font-weight: 800;
          color: #666;
          text-align: center;
          padding: 2px;
        }

        .institution-title {
          font-size: 14pt;
          font-weight: 800;
          color: #111;
          text-transform: uppercase;
        }

        .exam-title {
          font-size: 11pt;
          font-weight: 700;
          color: #333;
          margin-top: 2px;
        }

        .exam-subject {
          font-size: 9pt;
          font-weight: 600;
          color: #555;
          display: block;
          margin-top: 2px;
        }

        .exam-code-box {
          border: 2px solid #000;
          padding: 4px 8px;
          text-align: center;
          background: #f8f9fa;
        }

        .code-label {
          display: block;
          font-size: 7pt;
          font-weight: 700;
          color: #555;
        }

        .code-value {
          font-size: 9pt;
          font-weight: 800;
          font-family: monospace;
        }

        .sheet-divider {
          border: none;
          border-top: 1.5px solid #000;
          margin: 4mm 0;
        }

        .student-section {
          display: flex;
          gap: 15px;
          justify-content: space-between;
        }

        .student-info-fields {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .field-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .field-label {
          font-size: 8pt;
          font-weight: 700;
          white-space: nowrap;
        }

        .field-line {
          flex: 1;
          border-bottom: 1.5px solid #000;
          height: 16px;
          display: flex;
          align-items: flex-end;
          padding-left: 6px;
        }

        .field-line.short {
          width: 80px;
          flex: none;
        }

        .prefilled-name {
          font-size: 10pt;
          font-weight: 800;
          color: #000;
          text-transform: uppercase;
        }

        .instructions-box {
          border: 1px solid #333;
          padding: 6px;
          background: #f9fafb;
          font-size: 7.5pt;
          margin-top: 4px;
          border-radius: 3px;
        }

        .instructions-title {
          font-weight: 800;
          display: block;
          margin-bottom: 2px;
        }

        .instructions-box ul {
          padding-left: 14px;
          margin: 0;
        }

        .sample-bubble {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 1px solid #000;
          border-radius: 50%;
          text-align: center;
          line-height: 12px;
          font-size: 7pt;
          font-weight: bold;
        }

        .sample-bubble.filled {
          background: #000;
          color: #fff;
        }

        .student-id-grid-container {
          border: 1.5px solid #000;
          padding: 4px;
          background: #ffffff;
        }

        .id-grid-header {
          font-size: 7.5pt;
          font-weight: 800;
          text-align: center;
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
          margin-bottom: 4px;
        }

        .id-columns-wrapper {
          display: flex;
          gap: 4px;
        }

        .id-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .id-digit-box {
          width: 15px;
          height: 16px;
          border: 1px solid #000;
          background: #fff;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7.5pt;
        }

        .id-bubble {
          width: 14px;
          height: 14px;
          border: 1px solid #000;
          border-radius: 50%;
          font-size: 6.5pt;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .id-bubble.filled {
          background: #000;
          color: #fff;
        }

        .answers-section {
          flex: 1;
          margin-top: 2mm;
        }

        .answers-columns-grid {
          display: grid;
          gap: 12px;
        }

        .answers-column {
          border: 1.5px solid #000;
          padding: 6px;
          border-radius: 2px;
        }

        .col-header {
          background: #000;
          color: #fff;
          font-size: 7.5pt;
          font-weight: 800;
          text-align: center;
          padding: 3px 0;
          margin-bottom: 6px;
          letter-spacing: 0.05em;
        }

        .omr-q-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2.5px 4px;
          border-bottom: 1px stroke #eee;
        }

        .omr-q-num {
          font-size: 8.5pt;
          font-weight: 800;
          width: 24px;
          color: #111;
        }

        .omr-bubbles-group {
          display: flex;
          gap: 8px;
        }

        .omr-bubble-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .omr-bubble {
          width: 18px;
          height: 18px;
          border: 1.5px solid #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7.5pt;
          font-weight: 800;
          color: #000;
          background: #fff;
        }

        .sheet-footer {
          display: flex;
          justify-content: space-between;
          font-size: 7pt;
          font-weight: 700;
          color: #444;
          border-top: 1px solid #888;
          padding-top: 3px;
          margin-bottom: 2mm;
        }
      `}</style>
    </div>
  );
}
