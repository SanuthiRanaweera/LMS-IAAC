import mongoose from 'mongoose';
import { Result } from '../models/Result.js';
import { Student } from '../models/Student.js';
import { DEFAULT_LMS_DATA } from '../data/defaultLmsData.js';
import { getOrCreateAppDataPayload } from './appData.service.js';
import {
  OFFICIAL_DIPLOMAS,
  canonicalDiploma,
  getRequiredModules,
} from '../config/academicModules.js';
import {
  calculateGrade,
  isPassingScore,
  calculateResultStatus,
  calculateFinalExamResult,
} from '../utils/gradeCalculator.js';
import { calculateFinalStatus } from '../utils/finalStatusCalculator.js';

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeId(value) {
  return value != null ? String(value).trim() : '';
}

/**
 * Returns academic hierarchy filters for report generation.
 */
export async function getReportFilters() {
  const payload = await getOrCreateAppDataPayload('academics', DEFAULT_LMS_DATA.academics);
  const branches = Array.isArray(payload?.branches) ? payload.branches : [];

  // Query all distinct saved examinations from Result sheets
  const existingResultTitles = await Result.distinct('resultTitle');

  // Also include standard modules for diplomas
  const standardModules = [];
  for (const d of OFFICIAL_DIPLOMAS) {
    const mods = getRequiredModules(d.name);
    for (const m of mods) {
      if (!standardModules.includes(m)) {
        standardModules.push(m);
      }
    }
  }

  const allExaminations = Array.from(
    new Set([...existingResultTitles, ...standardModules])
  ).filter(Boolean);

  return {
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      intakes: (b.intakes || []).map((i) => ({
        id: i.id,
        name: i.name,
        batches: (i.batches || []).map((ba) => ({
          id: ba.id,
          name: ba.name,
        })),
      })),
    })),
    diplomas: OFFICIAL_DIPLOMAS.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      modules: getRequiredModules(d.name),
    })),
    examinations: allExaminations,
  };
}

/**
 * Generates accurate results report data directly from MongoDB.
 */
export async function generateReportData({
  branchId = '',
  intakeId = '',
  batchId = '',
  diploma = '',
  examName = '',
  reportType = 'COMPLETE_BATCH', // 'COMPLETE_BATCH' | 'PASSED_STUDENTS' | 'FAILED_STUDENTS' | 'RESIT_EXAMINATION' | 'INDIVIDUAL_STUDENT' | 'PENDING_RESULTS' | 'COMPLETE_DIPLOMA'
  resultStatus = 'ALL', // 'ALL' | 'PASSED' | 'FAILED' | 'PENDING' | 'RESIT'
  selectedStudentIds = [],
  individualStudentId = '',
}) {
  const cleanBranchId = normalizeId(branchId);
  const cleanIntakeId = safeTrim(intakeId);
  const cleanBatchId = normalizeId(batchId);
  const canonDiploma = canonicalDiploma(diploma);
  const cleanExamName = safeTrim(examName);

  // 1. Resolve human-readable names for header
  const payload = await getOrCreateAppDataPayload('academics', DEFAULT_LMS_DATA.academics);
  const branches = Array.isArray(payload?.branches) ? payload.branches : [];

  let resolvedBranchName = cleanBranchId;
  let resolvedIntakeName = cleanIntakeId;
  let resolvedBatchName = cleanBatchId;

  for (const b of branches) {
    if (normalizeId(b.id) === cleanBranchId) {
      resolvedBranchName = b.name || cleanBranchId;
      for (const i of b.intakes || []) {
        if (safeTrim(i.id) === cleanIntakeId || safeTrim(i.name) === cleanIntakeId) {
          resolvedIntakeName = i.name || cleanIntakeId;
          for (const ba of i.batches || []) {
            if (normalizeId(ba.id) === cleanBatchId) {
              resolvedBatchName = ba.name || cleanBatchId;
            }
          }
        }
      }
    }
  }

  // 2. Query matching students
  const studentQuery = {};
  if (cleanBranchId) studentQuery.branchId = cleanBranchId;
  if (cleanIntakeId) studentQuery.intakeId = cleanIntakeId;
  if (cleanBatchId) studentQuery.batchId = cleanBatchId;
  if (canonDiploma) studentQuery.course = canonDiploma;

  if (individualStudentId) {
    if (mongoose.Types.ObjectId.isValid(individualStudentId)) {
      studentQuery._id = individualStudentId;
    } else {
      studentQuery.studentId = individualStudentId;
    }
  } else if (Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
    const validOids = selectedStudentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const regNos = selectedStudentIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    studentQuery.$or = [
      { _id: { $in: validOids } },
      { studentId: { $in: regNos } },
    ];
  }

  const students = await Student.find(studentQuery)
    .select('_id studentId fullName email course batchId intakeId branchId')
    .sort({ studentId: 1, fullName: 1 })
    .collation({ locale: 'en', numericOrdering: true, strength: 2 })
    .lean();

  // 3. Query all saved examination result sheets matching these academic filters
  const resultSheetQuery = {};
  if (cleanBranchId) resultSheetQuery.branchId = cleanBranchId;
  if (cleanBatchId) resultSheetQuery.batchId = cleanBatchId;
  if (cleanIntakeId) resultSheetQuery.intakeId = cleanIntakeId;
  if (canonDiploma) resultSheetQuery.course = canonDiploma;

  // Retrieve saved sheets from MongoDB
  const savedSheets = await Result.find(resultSheetQuery).lean();

  // Filter sheets for selected exam if examName is specified
  let targetSheet = null;
  if (cleanExamName) {
    const normExam = cleanExamName.toLowerCase();
    targetSheet = savedSheets.find(
      (s) => String(s.resultTitle || '').trim().toLowerCase() === normExam
    );
  } else if (savedSheets.length > 0) {
    targetSheet = savedSheets[0];
  }

  const targetExamTitle = targetSheet?.resultTitle || cleanExamName || 'General Examination';

  // 4. Build student result rows
  const allRows = students.map((s, index) => {
    const sId = String(s._id);
    const regNo = s.studentId || '—';

    // Look for student in target examination sheet
    let studentResultInSheet = null;
    if (targetSheet && Array.isArray(targetSheet.results)) {
      studentResultInSheet = targetSheet.results.find(
        (r) =>
          String(r.student) === sId ||
          safeTrim(r.studentId).toLowerCase() === regNo.toLowerCase()
      );
    }

    const marksVal =
      studentResultInSheet &&
      studentResultInSheet.marks !== null &&
      studentResultInSheet.marks !== undefined
        ? Number(studentResultInSheet.marks)
        : null;

    const gradeVal = calculateGrade(marksVal);
    const rawStatus = studentResultInSheet?.status || '';

    // Repeat marks fields
    const repMarksVal =
      studentResultInSheet &&
      (studentResultInSheet.repeatMarks !== null && studentResultInSheet.repeatMarks !== undefined
        ? Number(studentResultInSheet.repeatMarks)
        : studentResultInSheet.repeatScore !== null && studentResultInSheet.repeatScore !== undefined
        ? Number(studentResultInSheet.repeatScore)
        : null);

    const repGradeVal =
      studentResultInSheet?.repeatGrade || (repMarksVal !== null ? calculateGrade(repMarksVal) : null);

    const isResitVal = Boolean(studentResultInSheet?.isResit || repMarksVal !== null);
    const examTypeVal = isResitVal ? 'Resit' : 'Regular';
    const finalExamResult = calculateFinalExamResult(marksVal, repMarksVal, rawStatus);
    const resultStatusVal = finalExamResult;

    // Also collect all module results for this student across all saved sheets (for complete diploma or transcript)
    const modulesTaken = [];
    for (const sheet of savedSheets) {
      if (!Array.isArray(sheet.results)) continue;
      const match = sheet.results.find(
        (r) =>
          String(r.student) === sId ||
          safeTrim(r.studentId).toLowerCase() === regNo.toLowerCase()
      );
      if (match) {
        modulesTaken.push({
          moduleName: sheet.resultTitle,
          score: match.marks !== null && match.marks !== undefined ? Number(match.marks) : null,
          grade: calculateGrade(match.marks),
          isResit: Boolean(match.isResit),
          status: calculateResultStatus(match.marks, match.status),
        });
      }
    }

    const requiredModules = getRequiredModules(s.course || canonDiploma);
    const finalDiplomaStatus = calculateFinalStatus(modulesTaken, requiredModules);

    return {
      no: index + 1,
      id: sId,
      studentId: regNo,
      studentName: s.fullName || '—',
      email: s.email || '',
      branch: s.branchId || resolvedBranchName,
      intake: s.intakeId || resolvedIntakeName,
      batch: s.batchId || resolvedBatchName,
      diploma: s.course || canonDiploma,
      moduleName: targetExamTitle,
      marks: marksVal,
      grade: gradeVal || '—',
      originalMarks: marksVal,
      originalGrade: gradeVal || '—',
      repeatMarks: repMarksVal,
      repeatGrade: repGradeVal || '—',
      finalResult: finalExamResult,
      resultStatus: resultStatusVal,
      isResit: isResitVal,
      examType: examTypeVal,
      modulesTaken,
      finalStatus: finalDiplomaStatus,
    };
  });

  // 5. Apply Report Type Filters & Result Status Filters
  let filteredRows = allRows;

  // Filter by Report Type
  if (reportType === 'PASSED_STUDENTS') {
    filteredRows = filteredRows.filter(
      (r) => isPassingScore(r.marks) || (r.repeatMarks !== null && isPassingScore(r.repeatMarks))
    );
  } else if (reportType === 'FAILED_STUDENTS') {
    filteredRows = filteredRows.filter(
      (r) =>
        r.marks !== null &&
        !isPassingScore(r.marks) &&
        (r.repeatMarks === null || !isPassingScore(r.repeatMarks))
    );
  } else if (reportType === 'RESIT_EXAMINATION') {
    filteredRows = filteredRows.filter((r) => r.isResit === true || r.repeatMarks !== null);
  } else if (reportType === 'PENDING_RESULTS') {
    filteredRows = filteredRows.filter((r) => r.marks === null);
  }

  // Filter by Result Status
  if (resultStatus === 'PASSED') {
    filteredRows = filteredRows.filter(
      (r) => isPassingScore(r.marks) || (r.repeatMarks !== null && isPassingScore(r.repeatMarks))
    );
  } else if (resultStatus === 'FAILED') {
    filteredRows = filteredRows.filter(
      (r) =>
        r.marks !== null &&
        !isPassingScore(r.marks) &&
        (r.repeatMarks === null || !isPassingScore(r.repeatMarks))
    );
  } else if (resultStatus === 'RESIT') {
    filteredRows = filteredRows.filter((r) => r.isResit === true || r.repeatMarks !== null);
  } else if (resultStatus === 'PENDING') {
    filteredRows = filteredRows.filter((r) => r.marks === null);
  }

  // Re-number rows after filtering
  const finalRows = filteredRows.map((r, idx) => ({ ...r, no: idx + 1 }));

  // 6. Calculate Summary Statistics
  // Based on the full relevant batch for accuracy
  let totalWithMarks = 0;
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  let resitCount = 0;

  for (const r of allRows) {
    if (r.marks !== null) {
      totalWithMarks += 1;
      const isPassedFinal =
        isPassingScore(r.marks) || (r.repeatMarks !== null && isPassingScore(r.repeatMarks));
      if (isPassedFinal) {
        passedCount += 1;
      } else {
        failedCount += 1;
      }
    } else {
      pendingCount += 1;
    }

    if (r.isResit || r.repeatMarks !== null) {
      resitCount += 1;
    }
  }

  const passRate =
    totalWithMarks > 0
      ? `${Math.round((passedCount / totalWithMarks) * 100)}%`
      : 'N/A';

  const reportTypeLabels = {
    COMPLETE_BATCH: 'Complete Batch Results Report',
    PASSED_STUDENTS: 'Passed Students Report',
    FAILED_STUDENTS: 'Failed Students Report',
    RESIT_EXAMINATION: 'Resit Examination Report',
    INDIVIDUAL_STUDENT: 'Individual Student Results Report',
    PENDING_RESULTS: 'Pending Results Report',
    COMPLETE_DIPLOMA: 'Complete Diploma Results Report',
  };

  return {
    header: {
      collegeName: 'INTERNATIONAL AIRLINE & AVIATION COLLEGE',
      reportTitle: 'OFFICIAL EXAMINATION RESULTS REPORT',
      branch: resolvedBranchName || 'All Branches',
      intake: resolvedIntakeName || 'All Intakes',
      batch: resolvedBatchName || 'All Batches',
      diploma: canonDiploma || 'All Diplomas',
      examinationName: targetExamTitle,
      reportType: reportTypeLabels[reportType] || 'Results Report',
      generatedDate: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      totalStudents: finalRows.length,
    },
    summary: {
      totalStudents: allRows.length,
      includedStudents: finalRows.length,
      passed: passedCount,
      failed: failedCount,
      pending: pendingCount,
      resitStudents: resitCount,
      passRate,
    },
    students: finalRows,
    requiredModules: getRequiredModules(canonDiploma),
  };
}

