import dotenv from 'dotenv';
import mongoose from 'mongoose';
import assert from 'node:assert/strict';

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
  assert.ok(filters.branches.length > 0);
  assert.ok(filters.diplomas.length >= 4);

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
  if (reportData.students.length > 0) {
    const student1 = reportData.students[0];
    console.log('Student 1 result:', {
      id: student1.studentId,
      name: student1.studentName,
      marks: student1.marks,
      grade: student1.grade,
      status: student1.resultStatus,
    });
    // Sanuthi Ranaweera has 58 marks -> Grade F, Failed
    if (student1.studentId === 'CGK0201') {
      assert.equal(student1.marks, 58);
      assert.equal(student1.grade, 'F');
      assert.equal(student1.resultStatus, 'Failed');
    }
  }

  console.log('--- Test 3: Report Type FAILED_STUDENTS ---');
  const failedReport = await generateReportData({
    branchId: 'branch-iaac-central',
    intakeId: 'Batch 02',
    batchId: 'batch-mqg6xcxl',
    diploma: 'Air Cargo',
    examName: 'testing',
    reportType: 'FAILED_STUDENTS',
  });
  console.log('Failed students count:', failedReport.students.length);
  assert.ok(failedReport.students.length >= 1);
  assert.equal(failedReport.students[0].studentId, 'CGK0201');

  console.log('--- Test 4: Report Type PASSED_STUDENTS ---');
  const passedReport = await generateReportData({
    branchId: 'branch-iaac-central',
    intakeId: 'Batch 02',
    batchId: 'batch-mqg6xcxl',
    diploma: 'Air Cargo',
    examName: 'testing',
    reportType: 'PASSED_STUDENTS',
  });
  console.log('Passed students count:', passedReport.students.length);
  // CGK0201 should NOT be in passed report
  assert.ok(!passedReport.students.some((s) => s.studentId === 'CGK0201'));

  console.log('🎉 ALL REPORT SERVICE TESTS PASSED SUCCESSFULLY!');
} finally {
  await mongoose.disconnect();
}

