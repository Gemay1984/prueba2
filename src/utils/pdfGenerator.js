import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates a clean A4 PDF file directly from OMR sheet DOM containers
 * @param {Array<HTMLElement> | HTMLElement} elements Single element or array of sheet container elements
 * @param {string} filename Output PDF filename without extension
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

      // Render high resolution canvas from HTML element
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
