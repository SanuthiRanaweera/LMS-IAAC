import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const IAAC_LOGO_BASE64 = 'YOUR_IAAC_LOGO_BASE64_HERE';

function sanitizeFilename(text) {
  return String(text || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_');
}

/**
 * Generates and downloads the official IAAC Examination Results Report PDF.
 *
 * @param {Object} reportData
 * @param {Object} reportData.header
 * @param {Object} reportData.summary
 * @param {Array} reportData.students
 * @param {string} [reportData.orientation='portrait']
 * @param {string} [customLogo]
 */
export async function exportResultsReportToPdf({
  header = {},
  summary = {},
  students = [],
  orientation = 'portrait',
  customLogo = null,
}) {
  const isLandscape = orientation === 'landscape';
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let startY = 12;

  // 1. Center IAAC College Logo
  let logoData = customLogo || IAAC_LOGO_BASE64;
  if (!logoData || logoData === 'YOUR_IAAC_LOGO_BASE64_HERE') {
    try {
      const img = new Image();
      img.src = '/logo.png';
      await new Promise((resolve) => {
        img.onload = () => {
          logoData = img;
          resolve();
        };
        img.onerror = () => {
          // Fallback to /src/image/logo.png
          const fallbackImg = new Image();
          fallbackImg.src = '/src/image/logo.png';
          fallbackImg.onload = () => {
            logoData = fallbackImg;
            resolve();
          };
          fallbackImg.onerror = () => resolve();
        };
      });
    } catch {
      logoData = null;
    }
  }

  if (logoData && logoData !== 'YOUR_IAAC_LOGO_BASE64_HERE') {
    try {
      const logoWidth = 36;
      const logoHeight = 16;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logoData, 'PNG', logoX, startY, logoWidth, logoHeight, undefined, 'FAST');
      startY += logoHeight + 3;
    } catch {
      // Continue gracefully if image rendering fails
    }
  }

  // 2. Official Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Navy / slate-900
  doc.text('INTERNATIONAL AIRLINE & AVIATION COLLEGE', pageWidth / 2, startY, {
    align: 'center',
  });

  startY += 5;
  doc.setFontSize(10.5);
  doc.setTextColor(30, 58, 138); // sky-900 / dark blue
  doc.text('OFFICIAL EXAMINATION RESULTS REPORT', pageWidth / 2, startY, {
    align: 'center',
  });

  startY += 5;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(margin, startY, pageWidth - margin, startY);

  startY += 5;

  // 3. Two-Column Academic Information Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const col1X = margin + 2;
  const col2X = pageWidth / 2 + 6;

  // Box Background
  const infoBoxHeight = 22;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, startY - 2, pageWidth - margin * 2, infoBoxHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, startY - 2, pageWidth - margin * 2, infoBoxHeight, 2, 2, 'S');

  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Branch:', col1X, startY + 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(String(header.branch || 'All Branches'), col1X + 22, startY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Intake:', col1X, startY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(String(header.intake || 'All Intakes'), col1X + 22, startY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Batch:', col1X, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(String(header.batch || 'All Batches'), col1X + 22, startY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Diploma/Course:', col1X, startY + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(String(header.diploma || 'All Diplomas'), col1X + 26, startY + 17);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Examination:', col2X, startY + 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(String(header.examinationName || 'All Examinations'), col2X + 26, startY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Report Type:', col2X, startY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 58, 138);
  doc.text(String(header.reportType || 'Complete Results'), col2X + 26, startY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Generated Date:', col2X, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(String(header.generatedDate || new Date().toLocaleDateString('en-GB')), col2X + 26, startY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Students:', col2X, startY + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(String(students.length), col2X + 26, startY + 17);

  startY += infoBoxHeight + 4;

  // 4. Examination Results Table
  const tableData = (students || []).map((s, idx) => {
    const origMarksStr =
      s.originalMarks !== null && s.originalMarks !== undefined
        ? String(s.originalMarks)
        : s.marks !== null && s.marks !== undefined
        ? String(s.score ?? s.marks)
        : '—';

    const origGradeStr =
      s.originalGrade && s.originalGrade !== '—'
        ? String(s.originalGrade)
        : s.grade && s.grade !== '—'
        ? String(s.grade)
        : '—';

    const repMarksStr =
      s.repeatMarks !== null && s.repeatMarks !== undefined && s.repeatMarks !== ''
        ? String(s.repeatMarks)
        : s.repeatScore !== null && s.repeatScore !== undefined && s.repeatScore !== ''
        ? String(s.repeatScore)
        : '—';

    const repGradeStr = s.repeatGrade && s.repeatGrade !== '—' ? String(s.repeatGrade) : '—';
    const finalResultStr = s.finalResult || s.resultStatus || 'Pending';
    const isRepeatRow = Boolean(s.isResit || (s.repeatMarks !== null && s.repeatMarks !== undefined));

    return {
      no: String(s.no || idx + 1),
      studentId: String(s.studentId || '—'),
      studentName: String(s.studentName || '—'),
      originalMarks: origMarksStr,
      originalGrade: origGradeStr,
      repeatMarks: repMarksStr,
      repeatGrade: repGradeStr,
      finalResult: finalResultStr,
      isRepeat: isRepeatRow,
      raw: s,
    };
  });

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin, bottom: 22 },
    head: [
      [
        'No.',
        'Student ID',
        'Student Name',
        'Original Marks',
        'Original Grade',
        'Repeat Marks',
        'Repeat Grade',
        'Final Result',
      ],
    ],
    body: tableData.map((r) => [
      r.no,
      r.studentId,
      r.studentName,
      r.originalMarks,
      r.originalGrade,
      r.repeatMarks,
      r.repeatGrade,
      r.finalResult,
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42], // Navy blue #0f172a
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: isLandscape ? 32 : 25, fontStyle: 'bold' },
      2: { cellWidth: isLandscape ? 65 : 46 },
      3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: isLandscape ? 34 : 26, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell(data) {
      if (data.section !== 'body') return;
      const row = tableData[data.row.index];
      if (!row) return;

      // Highlight entire row in light amber if student has repeat examination marks
      if (row.isRepeat) {
        data.cell.styles.fillColor = [254, 243, 199]; // light amber (#fef3c7)
      }

      const numOrig = Number(row.originalMarks);
      const isOrigPass = Number.isFinite(numOrig) && numOrig >= 60;
      const isOrigFail = Number.isFinite(numOrig) && numOrig < 60;

      // Original Marks column (index 3)
      if (data.column.index === 3) {
        if (isOrigPass) {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
        } else if (isOrigFail) {
          data.cell.styles.textColor = [220, 38, 38]; // red-600
        }
      }

      // Original Grade column (index 4)
      if (data.column.index === 4) {
        if (row.originalGrade === 'F') {
          data.cell.styles.textColor = [220, 38, 38];
        } else if (['A', 'B', 'C'].includes(row.originalGrade)) {
          data.cell.styles.textColor = [5, 150, 105];
        }
      }

      // Repeat Marks column (index 5)
      if (data.column.index === 5 && row.repeatMarks !== '—') {
        data.cell.styles.textColor = [217, 119, 6]; // amber-600 font-semibold
        data.cell.styles.fontStyle = 'bold';
      }

      // Repeat Grade column (index 6)
      if (data.column.index === 6 && row.repeatGrade !== '—') {
        if (['A', 'B', 'C'].includes(row.repeatGrade)) {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (row.repeatGrade === 'F') {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }

      // Final Result column (index 7)
      if (data.column.index === 7) {
        if (row.finalResult.startsWith('Passed')) {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
        } else if (row.finalResult.startsWith('Failed')) {
          data.cell.styles.textColor = [220, 38, 38]; // red-600
        } else {
          data.cell.styles.textColor = [100, 116, 139]; // slate-500
        }
      }
    },
  });

  // 5. Examination Performance Summary Section
  let finalY = doc.lastAutoTable.finalY + 6;

  // Check if summary fits on page, else add page
  if (finalY + 28 > pageHeight - 20) {
    doc.addPage();
    finalY = margin + 4;
  }

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 22, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('EXAMINATION RESULTS SUMMARY', margin + 4, finalY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const sumY = finalY + 11;
  const colW = (pageWidth - margin * 2) / 6;

  doc.text(`Total Students: ${summary.totalStudents ?? students.length}`, margin + 4, sumY);
  doc.text(`Included: ${summary.includedStudents ?? students.length}`, margin + 4 + colW, sumY);
  doc.text(`Passed: ${summary.passed ?? 0}`, margin + 4 + colW * 2, sumY);
  doc.text(`Failed: ${summary.failed ?? 0}`, margin + 4 + colW * 3, sumY);
  doc.text(`Pending: ${summary.pending ?? 0}`, margin + 4 + colW * 4, sumY);
  doc.text(`Resit: ${summary.resitStudents ?? 0}`, margin + 4 + colW * 5, sumY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(
    `Pass Rate: ${summary.passRate ?? 'N/A'} (Minimum Passing Score: 60)`,
    margin + 4,
    finalY + 17
  );

  // 6. Header/Footer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.text('Generated by IAAC Learning Management System', margin, pageHeight - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // 7. Dynamic Sanitized Filename
  const cleanBranch = sanitizeFilename(header.branch || 'Branch');
  const cleanIntake = sanitizeFilename(header.intake || 'Intake');
  const cleanBatch = sanitizeFilename(header.batch || 'Batch');
  const cleanExam = sanitizeFilename(header.examinationName || 'Exam');
  const cleanType = sanitizeFilename(header.reportType || 'Results');
  const dateStr = new Date().toISOString().slice(0, 10);

  const fileName = `IAAC_${cleanBranch}_${cleanIntake}_${cleanBatch}_${cleanExam}_${cleanType}_${dateStr}.pdf`;

  doc.save(fileName);
}
