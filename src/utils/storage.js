// Storage utility for local data persistence (Exams, Keys, Graded Results)

const STORAGE_KEYS = {
  EXAMS: 'evalua_omr_exams',
  RESULTS: 'evalua_omr_results',
  SETTINGS: 'evalua_omr_settings'
};

// 5 Sample Test Students for trial print
export const SAMPLE_STUDENTS = [
  { id: '100101', name: 'Carlos Andrés Mendoza Paez', grade: '11-01' },
  { id: '100102', name: 'María Fernanda Gómez Silva', grade: '11-01' },
  { id: '100103', name: 'Juan Esteban Martínez Ríos', grade: '11-01' },
  { id: '100104', name: 'Valentina Sofía Torres Castro', grade: '11-02' },
  { id: '100105', name: 'Santiago Alejandro Ospina Ruiz', grade: '11-02' }
];

// Default sample ICFES Exam configuration
export const DEFAULT_EXAM = {
  id: 'icfes-simulacro-01',
  title: 'Simulacro General Pruebas Saber 11 (ICFES)',
  institution: 'Institución Educativa Colombia',
  logo: null,
  subject: 'Prueba Global (Matemáticas, Lectura, Ciencias)',
  area: 'Pruebas Saber 11 - Área de Matemáticas y Lenguaje',
  date: new Date().toISOString().split('T')[0],
  questionCount: 30,
  optionsPerQuestion: 4, // A, B, C, D
  idLength: 6, // 6 digits for student ID
  studentsList: SAMPLE_STUDENTS,
  sections: [
    { name: 'Lectura Crítica', start: 1, end: 10 },
    { name: 'Matemáticas', start: 11, end: 20 },
    { name: 'Ciencias Naturales', start: 21, end: 30 }
  ],
  answerKey: {
    1: 'A', 2: 'C', 3: 'B', 4: 'D', 5: 'A',
    6: 'B', 7: 'C', 8: 'D', 9: 'A', 10: 'B',
    11: 'C', 12: 'A', 13: 'D', 14: 'B', 15: 'C',
    16: 'D', 17: 'A', 18: 'B', 19: 'C', 20: 'D',
    21: 'A', 22: 'B', 23: 'C', 24: 'D', 25: 'A',
    26: 'C', 27: 'B', 28: 'D', 29: 'A', 30: 'C'
  },
  scoringRules: {
    correctPoints: 1,
    incorrectPoints: 0,
    blankPoints: 0
  }
};

export const getExams = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (!data) {
      const initial = [DEFAULT_EXAM];
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_EXAM];
    }
    return parsed.map(e => ({
      ...DEFAULT_EXAM,
      ...e,
      studentsList: Array.isArray(e?.studentsList) && e.studentsList.length > 0 ? e.studentsList : SAMPLE_STUDENTS,
      answerKey: e?.answerKey || DEFAULT_EXAM.answerKey,
      scoringRules: e?.scoringRules || DEFAULT_EXAM.scoringRules
    }));
  } catch (e) {
    console.error('Error reading exams from storage', e);
    return [DEFAULT_EXAM];
  }
};

export const saveExam = (exam) => {
  try {
    const exams = getExams();
    const index = exams.findIndex(e => e.id === exam.id);
    if (index >= 0) {
      exams[index] = exam;
    } else {
      exams.unshift(exam);
    }
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
    return true;
  } catch (e) {
    console.error('Error saving exam', e);
    return false;
  }
};

export const deleteExam = (examId) => {
  try {
    const exams = getExams().filter(e => e.id !== examId);
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
    return true;
  } catch (e) {
    console.error('Error deleting exam', e);
    return false;
  }
};

export const getResults = (examId = null) => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
    const results = data ? JSON.parse(data) : [];
    if (examId) {
      return results.filter(r => r.examId === examId);
    }
    return results;
  } catch (e) {
    console.error('Error reading results', e);
    return [];
  }
};

export const saveResult = (result) => {
  try {
    const results = getResults();
    const newResult = {
      ...result,
      id: 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      scannedAt: new Date().toISOString()
    };
    results.unshift(newResult);
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
    return newResult;
  } catch (e) {
    console.error('Error saving result', e);
    return null;
  }
};

export const clearResults = (examId = null) => {
  try {
    if (examId) {
      const results = getResults().filter(r => r.examId !== examId);
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
    } else {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify([]));
    }
    return true;
  } catch (e) {
    console.error('Error clearing results', e);
    return false;
  }
};
