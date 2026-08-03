import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates a clean A4 PDF file directly from OMR sheet DOM containers
 */
export const downloadOmrSheetsAsPDF = async (elements, filename = 'Hojas_Respuesta_OMR') => {
  try {
    const sheetElements = Array.isArray(elements) ? elements : [elements];
    if (sheetElements.length === 0) return false;

    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < sheetElements.length; i++) {
      const el = sheetElements[i];
      if (!el) continue;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generando el archivo PDF:', err);
    alert('Ocurrió un error creando el PDF. Puedes usar la función Imprimir para guardar como PDF.');
    return false;
  }
};

/**
 * Generates an Individual Student Grade Report Card PDF (Boletín de Resultados)
 */
export const downloadStudentReportPDF = (result, exam) => {
  try {
    const doc = new jsPDF('portrait', 'mm', 'a4');

    // Header Banner
    doc.setFillColor(15, 23, 42); // Dark Navy
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text((exam?.institution || 'INSTITUCIÓN EDUCATIVA').toUpperCase(), 14, 14);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('BOLETÍN INDIVIDUAL DE RESULTADOS OMR (SABER / ICFES)', 14, 22);

    // Exam Title & Student Info Card
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Examen: ${exam?.title || 'Evaluación de Opción Múltiple'}`, 14, 42);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Estudiante ID / Doc: ${result.studentId || 'S/N'}`, 14, 50);
    doc.text(`Fecha de Escaneo: ${new Date(result.scannedAt).toLocaleString()}`, 14, 56);
    doc.text(`Área / Asignatura: ${exam?.area || exam?.subject || 'General'}`, 14, 62);

    // Score Summary Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 68, 182, 28, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(result.percentage >= 60 ? 16 : 220, result.percentage >= 60 ? 185 : 38, result.percentage >= 60 ? 129 : 38);
    doc.text(`${result.percentage}%`, 22, 83);

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Puntaje Obtenido: ${result.score} de ${result.totalPossible} pts`, 65, 78);
    doc.text(`Aciertos: ${result.correctCount}  |  Errores: ${result.incorrectCount}  |  En Blanco: ${result.blankCount}`, 65, 86);

    // Breakdown Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('DESGLOSE DETALLADO PREGUNTA POR PREGUNTA', 14, 106);

    let currentY = 114;
    const colX = [14, 40, 80, 120, 160];

    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Pregunta', colX[0] + 2, currentY + 5.5);
    doc.text('Marcada', colX[1] + 2, currentY + 5.5);
    doc.text('Clave Correcta', colX[2] + 2, currentY + 5.5);
    doc.text('Estado', colX[3] + 2, currentY + 5.5);

    currentY += 8;

    (result.details || []).forEach((item, index) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }

      const bg = index % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(14, currentY, 182, 7, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      doc.text(`Pregunta #${item.question}`, colX[0] + 2, currentY + 5);
      doc.text(item.detected || 'BLANK', colX[1] + 2, currentY + 5);
      doc.text(item.correct || '-', colX[2] + 2, currentY + 5);

      if (item.isCorrect) {
        doc.setTextColor(16, 185, 129);
        doc.setFont('helvetica', 'bold');
        doc.text('CORRECTA (Acierto)', colX[3] + 2, currentY + 5);
      } else if (item.detected === 'BLANK') {
        doc.setTextColor(100, 116, 139);
        doc.text('EN BLANCO', colX[3] + 2, currentY + 5);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.setFont('helvetica', 'bold');
        doc.text('INCORRECTA (Error)', colX[3] + 2, currentY + 5);
      }

      currentY += 7;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('Generado automáticamente por el Sistema EVALUA OMR ICFES', 14, 287);

    doc.save(`Boletin_${result.studentId || 'Estudiante'}_${exam?.id || 'OMR'}.pdf`);
    return true;
  } catch (err) {
    console.error('Error al generar el boletín PDF', err);
    alert('No se pudo generar el boletín individual.');
    return false;
  }
};
