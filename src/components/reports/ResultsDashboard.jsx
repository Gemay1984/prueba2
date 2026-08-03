import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Trash2, Users, Award, TrendingUp, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { getResults, clearResults } from '../../utils/storage';
import { downloadStudentReportPDF } from '../../utils/pdfGenerator';

export function ResultsDashboard({ activeExam }) {
  const [resultsList, setResultsList] = useState([]);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

  const loadData = () => {
    const list = getResults(activeExam.id);
    setResultsList(list);
  };

  useEffect(() => {
    loadData();
  }, [activeExam.id]);

  const handleClearAll = () => {
    if (window.confirm('¿Estás seguro de borrar todos los resultados registrados para este examen?')) {
      clearResults(activeExam.id);
      loadData();
    }
  };

  // Export results list to CSV file
  const handleExportCSV = () => {
    if (resultsList.length === 0) return;

    const headers = ['Estudiante_ID', 'Nombre', 'Puntaje_Obtenido', 'Puntaje_Maximo', 'Porcentaje', 'Aciertos', 'Errores', 'En_Blanco', 'Fecha_Escaneo'];
    const rows = resultsList.map(r => [
      `"${r.studentId}"`,
      `"${r.studentName}"`,
      r.score,
      r.totalPossible,
      `"${r.percentage}%"`,
      r.correctCount,
      r.incorrectCount,
      r.blankCount,
      `"${new Date(r.scannedAt).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Resultados_${activeExam.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics calculations
  const totalStudents = resultsList.length;
  const avgPercentage = totalStudents > 0
    ? Math.round(resultsList.reduce((acc, r) => acc + r.percentage, 0) / totalStudents)
    : 0;
  const maxPercentage = totalStudents > 0 ? Math.max(...resultsList.map(r => r.percentage)) : 0;
  const minPercentage = totalStudents > 0 ? Math.min(...resultsList.map(r => r.percentage)) : 0;

  // Question difficulty analysis (Calculate error count per question)
  const questionErrorStats = {};
  for (let q = 1; q <= activeExam.questionCount; q++) {
    questionErrorStats[q] = 0;
  }

  resultsList.forEach(res => {
    (res.details || []).forEach(d => {
      if (!d.isCorrect) {
        questionErrorStats[d.question] = (questionErrorStats[d.question] || 0) + 1;
      }
    });
  });

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Header Toolbar */}
      <div className="glass-panel dashboard-toolbar">
        <div>
          <h2><BarChart3 className="inline-icon" /> Panel de Resultados y Estadísticas</h2>
          <p className="text-secondary">Examen: <strong>{activeExam.title}</strong> ({activeExam.questionCount} preguntas)</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={16} /> Actualizar
          </button>
          <button className="btn btn-primary" onClick={handleExportCSV} disabled={totalStudents === 0}>
            <Download size={16} /> Exportar Excel (CSV)
          </button>
          {totalStudents > 0 && (
            <button className="btn btn-danger" onClick={handleClearAll}>
              <Trash2 size={16} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="glass-panel kpi-card">
          <div className="kpi-icon blue"><Users /></div>
          <div className="kpi-content">
            <span className="kpi-value">{totalStudents}</span>
            <span className="kpi-label">Estudiantes Evaluados</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-icon cyan"><TrendingUp /></div>
          <div className="kpi-content">
            <span className="kpi-value">{avgPercentage}%</span>
            <span className="kpi-label">Promedio del Grupo</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-icon green"><Award /></div>
          <div className="kpi-content">
            <span className="kpi-value">{maxPercentage}%</span>
            <span className="kpi-label">Calificación Máxima</span>
          </div>
        </div>
        <div className="glass-panel kpi-card">
          <div className="kpi-icon orange"><AlertCircle /></div>
          <div className="kpi-content">
            <span className="kpi-value">{minPercentage}%</span>
            <span className="kpi-label">Calificación Mínima</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="dashboard-main-grid">
        {/* Results Table */}
        <div className="glass-panel table-panel">
          <h3>Historial de Estudiantes Calificados</h3>
          {resultsList.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Doc / ID</th>
                    <th>Aciertos</th>
                    <th>Errores</th>
                    <th>En Blanco</th>
                    <th>Nota</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsList.map(item => (
                    <tr key={item.id} className="table-row">
                      <td><strong>{item.studentId}</strong></td>
                      <td className="text-success">{item.correctCount}</td>
                      <td className="text-danger">{item.incorrectCount}</td>
                      <td className="text-muted">{item.blankCount}</td>
                      <td>
                        <span className={`badge ${item.percentage >= 60 ? 'badge-green' : 'badge-orange'}`}>
                          {item.percentage}% ({item.score} pts)
                        </span>
                      </td>
                      <td className="text-secondary">{new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => downloadStudentReportPDF(item, activeExam)}
                          title="Descargar boletín de resultados individual en PDF"
                        >
                          <FileText size={14} /> Boletín PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-empty">
              <p>Aún no hay hojas escaneadas para este examen. Dirígete a la pestaña <strong>Escáner</strong> para comenzar.</p>
            </div>
          )}
        </div>

        {/* Question Item Analysis */}
        <div className="glass-panel item-analysis-panel">
          <h3>Análisis de Errores por Pregunta</h3>
          <p className="text-secondary">Frecuencia de respuestas incorrectas en el grupo.</p>
          <div className="item-bars-list">
            {Array.from({ length: activeExam.questionCount }).map((_, idx) => {
              const q = idx + 1;
              const errorCount = questionErrorStats[q] || 0;
              const errorPercentage = totalStudents > 0 ? Math.round((errorCount / totalStudents) * 100) : 0;

              return (
                <div key={`stat_q_${q}`} className="bar-row">
                  <span className="q-label">P{q.toString().padStart(2, '0')}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${errorPercentage}%`,
                        background: errorPercentage > 50 ? 'var(--accent-danger)' : 'var(--accent-primary)'
                      }}
                    ></div>
                  </div>
                  <span className="error-count">{errorCount} ({errorPercentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .dashboard-toolbar {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .toolbar-actions {
          display: flex;
          gap: 0.75rem;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .kpi-card {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kpi-icon.blue { background: rgba(59, 130, 246, 0.15); color: var(--accent-primary); }
        .kpi-icon.cyan { background: rgba(6, 182, 212, 0.15); color: var(--accent-secondary); }
        .kpi-icon.green { background: rgba(16, 185, 129, 0.15); color: var(--accent-success); }
        .kpi-icon.orange { background: rgba(245, 158, 11, 0.15); color: var(--accent-warning); }

        .kpi-value {
          font-family: var(--font-family-heading);
          font-size: 1.6rem;
          font-weight: 800;
          display: block;
          line-height: 1.1;
        }

        .kpi-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .table-panel {
          padding: 1.5rem;
        }

        .table-panel h3 {
          margin-bottom: 1rem;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .custom-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .custom-table th, .custom-table td {
          padding: 0.75rem 0.9rem;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9rem;
        }

        .custom-table th {
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .table-empty {
          padding: 3rem 1rem;
          text-align: center;
          color: var(--text-muted);
        }

        .item-analysis-panel {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .item-bars-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .bar-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.8rem;
        }

        .q-label {
          font-weight: 700;
          width: 28px;
        }

        .bar-track {
          flex: 1;
          height: 10px;
          background: var(--bg-glass);
          border-radius: var(--radius-full);
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .bar-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }

        .error-count {
          width: 65px;
          text-align: right;
          color: var(--text-secondary);
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
