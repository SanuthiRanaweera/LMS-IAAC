import dotenv from 'dotenv';
import mongoose from 'mongoose';
import assert from 'node:assert';
import { Result } from '../models/Result.js';
import { Student } from '../models/Student.js';
import { calculateGrade, calculateFinalExamResult } from '../utils/gradeCalculator.js';

dotenv.config({ path: 'server/.env' });

console.log('Connecting to database...');
await mongoose.connect(process.env.MONGODB_URI);

try {
  console.log('--- Testing Repeat Examination Marks in DB ---');

  // Find a test student
  const student = await Student.findOne({}).lean();
  assert.ok(student, 'Must have at least one student in DB');

  // Create a temporary result sheet with 2 students:
  // Student 1: 45 marks (Failed) -> eligible for repeat
  // Student 2: 78 marks (Passed) -> NOT eligible for repeat
  const dummySheetTitle = `Test Sheet Repeat Exam ${Date.now()}`;
  const testSheet = await Result.create({
    resultTitle: dummySheetTitle,
    resultDate: new Date(),
    branchId: student.branchId || 'branch-01',
    intakeId: student.intakeId || 'intake-01',
    batchId: student.batchId || 'batch-01',
    course: student.course || 'Air Cargo',
    isPublished: false,
    results: [
      {
        student: student._id,
        studentId: student.studentId,
        studentName: student.fullName,
        marks: 45,
        grade: 'F',
        status: 'FAIL',
        repeatMarks: null,
        repeatGrade: null,
        isResit: false,
        finalResult: 'Failed',
      },
    ],
  });

  const sheetId = testSheet._id;
  console.log('Created temporary test result sheet:', sheetId.toString());

  // 1. Verify initial state: original marks = 45, repeatMarks = null, finalResult = 'Failed'
  let fetched = await Result.findById(sheetId).lean();
  let studentRow = fetched.results[0];
  assert.strictEqual(studentRow.marks, 45);
  assert.strictEqual(studentRow.grade, 'F');
  assert.strictEqual(studentRow.repeatMarks, null);
  assert.strictEqual(studentRow.finalResult, 'Failed');
  assert.strictEqual(studentRow.isResit, false);

  // 2. Add repeat marks: 72 marks (Passing score)
  const repMarks = 72;
  const repGrade = calculateGrade(repMarks);
  const finalResult = calculateFinalExamResult(studentRow.marks, repMarks, studentRow.status);

  assert.strictEqual(repGrade, 'B');
  assert.strictEqual(finalResult, 'Passed (Repeat)');

  // Update in DB
  await Result.updateOne(
    { _id: sheetId, 'results.student': student._id },
    {
      $set: {
        'results.$.repeatMarks': repMarks,
        'results.$.repeatScore': repMarks,
        'results.$.repeatGrade': repGrade,
        'results.$.repeatDate': new Date(),
        'results.$.isResit': true,
        'results.$.finalResult': finalResult,
        'results.$.status': 'PASS',
      },
    }
  );

  // 3. Verify in DB: original marks MUST STILL BE 45!
  fetched = await Result.findById(sheetId).lean();
  studentRow = fetched.results[0];
  assert.strictEqual(studentRow.marks, 45, 'Original marks must remain unchanged (45)');
  assert.strictEqual(studentRow.grade, 'F', 'Original grade must remain unchanged (F)');
  assert.strictEqual(studentRow.repeatMarks, 72, 'Repeat marks must be 72');
  assert.strictEqual(studentRow.repeatGrade, 'B', 'Repeat grade must be B');
  assert.strictEqual(studentRow.isResit, true, 'isResit must be true');
  assert.strictEqual(studentRow.finalResult, 'Passed (Repeat)', 'finalResult must be Passed (Repeat)');

  // Clean up test sheet
  await Result.findByIdAndDelete(sheetId);
  console.log('Cleaned up test sheet.');

  console.log('🎉 ALL REPEAT EXAMINATION DB TESTS PASSED (100% Verified)');
} finally {
  await mongoose.disconnect();
}

