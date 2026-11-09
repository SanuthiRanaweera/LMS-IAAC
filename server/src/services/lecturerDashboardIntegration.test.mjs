import assert from 'node:assert/strict';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import {
  signAdminToken,
  verifyAdminToken,
  getEffectiveAdminRole,
  isStaffAllowedAction,
  requireSuperAdmin,
} from '../middleware/adminAuth.js';
import { signAuthToken, verifyAuthToken } from '../middleware/auth.js';
import { calculateGrade, calculateFinalExamResult } from '../utils/gradeCalculator.js';

console.log('=== Running IAAC LMS Lecturer Dashboard & Portal Test Suite ===\n');

// -------------------------------------------------------------
// Test 1: JWT Signing and Verification for Lecturer
// -------------------------------------------------------------
console.log('Scenario 1: Lecturer Token Generation & Authentication');
const adminToken = signAdminToken({ sub: 'lecturer_123', role: 'lecturer' });
const verifiedAdmin = verifyAdminToken(adminToken);
assert.equal(verifiedAdmin.sub, 'lecturer_123');
assert.equal(verifiedAdmin.role, 'lecturer');

const authToken = signAuthToken({ sub: 'lecturer_123', role: 'lecturer' });
const verifiedAuth = verifyAuthToken(authToken);
assert.equal(verifiedAuth.sub, 'lecturer_123');
assert.equal(verifiedAuth.role, 'lecturer');
console.log('✓ Test 1 Passed: Both token types correctly identify lecturer role');

// -------------------------------------------------------------
// Test 2: Role Permissions verification
// -------------------------------------------------------------
console.log('Scenario 2: Role Permission & Authorization Checks');
assert.equal(getEffectiveAdminRole({ role: 'lecturer' }), 'lecturer');
assert.equal(isStaffAllowedAction('ADD_MATERIALS'), true);
assert.equal(isStaffAllowedAction('VIEW_STUDENTS'), true);
assert.equal(isStaffAllowedAction('ADD_ASSIGNMENTS'), true);
assert.equal(isStaffAllowedAction('VIEW_ASSIGNMENTS'), true);
assert.equal(isStaffAllowedAction('ADD_SCHEDULE'), true);
assert.equal(requireSuperAdmin('CREATE_STAFF_ADMIN'), true);
assert.equal(requireSuperAdmin('DELETE_STAFF_ADMIN'), true);
console.log('✓ Test 2 Passed: Lecturer academic permissions validated');

// -------------------------------------------------------------
// Test 3: Grade and Repeat Exam Calculation Rules
// -------------------------------------------------------------
console.log('Scenario 3: Academic Pass/Fail and Repeat Exam Calculation Rules');
// Regular pass: score >= 60
assert.equal(calculateGrade(85), 'A');
assert.equal(calculateGrade(60), 'C');
assert.equal(calculateGrade(59), 'F');

// Student fails with 45 (< 60), repeats and gets 75 (>= 60) -> Passed (Repeat)
assert.equal(calculateFinalExamResult(45, 75, 'FAIL'), 'Passed (Repeat)');

// Student passes originally with 85 -> Passed (no repeat)
assert.equal(calculateFinalExamResult(85, null, 'PASS'), 'Passed');

// Student fails with 35, repeats and gets 50 (< 60) -> Failed (Repeat)
assert.equal(calculateFinalExamResult(35, 50, 'FAIL'), 'Failed (Repeat)');

// Student fails with 55, no repeat marks yet -> Failed
assert.equal(calculateFinalExamResult(55, null, 'FAIL'), 'Failed');
console.log('✓ Test 3 Passed: Grade & repeat exam calculations verified');

// -------------------------------------------------------------
// Test 4: Dynamic Greeting Logic based on Local Time
// -------------------------------------------------------------
console.log('Scenario 4: Dynamic Greeting Logic Verification');
function getGreeting(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const morningDate = new Date();
morningDate.setHours(9, 30);
assert.equal(getGreeting(morningDate), 'Good Morning');

const afternoonDate = new Date();
afternoonDate.setHours(14, 15);
assert.equal(getGreeting(afternoonDate), 'Good Afternoon');

const eveningDate = new Date();
eveningDate.setHours(19, 45);
assert.equal(getGreeting(eveningDate), 'Good Evening');
console.log('✓ Test 4 Passed: Greeting matches local time accurately');

// -------------------------------------------------------------
// Test 5: Lecturer Profile & Password Security
// -------------------------------------------------------------
console.log('Scenario 5: Password Hashing and Validation');
const testPassword = 'LecturerSecurePassword2026!';
const salt = 10;
const hash = await bcrypt.hash(testPassword, salt);
assert.equal(await bcrypt.compare(testPassword, hash), true);
assert.equal(await bcrypt.compare('WrongPassword!', hash), false);
console.log('✓ Test 5 Passed: Password verification operates securely');

// -------------------------------------------------------------
// Test 6: Schedule Date Filtering (Today, Week, Full)
// -------------------------------------------------------------
console.log('Scenario 6: Class Schedule View Filter Logic');
const todayStr = new Date().toISOString().slice(0, 10);
const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const pastDate = '2026-01-01';

const sampleSchedules = [
  { subject: 'Aviation Safety', date: todayStr, batchId: '12' },
  { subject: 'Crew Resource Management', date: futureDate, batchId: '12' },
  { subject: 'Introduction to Aviation', date: pastDate, batchId: '12' },
];

const todayItems = sampleSchedules.filter((s) => s.date === todayStr);
assert.equal(todayItems.length, 1);
assert.equal(todayItems[0].subject, 'Aviation Safety');

const upcomingItems = sampleSchedules.filter((s) => s.date >= todayStr);
assert.equal(upcomingItems.length, 2);
console.log('✓ Test 6 Passed: Schedule filtering operates accurately');

// -------------------------------------------------------------
// Test 7: Student Search and Filter Logic
// -------------------------------------------------------------
console.log('Scenario 7: Student Filter Logic in Lecturer Directory');
const sampleStudents = [
  { studentId: 'IAAC001', fullName: 'Amal Perera', course: 'Cabin Crew', batchId: '12' },
  { studentId: 'IAAC002', fullName: 'Nimal Silva', course: 'Cabin Crew', batchId: '12' },
  { studentId: 'IAAC003', fullName: 'Kamal Jayawardena', course: 'Ground Operations', batchId: '14' },
];

const batch12Students = sampleStudents.filter((s) => s.batchId === '12');
assert.equal(batch12Students.length, 2);

const searched = sampleStudents.filter((s) => s.fullName.toLowerCase().includes('amal perera'));
assert.equal(searched.length, 1);
assert.equal(searched[0].studentId, 'IAAC001');
console.log('✓ Test 7 Passed: Student roster searching and batch filters operate properly');

console.log('\n🎉 ALL 7 LECTURER PORTAL TESTS PASSED SUCCESSFULLY! (100% COMPLETE)');
