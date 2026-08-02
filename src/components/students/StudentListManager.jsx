import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, Plus, Trash2, CheckCircle2, UserCheck, Download, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SAMPLE_STUDENTS } from '../../utils/storage';

export function StudentListManager({ activeExam = {}, onExamUpdate }) {
  const [students, setStudents] = useState(Array.isArray(activeExam?.studentsList) ? activeExam.studentsList : []);
  const [newStudent, setNewStudent] = useState({ id: '', name: '', grade: '' });
  const [notification, setNotification] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setStudents(Array.isArray(activeExam?.studentsList) ? activeExam.studentsList : []);
  }, [activeExam?.id, activeExam?.studentsList]);

  const handleLoadSampleStudents = () => {
    updateExamStudents(SAMPLE_STUDENTS);
    setNotification('¡Se cargaron 5 estudiantes de prueba para ensayar!');
    setTimeout(() => setNotification(''), 4000);
  };

  const updateExamStudents = (updatedList) => {
    setStudents(updatedList);
    if (onExamUpdate) {
      onExamUpdate({
        ...activeExam,
        studentsList: updatedList
      });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!data || data.length < 2) {
          alert('El archivo no contiene filas de datos suficientes.');
          return;
        }

        const headers = (data[0] || []).map(h => String(h || '').toLowerCase().trim());
        let idIdx = headers.findIndex(h => h.includes('id') || h.includes('doc') || h.includes('matr') || h.includes('ced') || h.includes('codigo'));
        let nameIdx = headers.findIndex(h => h.includes('nom') || h.includes('estud') || h.includes('alumn'));
        let gradeIdx = headers.findIndex(h => h.includes('grad') || h.includes('cur') || h.includes('grup'));

        if (idIdx === -1) idIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (gradeIdx === -1) gradeIdx = 2;

        const imported = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const rawId = String(row[idIdx] || '').trim().replace(/\D/g, '');
          const rawName = String(row[nameIdx] || '').trim();
          const rawGrade = String(row[gradeIdx] || '').trim();

          if (rawName || rawId) {
            imported.push({
              id: rawId || (100000 + i).toString(),
              name: rawName || `Estudiante ${i}`,
              grade: rawGrade || '11-01'
            });
          }
        }

        if (imported.length > 0) {
          updateExamStudents(imported);
          setNotification(`¡Se cargaron ${imported.length} estudiantes desde el archivo Excel/CSV!`);
          setTimeout(() => setNotification(''), 4000);
        } else {
          alert('No se pudieron extraer datos válidos del Excel.');
        }
      } catch (err) {
        console.error('Error al procesar el archivo Excel:', err);
        alert('Ocurrió un error leyendo el archivo Excel. Intenta con un formato CSV o XLSX estándar.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddManual = (e) => {
    e.preventDefault();
    if (!newStudent.name && !newStudent.id) return;
    const updated = [
      ...students,
      {
        id: newStudent.id || (100000 + students.length + 1).toString(),
        name: newStudent.name || 'Estudiante',
        grade: newStudent.grade || '11-01'
      }
    ];
    updateExamStudents(updated);
    setNewStudent({ id: '', name: '', grade: '' });
  };

  const handleDelete = (index) => {
    const updated = students.filter((_, i) => i !== index);
    updateExamStudents(updated);
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      ['Documento', 'Nombre_Estudiante', 'Grado'],
      ['100123', 'Carlos Andrés Mendoza', '11-01'],
      ['100124', 'María Fernanda Gómez', '11-01'],
      ['100125', 'Juan Esteban Martínez', '11-02']
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, 'Plantilla_Estudiantes_OMR.xlsx');
  };

  return (
    <div className="students-manager-container animate-fade-in">
      <div className="glass-panel manager-toolbar">
        <div>
          <h2><FileSpreadsheet className="inline-icon" /> Cargar Lista de Estudiantes (Excel / CSV)</h2>
          <p className="text-secondary">Sube el listado de tu curso para generar hojas de respuestas personalizadas pre-llenadas.</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary" onClick={handleLoadSampleStudents}>
            <Sparkles size={16} /> Cargar 5 Estudiantes de Prueba
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadTemplate}>
            <Download size={16} /> Descargar Plantilla Excel
          </button>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Cargar Archivo Excel / CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {notification && (
        <div className="notification-banner green animate-fade-in">
          <CheckCircle2 size={18} /> {notification}
        </div>
      )}

      {/* Main Grid: Form + Student Table */}
      <div className="students-main-grid">
        {/* Manual Add Form */}
        <div className="glass-panel add-student-card">
          <h3><UserCheck className="inline-icon" /> Agregar Estudiante Manualmente</h3>
          <form onSubmit={handleAddManual}>
            <div className="form-group">
              <label>Número de Documento / ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="ej. 100123"
                value={newStudent.id}
                onChange={e => setNewStudent({ ...newStudent, id: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Nombre y Apellidos</label>
              <input
                type="text"
                className="form-control"
                placeholder="ej. Ana Lucía Pérez"
                value={newStudent.name}
                onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Grado / Curso</label>
              <input
                type="text"
                className="form-control"
                placeholder="ej. 11-01"
                value={newStudent.grade}
                onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full mt-2">
              <Plus size={16} /> Agregar a la Lista
            </button>
          </form>
        </div>

        {/* Student Table */}
        <div className="glass-panel students-table-card">
          <div className="table-header-flex">
            <h3>Lista del Curso ({students.length} Estudiantes)</h3>
            {students.length > 0 && (
              <span className="badge badge-cyan">
                Listos para generar hojas
              </span>
            )}
          </div>

          {students.length > 0 ? (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Documento / ID</th>
                    <th>Nombre del Estudiante</th>
                    <th>Grado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, idx) => (
                    <tr key={`st_${idx}`}>
                      <td>{idx + 1}</td>
                      <td><strong>{st.id}</strong></td>
                      <td>{st.name}</td>
                      <td><span className="badge badge-blue">{st.grade}</span></td>
                      <td>
                        <button className="btn-icon danger" onClick={() => handleDelete(idx)} title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-students">
              <p>Aún no has cargado estudiantes. Puedes subir un archivo Excel o agregarlos manualmente para personalizar las hojas de respuesta.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .students-manager-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .manager-toolbar {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .notification-banner {
          padding: 0.8rem 1.2rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 500;
        }

        .notification-banner.green {
          background: rgba(16, 185, 129, 0.15);
          color: var(--accent-success);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .students-main-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .students-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .add-student-card, .students-table-card {
          padding: 1.5rem;
        }

        .mt-2 {
          margin-top: 0.8rem;
        }

        .table-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .btn-icon.danger {
          background: transparent;
          border: none;
          color: var(--accent-danger);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-sm);
        }

        .btn-icon.danger:hover {
          background: rgba(239, 68, 68, 0.15);
        }

        .empty-students {
          padding: 3rem 1rem;
          text-align: center;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
