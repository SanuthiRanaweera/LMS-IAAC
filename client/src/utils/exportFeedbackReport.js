import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function sanitizeFilename(text) {
  return String(text || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_');
}

/**
 * Generates and downloads the official IAAC Lecturer Performance & Feedback Report PDF.
 */
export async function exportFeedbackReportToPdf({
  lecturerName = '',
  lecturerId = '',
  module = '',
  batch = '',
  branch = '',
  feedbackPeriod = '',
  totalEligible = 0,
  totalResponses = 0,
  responseRate = 0,
  averageRatings = {},
  strengths = [],
  improvements = [],
  concerns = [],
  recommendations = '',
  generatedBy = 'IAAC Academic Administration',
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let startY = 16;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 53, 128); // #003580 Navy Blue
  doc.text('INTERNATIONAL AIRLINE & AVIATION COLLEGE', pageWidth / 2, startY, { align: 'center' });

  startY += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text('LECTURER TEACHING PERFORMANCE & STUDENT FEEDBACK REPORT', pageWidth / 2, startY, { align: 'center' });

  startY += 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Official Academic Quality Assurance • Confidential Assessment Report`, pageWidth / 2, startY, { align: 'center' });

  // Divider Line
  startY += 5;
  doc.setDrawColor(0, 53, 128);
  doc.setLineWidth(0.8);
  doc.line(margin, startY, pageWidth - margin, startY);

  // Metadata Table
  startY += 5;
  const metaData = [
    [
      { content: 'Lecturer Name:', styles: { fontStyle: 'bold', textColor: [30, 41, 59] } },
      { content: lecturerName || '—' },
      { content: 'Unique Lecturer ID:', styles: { fontStyle: 'bold', textColor: [30, 41, 59] } },
      { content: lecturerId || '—', styles: { fontStyle: 'bold', textColor: [0, 53, 128] } },
    ],
    [
      { content: 'Module / Subject:', styles: { fontStyle: 'bold', textColor: [30, 41, 59] } },
      { content: module || '—' },
      { content: 'Assigned Batch:', styles: { fontStyle: 'bold', textColor: [30, 41, 59] } },
      { content: batch || '—' },
    ],
    [
      { content: 'Branch Campus:', styles: { fontStyle: 'bold', textColor: [30, 41, 59] } },
      { content: branch || '—' },
      { content: 'Feedback Period:', styles: { fontStyle: 'bold', textColor: [30, 41, 59] } },
      { content: feedbackPeriod || '—' },
    ],
    [
      { content: 'Eligible Students:', styles: { fontStyle: 'bold', textColor: [30, 41, 59] } },
      { content: String(totalEligible || '—') },
      { content: 'Responses Received:', styles: { fontStyle: 'bold', textColor: [30, 41, 59] } },
      { content: `${totalResponses} (${responseRate}% response rate)` },
    ],
  ];

  autoTable(doc, {
    startY,
    body: metaData,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 35, fillColor: [248, 250, 252] },
      1: { cellWidth: 55 },
      2: { cellWidth: 38, fillColor: [248, 250, 252] },
      3: { cellWidth: 54 },
    },
    margin: { left: margin, right: margin },
  });

  startY = doc.lastAutoTable.finalY + 7;

  // Rating Categories Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 53, 128);
  doc.text('1. Teaching Performance Ratings (5-Point Evaluation Scale)', margin, startY);

  startY += 3;
  const ratingRows = [
    ['1. Teaching Clarity', 'Clarity of lesson explanations and concept delivery', `${averageRatings.teachingClarity || 0} / 5.0`],
    ['2. Subject Knowledge', 'Command of curriculum and aviation subject expertise', `${averageRatings.subjectKnowledge || 0} / 5.0`],
    ['3. Communication', 'Effectiveness, accessibility, and student interactions', `${averageRatings.communication || 0} / 5.0`],
    ['4. Student Engagement', 'Interactive participation, questioning, and discussions', `${averageRatings.studentEngagement || 0} / 5.0`],
    ['5. Overall Experience', 'Comprehensive student satisfaction with teaching sessions', `${averageRatings.overallExperience || 0} / 5.0`],
    [{ content: 'Overall Aggregate Score', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [238, 242, 255] } },
     { content: `${averageRatings.overall || 0} / 5.0`, styles: { fontStyle: 'bold', textColor: [0, 53, 128], fillColor: [238, 242, 255] } }],
  ];

  autoTable(doc, {
    startY,
    head: [['Evaluation Category', 'Description', 'Score']],
    body: ratingRows,
    theme: 'striped',
    headStyles: { fillColor: [0, 53, 128], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.2, font: 'helvetica' },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 102 },
      2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  startY = doc.lastAutoTable.finalY + 7;

  // Qualitative Strengths & Improvements
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 53, 128);
  doc.text('2. Qualitative Teaching Feedback & Strengths', margin, startY);

  startY += 4;
  const strengthsText = strengths.length > 0
    ? strengths.map((s, idx) => `• ${s}`).join('\n')
    : '• Positive feedback received regarding curriculum coverage and lesson structure.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const strengthsLines = doc.splitTextToSize(strengthsText, pageWidth - (margin * 2));
  doc.text(strengthsLines, margin, startY);
  startY += strengthsLines.length * 4.2 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 53, 128);
  doc.text('3. Areas for Pedagogical Enhancement', margin, startY);

  startY += 4;
  const improvementsText = improvements.length > 0
    ? improvements.map((s) => `• ${s}`).join('\n')
    : '• No major areas of concern noted by students during this evaluation period.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const impLines = doc.splitTextToSize(improvementsText, pageWidth - (margin * 2));
  doc.text(impLines, margin, startY);
  startY += impLines.length * 4.2 + 4;

  if (concerns.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(185, 28, 28); // Red
    doc.text('4. Student Learning Inquiries & Concerns', margin, startY);

    startY += 4;
    const concernsText = concerns.map((s) => `• ${s}`).join('\n');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const conLines = doc.splitTextToSize(concernsText, pageWidth - (margin * 2));
    doc.text(conLines, margin, startY);
    startY += conLines.length * 4.2 + 4;
  }

  // Academic Recommendations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 53, 128);
  doc.text('5. Academic Administration Recommendations', margin, startY);

  startY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const recText = recommendations || 'Maintain commendable teaching delivery and continue facilitating engaging classroom sessions.';
  const recLines = doc.splitTextToSize(recText, pageWidth - (margin * 2));
  doc.text(recLines, margin, startY);
  startY += recLines.length * 4.2 + 10;

  // Footer Signatures
  if (startY > 250) {
    doc.addPage();
    startY = 25;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} by ${generatedBy}`, margin, startY);

  const filename = `IAAC_Feedback_Report_${sanitizeFilename(lecturerId || lecturerName)}_${sanitizeFilename(batch)}.pdf`;
  doc.save(filename);
}
