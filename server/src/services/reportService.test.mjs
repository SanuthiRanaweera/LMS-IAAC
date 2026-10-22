import dotenv from 'dotenv';
import mongoose from 'mongoose';
import assert from 'node:assert';
import { getReportFilters, generateReportData } from './reportService.js';

dotenv.config({ path: 'server/.env' });

console.log('Connecting to database...');
await mongoose.connect(process.env.MONGODB_URI);

try {
  console.log('--- Test 1: getReportFilters ---');
  const filters = await getReportFilters();
  console.log('Branches found:', filters.branches.map((b) => b.name));
  console.log('Diplomas found:', filters.diplomas.map((d) => d.name));
  console.log('Examinations found:', filters.examinations.slice(0, 5));

  assert.ok(Array.isArray(filters.branches));
  assert.ok(Array.isArray(filters.diplomas));
  assert.ok(Array.isArray(filters.examinations));

  console.log('--- Test 2: generateReportData for testing exam ---');
  const reportData = await generateReportData({
    branchId: 'branch-iaac-central',
    intakeId: 'Batch 02',
    batchId: 'batch-mqg6xcxl',
    diploma: 'Air Cargo',
    examName: 'testing',
    reportType: 'COMPLETE_BATCH',
  });

  console.log('Report Header:', reportData.header);
  console.log('Report Summary:', reportData.summary);
  console.log('Report Students count:', reportData.students.length);
  assert.ok(reportData.students.length >= 1);

  const student1 = reportData.students[0];
  console.log('Student 1 result:', {
    id: student1.studentId,
    name: student1.studentName,
    originalMarks: student1.originalMarks,
    originalGrade: student1.originalGrade,
    repeatMarks: student1.repeatMarks,
    repeatGrade: student1.repeatGrade,
    finalResult: student1.finalResult,
  });

  if (student1.marks >= 60) {
    assert.ok(student1.finalResult.startsWith('Passed'));
  } else {
    assert.ok(student1.finalResult.startsWith('Failed'));
  }

  console.log('--- Test 3: Report Filters execution ---');
  const passedReport = await generateReportData({
    branchId: 'branch-iaac-central',
    intakeId: 'Batch 02',
    batchId: 'batch-mqg6xcxl',
    diploma: 'Air Cargo',
    examName: 'testing',
    reportType: 'PASSED_STUDENTS',
  });
  console.log('Passed students count:', passedReport.students.length);

  const failedReport = await generateReportData({
    branchId: 'branch-iaac-central',
    intakeId: 'Batch 02',
    batchId: 'batch-mqg6xcxl',
    diploma: 'Air Cargo',
    examName: 'testing',
    reportType: 'FAILED_STUDENTS',
  });
  console.log('Failed students count:', failedReport.students.length);

  console.log('🎉 ALL REPORT SERVICE TESTS PASSED SUCCESSFULLY!');
} finally {
  await mongoose.disconnect();
}
